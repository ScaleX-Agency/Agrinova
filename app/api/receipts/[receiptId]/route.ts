import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { recalculateReversalCommissions } from "@/lib/commissionSettlement";
import type { ReceiptDetailResponse } from "@/types/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  try {
    const receiptId = Number((await params).receiptId);

    if (!Number.isInteger(receiptId) || receiptId <= 0) {
      return NextResponse.json({ error: "Invalid receiptId." }, { status: 400 });
    }

    const receipt = await prisma.receipt.findUnique({
      where: { receipt_id: receiptId },
      select: {
        receipt_id: true,
        is_active: true,
        receipt_date: true,
        amount: true,
        payment_method: true,
        cheque_no: true,
        cheque_date: true,
        bank_name: true,
        created_at: true,
        updated_at: true,
        notes: true,
        creator: {
          select: {
            full_name: true,
          },
        },
        invoice: {
          select: {
            invoice_id: true,
            invoice_number: true,
            invoice_date: true,
            customer: {
              select: {
                name: true,
              },
            },
            rep: {
              select: {
                full_name: true,
              },
            },
          },
        },
      },
    });

    if (!receipt || !receipt.is_active) {
      return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    }

    const year = receipt.receipt_date.getFullYear();
    const month = String(receipt.receipt_date.getMonth() + 1).padStart(2, "0");
    const receiptNo = `RCP-${year}${month}-${String(receipt.receipt_id).padStart(3, "0")}`;

    const responseBody: ReceiptDetailResponse = {
      data: {
        id: receipt.receipt_id,
        receiptNo,
        receiptDate: receipt.receipt_date.toISOString(),
        invoiceId: receipt.invoice.invoice_id,
        invoiceNo: receipt.invoice.invoice_number,
        invoiceDate: receipt.invoice.invoice_date.toISOString(),
        customerName: receipt.invoice.customer.name,
        salesRepName: receipt.invoice.rep.full_name,
        amountReceived: Number(receipt.amount),
        paymentMethod: receipt.payment_method,
        collectedBy: receipt.creator.full_name,
        chequeNo: receipt.cheque_no ?? null,
        chequeDate: receipt.cheque_date ? receipt.cheque_date.toISOString() : null,
        bankName: receipt.bank_name ?? null,
        createdAt: receipt.created_at.toISOString(),
        updatedAt: receipt.updated_at.toISOString(),
        notes: receipt.notes ?? null,
      },
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Failed to load receipt details", error);
    return NextResponse.json(
      { error: "Failed to load receipt details." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const receiptId = Number((await params).receiptId);
    if (!Number.isInteger(receiptId) || receiptId <= 0) {
      return NextResponse.json({ error: "Invalid receiptId." }, { status: 400 });
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.findUnique({
        where: { receipt_id: receiptId },
        select: {
          receipt_id: true,
          is_active: true,
          invoice_id: true,
          invoice: {
            select: {
              total_amount: true,
              rep_id: true,
            },
          },
          invoiceSettlements: {
            where: { is_active: true },
            select: {
              settlement_id: true,
              is_active: true,
            },
          },
        },
      });

      if (!receipt || !receipt.is_active) {
        throw new Error("Receipt not found or already inactive.");
      }

      // Track whether any reversal allocations were sourced from this receipt
      let hasReversalAllocations = false;
      const settlementIds = receipt.invoiceSettlements.map((s) => s.settlement_id);

      for (const settlement of receipt.invoiceSettlements) {
        // Deactivate reversal allocations where this settlement was a source
        const updatedAllocations = await tx.commissionReversalAllocation.updateMany({
          where: {
            source_settlement_id: settlement.settlement_id,
            is_active: true,
          },
          data: { is_active: false },
        });
        if (updatedAllocations.count > 0) hasReversalAllocations = true;

        // Cancel commissions linked to this settlement
        await tx.commission.updateMany({
          where: {
            settlement_id: settlement.settlement_id,
            is_active: true,
          },
          data: {
            is_active: false,
            status: "CANCELLED",
          },
        });

        // Deactivate the settlement
        await tx.invoiceSettlement.update({
          where: { settlement_id: settlement.settlement_id },
          data: {
            is_active: false,
            commission_issued: false,
          },
        });
      }

      // Deactivate receipt
      await tx.receipt.update({
        where: { receipt_id: receipt.receipt_id },
        data: {
          is_active: false,
          deleted_by: currentUser.user_id,
        },
      });

      // Recalculate invoice amounts
      const activeReceipts = await tx.receipt.findMany({
        where: {
          invoice_id: receipt.invoice_id,
          is_active: true,
        },
        select: { amount: true },
      });
      const activeCredits = await tx.creditNote.findMany({
        where: {
          invoice_id: receipt.invoice_id,
          is_active: true,
        },
        select: { amount: true },
      });

      const nextPaidAmount = activeReceipts.reduce((sum, r) => sum + Number(r.amount), 0);
      const nextCreditedAmount = activeCredits.reduce((sum, c) => sum + Number(c.amount), 0);
      const totalAmount = Number(receipt.invoice.total_amount);
      const nextBalanceAmount = Math.max(0, Number((totalAmount - nextPaidAmount - nextCreditedAmount).toFixed(2)));
      const nextStatus =
        nextBalanceAmount <= 0 ? "PAID" : nextPaidAmount > 0 || nextCreditedAmount > 0 ? "PARTIAL" : "UNPAID";

      await tx.invoice.update({
        where: { invoice_id: receipt.invoice_id },
        data: {
          paid_amount: nextPaidAmount,
          credited_amount: nextCreditedAmount,
          balance_amount: nextBalanceAmount,
          payment_status: nextStatus,
        },
      });

      // If this receipt was a source for any reversal allocations,
      // recalculate the affected credit note reversal commissions
      if (hasReversalAllocations) {
        await recalculateReversalCommissions(
          tx,
          receipt.invoice_id,
          receipt.invoice.rep_id,
        );
      }

      return receipt;
    }, { timeout: 20000, maxWait: 10000 });

    return NextResponse.json({
      data: {
        success: true,
        receiptId: deleted.receipt_id,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete receipt.";
    const status =
      message.includes("not found") || message.includes("already inactive")
        ? 404
        : 500;
    console.error("Failed to delete receipt", error);
    return NextResponse.json({ error: message }, { status });
  }
}
