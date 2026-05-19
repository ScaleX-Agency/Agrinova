import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { rebuildInvoiceCreditNoteCommissions } from "@/lib/commissionSettlement";
import { recalculateInvoiceFinancials } from "@/lib/invoiceFinancials";
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
        receipt_number: true,
        is_active: true,
        receipt_date: true,
        amount: true,
        is_returned: true,
        returned_at: true,
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

    const responseBody: ReceiptDetailResponse = {
      data: {
        id: receipt.receipt_id,
        receiptNo: receipt.receipt_number,
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
        isReturned: receipt.is_returned,
        returnedAt: receipt.returned_at ? receipt.returned_at.toISOString() : null,
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
          returnedCheques: {
            where: { is_active: true },
            select: {
              returned_cheque_id: true,
              invoiceSettlements: {
                where: { is_active: true },
                select: { settlement_id: true },
              },
            },
          },
        },
      });

      if (!receipt || !receipt.is_active) {
        throw new Error("Receipt not found or already inactive.");
      }

      for (const settlement of receipt.invoiceSettlements) {
        // Deactivate reversal allocations where this settlement was a source
        await tx.commissionReversalAllocation.updateMany({
          where: {
            source_settlement_id: settlement.settlement_id,
            is_active: true,
          },
          data: { is_active: false },
        });

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

      for (const returnedCheque of receipt.returnedCheques) {
        for (const settlement of returnedCheque.invoiceSettlements) {
          await tx.commissionReversalAllocation.updateMany({
            where: {
              source_settlement_id: settlement.settlement_id,
              is_active: true,
            },
            data: { is_active: false },
          });

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

          await tx.invoiceSettlement.update({
            where: { settlement_id: settlement.settlement_id },
            data: {
              is_active: false,
              commission_issued: false,
            },
          });
        }

        await tx.returnedCheque.update({
          where: { returned_cheque_id: returnedCheque.returned_cheque_id },
          data: {
            is_active: false,
            deleted_by: currentUser.user_id,
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

      // Recalculate invoice amounts from active records
      await recalculateInvoiceFinancials(tx, receipt.invoice_id);

      await rebuildInvoiceCreditNoteCommissions(
        tx,
        receipt.invoice_id,
        receipt.invoice.rep_id,
      );

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
