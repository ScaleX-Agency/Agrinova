import type { Prisma } from "@prisma/client";
import {
  getDaysToPay,
  getOrCreateActiveCommissionConfig,
  resolveCommissionRate,
} from "@/lib/commissionConfig";

type TxClient = Prisma.TransactionClient;

export type CommissionResult = {
  commissionId: number;
  commissionRate: number;
  commissionAmount: number;
  daysToPay: number;
  isReversal: boolean;
  reversalAllocations?: {
    sourceSettlementId: number;
    allocatedAmount: number;
    appliedRate: number;
    reversalAmount: number;
  }[];
};

/**
 * Called inside a Prisma transaction after an InvoiceSettlement is created.
 * Automatically creates a Commission record (and reversal allocations if needed).
 *
 * Rules:
 * - RECEIPT with EB >= 0 → commission at config rate, PENDING, commission_issued = true
 * - CREDIT_NOTE with EB >= 0 → commission of 0 LKR, PENDING, commission_issued = true
 * - CREDIT_NOTE with EB < 0 → latest-payment-first reversal, negative commission, PENDING
 * - Total invoice commission is floored at 0 LKR
 */
export async function createSettlementCommission(
  tx: TxClient,
  invoiceId: number,
  settlementId: number,
  settlementType: "RECEIPT" | "CREDIT_NOTE",
  invoiceDate: Date,
  settledDate: Date,
  repId: number,
  settlementAmount: number,
): Promise<CommissionResult> {
  // Fetch the invoice's current state (AFTER it has been updated with this settlement)
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { invoice_id: invoiceId },
    select: {
      total_amount: true,
      paid_amount: true,
      credited_amount: true,
    },
  });

  const totalAmount = Number(invoice.total_amount);
  const paidAmount = Number(invoice.paid_amount);
  const creditedAmount = Number(invoice.credited_amount);
  const effectiveBalance = totalAmount - paidAmount - creditedAmount;

  if (settlementType === "RECEIPT") {
    // Receipts: EB should always be >= 0 (receipt amount is capped at outstanding balance)
    return await createReceiptCommission(
      tx,
      settlementId,
      invoiceDate,
      settledDate,
      repId,
      settlementAmount,
    );
  }

  // CREDIT_NOTE
  if (effectiveBalance >= 0) {
    // No overpayment — credit didn't exceed what's owed
    return await createZeroCommission(tx, settlementId, repId);
  }

  // EB < 0 → overpayment → need latest-payment-first reversal
  const overpayment = Math.abs(effectiveBalance);
  return await createReversalCommission(
    tx,
    invoiceId,
    settlementId,
    repId,
    overpayment,
  );
}

/**
 * Create a positive commission for a receipt settlement.
 */
async function createReceiptCommission(
  tx: TxClient,
  settlementId: number,
  invoiceDate: Date,
  settledDate: Date,
  repId: number,
  settlementAmount: number,
): Promise<CommissionResult> {
  const cfg = await getOrCreateActiveCommissionConfig();
  const daysToPay = getDaysToPay(invoiceDate, settledDate);
  const rate = resolveCommissionRate(daysToPay, cfg);
  const commissionAmount = Number((settlementAmount * rate).toFixed(2));

  const commission = await tx.commission.create({
    data: {
      rep_id: repId,
      commission_rate: rate,
      commission_amount: commissionAmount,
      days_to_pay: daysToPay,
      status: "PENDING",
      settlement_id: settlementId,
    },
    select: { commission_id: true },
  });

  await tx.invoiceSettlement.update({
    where: { settlement_id: settlementId },
    data: { commission_issued: true },
  });

  return {
    commissionId: commission.commission_id,
    commissionRate: rate,
    commissionAmount,
    daysToPay,
    isReversal: false,
  };
}

/**
 * Create a zero-amount commission for a credit note that doesn't cause EB < 0.
 */
async function createZeroCommission(
  tx: TxClient,
  settlementId: number,
  repId: number,
): Promise<CommissionResult> {
  const commission = await tx.commission.create({
    data: {
      rep_id: repId,
      commission_rate: 0,
      commission_amount: 0,
      days_to_pay: 0,
      status: "PENDING",
      settlement_id: settlementId,
    },
    select: { commission_id: true },
  });

  await tx.invoiceSettlement.update({
    where: { settlement_id: settlementId },
    data: { commission_issued: true },
  });

  return {
    commissionId: commission.commission_id,
    commissionRate: 0,
    commissionAmount: 0,
    daysToPay: 0,
    isReversal: false,
  };
}

/**
 * Latest-Payment-First Reversal.
 *
 * When a credit note causes EB < 0, we reverse commission from the latest
 * receipt payments first, using each payment's actual commission rate.
 *
 * The overpayment amount is allocated against receipt settlements from latest to earliest.
 * Each allocation calculates the reversal at that receipt's commission rate.
 * 
 * We also need to account for prior reversals — some receipt amounts may have already
 * been "consumed" by earlier credit notes.
 */
async function createReversalCommission(
  tx: TxClient,
  invoiceId: number,
  settlementId: number,
  repId: number,
  overpayment: number,
): Promise<CommissionResult> {
  // Get all active RECEIPT settlements for this invoice, ordered latest first
  const receiptSettlements = await tx.invoiceSettlement.findMany({
    where: {
      invoice_id: invoiceId,
      is_active: true,
      settlement_type: "RECEIPT",
      receipt_id: { not: null },
    },
    orderBy: [{ settled_date: "desc" }, { settlement_id: "desc" }],
    select: {
      settlement_id: true,
      amount: true,
      commissions: {
        where: { is_active: true },
        select: {
          commission_id: true,
          commission_rate: true,
        },
        orderBy: { commission_id: "desc" },
        take: 1,
      },
    },
  });

  // Get existing reversal allocations for this invoice to know what's already been consumed
  const existingAllocations = await tx.commissionReversalAllocation.findMany({
    where: {
      is_active: true,
      commission: {
        is_active: true,
        invoiceSettlement: {
          invoice_id: invoiceId,
          is_active: true,
        },
      },
    },
    select: {
      source_settlement_id: true,
      allocated_amount: true,
    },
  });

  // Sum up how much has already been reversed from each receipt settlement
  const alreadyReversedBySettlement = new Map<number, number>();
  for (const alloc of existingAllocations) {
    const current = alreadyReversedBySettlement.get(alloc.source_settlement_id) ?? 0;
    alreadyReversedBySettlement.set(
      alloc.source_settlement_id,
      current + Number(alloc.allocated_amount),
    );
  }

  // Allocate overpayment against receipt settlements (latest first)
  const allocations: {
    sourceSettlementId: number;
    allocatedAmount: number;
    appliedRate: number;
    reversalAmount: number;
  }[] = [];

  let remaining = overpayment;

  for (const receiptSettlement of receiptSettlements) {
    if (remaining <= 0) break;

    const settlementAmount = Number(receiptSettlement.amount);
    const alreadyReversed = alreadyReversedBySettlement.get(receiptSettlement.settlement_id) ?? 0;
    const availableForReversal = Math.max(0, settlementAmount - alreadyReversed);

    if (availableForReversal <= 0) continue;

    const allocation = Math.min(remaining, availableForReversal);
    const rate = receiptSettlement.commissions[0]
      ? Number(receiptSettlement.commissions[0].commission_rate)
      : 0;
    const reversalAmount = Number((allocation * rate).toFixed(2));

    allocations.push({
      sourceSettlementId: receiptSettlement.settlement_id,
      allocatedAmount: allocation,
      appliedRate: rate,
      reversalAmount,
    });

    remaining -= allocation;
  }

  // Calculate total reversal
  let totalReversalAmount = allocations.reduce((sum, a) => sum + a.reversalAmount, 0);
  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);

  // Enforce min 0 LKR total commission for invoice
  // Get current total active commission for this invoice
  const existingCommissions = await tx.commission.findMany({
    where: {
      is_active: true,
      invoiceSettlement: {
        invoice_id: invoiceId,
        is_active: true,
      },
    },
    select: { commission_amount: true },
  });

  const currentTotalCommission = existingCommissions.reduce(
    (sum, c) => sum + Number(c.commission_amount),
    0,
  );

  // Cap reversal so total doesn't go below 0
  if (currentTotalCommission - totalReversalAmount < 0) {
    totalReversalAmount = currentTotalCommission;
  }

  // Weighted average rate for display
  const weightedRate = totalAllocated > 0 ? totalReversalAmount / totalAllocated : 0;

  // Create the commission record (negative amount)
  const commission = await tx.commission.create({
    data: {
      rep_id: repId,
      commission_rate: Number(weightedRate.toFixed(4)),
      commission_amount: Number((-totalReversalAmount).toFixed(2)),
      days_to_pay: 0,
      status: "PENDING",
      settlement_id: settlementId,
    },
    select: { commission_id: true },
  });

  // Create reversal allocation records
  if (allocations.length > 0) {
    await tx.commissionReversalAllocation.createMany({
      data: allocations.map((a) => ({
        commission_id: commission.commission_id,
        source_settlement_id: a.sourceSettlementId,
        allocated_amount: a.allocatedAmount,
        applied_rate: a.appliedRate,
        reversal_amount: Number((-a.reversalAmount).toFixed(2)),
      })),
    });
  }

  await tx.invoiceSettlement.update({
    where: { settlement_id: settlementId },
    data: { commission_issued: true },
  });

  return {
    commissionId: commission.commission_id,
    commissionRate: weightedRate,
    commissionAmount: Number((-totalReversalAmount).toFixed(2)),
    daysToPay: 0,
    isReversal: true,
    reversalAllocations: allocations,
  };
}

/**
 * Recalculates reversal commissions for a given invoice.
 * Called when a receipt is deleted and that receipt was a source for reversal allocations.
 *
 * Steps:
 * 1. Find all active credit-note commission records for this invoice that have reversal allocations
 * 2. For each: deactivate old commission + allocations, re-run reversal algorithm
 */
export async function recalculateReversalCommissions(
  tx: TxClient,
  invoiceId: number,
  repId: number,
): Promise<void> {
  // Find credit-note settlements that have active commissions with reversal allocations
  const creditNoteCommissions = await tx.commission.findMany({
    where: {
      is_active: true,
      invoiceSettlement: {
        invoice_id: invoiceId,
        is_active: true,
        settlement_type: "CREDIT_NOTE",
      },
      reversalAllocations: {
        some: { is_active: true },
      },
    },
    select: {
      commission_id: true,
      settlement_id: true,
      invoiceSettlement: {
        select: {
          settlement_id: true,
          amount: true,
          settled_date: true,
          invoice: {
            select: {
              invoice_date: true,
              total_amount: true,
              paid_amount: true,
              credited_amount: true,
            },
          },
        },
      },
    },
    orderBy: { commission_id: "asc" },
  });

  for (const oldCommission of creditNoteCommissions) {
    // Deactivate old commission and its allocations
    await tx.commissionReversalAllocation.updateMany({
      where: {
        commission_id: oldCommission.commission_id,
        is_active: true,
      },
      data: { is_active: false },
    });

    await tx.commission.update({
      where: { commission_id: oldCommission.commission_id },
      data: {
        is_active: false,
        status: "CANCELLED",
      },
    });

    // Recalculate: check if this credit note still causes EB < 0
    const inv = oldCommission.invoiceSettlement.invoice;
    const totalAmount = Number(inv.total_amount);
    const paidAmount = Number(inv.paid_amount);
    const creditedAmount = Number(inv.credited_amount);
    const effectiveBalance = totalAmount - paidAmount - creditedAmount;

    if (effectiveBalance >= 0) {
      // No longer overpaid — create 0 LKR commission
      await createZeroCommission(
        tx,
        oldCommission.settlement_id,
        repId,
      );
    } else {
      // Still overpaid — re-run reversal
      const overpayment = Math.abs(effectiveBalance);
      await createReversalCommission(
        tx,
        invoiceId,
        oldCommission.settlement_id,
        repId,
        overpayment,
      );
    }
  }
}
