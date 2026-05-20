import type { Prisma } from "@prisma/client";
import {
  getDaysToPay,
  getOrCreateActiveCommissionConfig,
  resolveCommissionRate,
} from "@/lib/commissionConfig";
import {
  computeIncrementalOverpayments,
  computeReversalAllocations,
  type ExistingAllocation,
  type ReceiptSettlementData,
} from "@/lib/commissionCalc";

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
  const cfg = await getOrCreateActiveCommissionConfig(tx);
  const daysToPay = getDaysToPay(invoiceDate, settledDate);
  const rate = resolveCommissionRate(daysToPay, cfg);
  const commissionAmount = Number((settlementAmount * rate).toFixed(2));

  const commission = await tx.commission.create({
    data: {
      rep_id: repId,
      commission_rate: rate,
      commission_amount: commissionAmount,
      days_to_pay: daysToPay,
      status: "PAID",
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
      status: "PAID",
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
      receipt: {
        is_active: true,
        is_returned: false,
      },
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
    totalReversalAmount = Math.max(0, currentTotalCommission);
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
      status: "PAID",
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
export async function recalculateReversalCommissionsLegacy(
  tx: TxClient,
  invoiceId: number,
  repId: number,
): Promise<void> {
  await rebuildInvoiceCreditNoteCommissions(tx, invoiceId, repId);
}

/**
 * Rebuilds active credit-note commissions for an invoice from current active settlements.
 * Receipt commissions are preserved because their stored rates are historical.
 */
export async function rebuildInvoiceCreditNoteCommissions(
  tx: TxClient,
  invoiceId: number,
  repId: number,
): Promise<void> {
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { invoice_id: invoiceId },
    select: {
      total_amount: true,
      paid_amount: true,
    },
  });

  const creditNoteSettlements = await tx.invoiceSettlement.findMany({
    where: {
      invoice_id: invoiceId,
      is_active: true,
      settlement_type: "CREDIT_NOTE",
      credit_note_id: { not: null },
    },
    select: {
      settlement_id: true,
      amount: true,
    },
    orderBy: [{ settled_date: "asc" }, { settlement_id: "asc" }],
  });

  if (creditNoteSettlements.length === 0) return;

  const creditSettlementIds = creditNoteSettlements.map((settlement) => settlement.settlement_id);
  const oldCreditCommissions = await tx.commission.findMany({
    where: {
      is_active: true,
      settlement_id: { in: creditSettlementIds },
    },
    select: { commission_id: true },
  });
  const oldCommissionIds = oldCreditCommissions.map((commission) => commission.commission_id);

  if (oldCommissionIds.length > 0) {
    await tx.commissionReversalAllocation.updateMany({
      where: {
        commission_id: { in: oldCommissionIds },
        is_active: true,
      },
      data: { is_active: false },
    });

    await tx.commission.updateMany({
      where: {
        commission_id: { in: oldCommissionIds },
        is_active: true,
      },
      data: {
        is_active: false,
        status: "CANCELLED",
      },
    });
  }

  await tx.invoiceSettlement.updateMany({
    where: { settlement_id: { in: creditSettlementIds } },
    data: { commission_issued: false },
  });

  const receiptSettlements = await tx.invoiceSettlement.findMany({
    where: {
      invoice_id: invoiceId,
      is_active: true,
      settlement_type: "RECEIPT",
      receipt_id: { not: null },
      receipt: {
        is_active: true,
        is_returned: false,
      },
    },
    orderBy: [{ settled_date: "desc" }, { settlement_id: "desc" }],
    select: {
      settlement_id: true,
      amount: true,
      commissions: {
        where: { is_active: true },
        orderBy: { commission_id: "desc" },
        take: 1,
        select: {
          commission_rate: true,
        },
      },
    },
  });

  const receiptSettlementData: ReceiptSettlementData[] = receiptSettlements.map((settlement) => ({
    settlementId: settlement.settlement_id,
    amount: Number(settlement.amount),
    commissionRate: settlement.commissions[0]
      ? Number(settlement.commissions[0].commission_rate)
      : 0,
  }));

  const replayRows = computeIncrementalOverpayments(
    Number(invoice.total_amount),
    Number(invoice.paid_amount),
    creditNoteSettlements.map((settlement) => ({
      settlementId: settlement.settlement_id,
      amount: Number(settlement.amount),
    })),
  );
  const overpaymentBySettlement = new Map(
    replayRows.map((row) => [row.settlementId, row.incrementalOverpayment]),
  );
  const consumedAllocations: ExistingAllocation[] = [];

  for (const settlement of creditNoteSettlements) {
    const overpayment = overpaymentBySettlement.get(settlement.settlement_id) ?? 0;

    if (overpayment <= 0) {
      await createZeroCommission(tx, settlement.settlement_id, repId);
      continue;
    }

    const currentTotalCommission = await getActiveInvoiceCommissionTotal(tx, invoiceId);
    const reversalResult = computeReversalAllocations(
      overpayment,
      receiptSettlementData,
      consumedAllocations,
      currentTotalCommission,
    );
    const normalizedAllocations = normalizeAllocationReversalAmounts(
      reversalResult.allocations,
      reversalResult.cappedReversalAmount,
    );
    const weightedRate = reversalResult.totalAllocated > 0
      ? reversalResult.cappedReversalAmount / reversalResult.totalAllocated
      : 0;

    const commission = await tx.commission.create({
      data: {
        rep_id: repId,
        commission_rate: Number(weightedRate.toFixed(4)),
        commission_amount: Number((-reversalResult.cappedReversalAmount).toFixed(2)),
        days_to_pay: 0,
        status: "PAID",
        settlement_id: settlement.settlement_id,
      },
      select: { commission_id: true },
    });

    if (normalizedAllocations.length > 0) {
      await tx.commissionReversalAllocation.createMany({
        data: normalizedAllocations.map((allocation) => ({
          commission_id: commission.commission_id,
          source_settlement_id: allocation.sourceSettlementId,
          allocated_amount: allocation.allocatedAmount,
          applied_rate: allocation.appliedRate,
          reversal_amount: Number((-allocation.reversalAmount).toFixed(2)),
        })),
      });

      consumedAllocations.push(
        ...reversalResult.allocations.map((allocation) => ({
          sourceSettlementId: allocation.sourceSettlementId,
          allocatedAmount: allocation.allocatedAmount,
        })),
      );
    }

    await tx.invoiceSettlement.update({
      where: { settlement_id: settlement.settlement_id },
      data: { commission_issued: true },
    });
  }
}

export async function recalculateReversalCommissions(
  tx: TxClient,
  invoiceId: number,
  repId: number,
): Promise<void> {
  await rebuildInvoiceCreditNoteCommissions(tx, invoiceId, repId);
}

async function getActiveInvoiceCommissionTotal(
  tx: TxClient,
  invoiceId: number,
) {
  const rows = await tx.commission.findMany({
    where: {
      is_active: true,
      invoiceSettlement: {
        invoice_id: invoiceId,
        is_active: true,
      },
    },
    select: { commission_amount: true },
  });

  return rows.reduce((sum, row) => sum + Number(row.commission_amount), 0);
}

function normalizeAllocationReversalAmounts(
  allocations: NonNullable<CommissionResult["reversalAllocations"]>,
  cappedTotal: number,
) {
  const rawTotal = allocations.reduce((sum, allocation) => sum + allocation.reversalAmount, 0);
  if (rawTotal <= 0 || Math.abs(rawTotal - cappedTotal) < 0.005) {
    return allocations;
  }

  let assigned = 0;
  return allocations.map((allocation, index) => {
    const isLast = index === allocations.length - 1;
    const reversalAmount = isLast
      ? Number((cappedTotal - assigned).toFixed(2))
      : Number(((allocation.reversalAmount / rawTotal) * cappedTotal).toFixed(2));
    assigned += reversalAmount;

    return {
      ...allocation,
      reversalAmount,
    };
  });
}

