import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminOrOperatorUser } from "@/lib/auth";
import { rebuildInvoiceCreditNoteCommissions } from "@/lib/commissionSettlement";
import { recalculateInvoiceFinancials } from "@/lib/invoiceFinancials";

const parsePositiveInt = (value: string) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
};

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ returnedChequeId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminOrOperatorUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const returnedChequeId = parsePositiveInt((await params).returnedChequeId);
    if (!returnedChequeId) {
      return NextResponse.json({ error: "Invalid returned cheque id." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const returnedCheque = await tx.returnedCheque.findUnique({
        where: { returned_cheque_id: returnedChequeId },
        select: {
          returned_cheque_id: true,
          is_active: true,
          receipt_id: true,
          invoice_id: true,
          amount: true,
          invoice: {
            select: {
              rep_id: true,
              total_amount: true,
            },
          },
          invoiceSettlements: {
            where: { is_active: true },
            select: {
              settlement_id: true,
              commissions: {
                where: { is_active: true },
                select: { commission_id: true },
              },
            },
          },
        },
      });

      if (!returnedCheque || !returnedCheque.is_active) {
        throw new Error("Returned cheque not found.");
      }

      // Prevent restoring a returned cheque if replacement receipts/credits already
      // settle the invoice, which would double-count paid value.
      const [activeReceipts, activeCreditNotes] = await Promise.all([
        tx.receipt.findMany({
          where: {
            invoice_id: returnedCheque.invoice_id,
            is_active: true,
            is_returned: false,
          },
          select: { amount: true },
        }),
        tx.creditNote.findMany({
          where: {
            invoice_id: returnedCheque.invoice_id,
            is_active: true,
          },
          select: { amount: true },
        }),
      ]);

      const activeReceiptTotal = activeReceipts.reduce((sum, row) => sum + Number(row.amount), 0);
      const activeCreditTotal = activeCreditNotes.reduce((sum, row) => sum + Number(row.amount), 0);
      const invoiceTotal = Number(returnedCheque.invoice.total_amount);
      const restoredAmount = Number(returnedCheque.amount);
      const projectedSettled = activeReceiptTotal + activeCreditTotal + restoredAmount;

      if (projectedSettled > invoiceTotal + 0.0001) {
        throw new Error(
          "Cannot revert returned cheque because replacement payments or credits already settle this invoice. Delete or adjust those records first.",
        );
      }

      for (const settlement of returnedCheque.invoiceSettlements) {
        const commissionIds = settlement.commissions.map((commission) => commission.commission_id);
        if (commissionIds.length > 0) {
          await tx.commissionReversalAllocation.updateMany({
            where: {
              commission_id: { in: commissionIds },
              is_active: true,
            },
            data: { is_active: false },
          });
        }

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

      await tx.receipt.update({
        where: { receipt_id: returnedCheque.receipt_id },
        data: {
          is_returned: false,
          returned_at: null,
        },
      });

      await recalculateInvoiceFinancials(tx, returnedCheque.invoice_id);

      await rebuildInvoiceCreditNoteCommissions(tx, returnedCheque.invoice_id, returnedCheque.invoice.rep_id);

      return returnedCheque.returned_cheque_id;
    }, { timeout: 20000, maxWait: 10000 });

    return NextResponse.json({ data: { success: true, returnedChequeId: result } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete returned cheque.";
    const status = message.includes("not found") ? 404 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
