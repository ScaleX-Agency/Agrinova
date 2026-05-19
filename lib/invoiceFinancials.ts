import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export type InvoiceFinancialSnapshot = {
  paidAmount: number;
  creditedAmount: number;
  balanceAmount: number;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
};

function resolveInvoiceStatus(balanceAmount: number, paidAmount: number, creditedAmount: number) {
  if (balanceAmount <= 0) return "PAID" as const;
  if (paidAmount > 0 || creditedAmount > 0) return "PARTIAL" as const;
  return "UNPAID" as const;
}

/**
 * Recomputes invoice paid/credit/balance from current active records.
 * Paid uses active receipts that are not marked as returned.
 * Credited uses active credit notes.
 */
export async function recalculateInvoiceFinancials(
  tx: TxClient,
  invoiceId: number,
): Promise<InvoiceFinancialSnapshot> {
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { invoice_id: invoiceId },
    select: {
      total_amount: true,
    },
  });

  const [activeReceipts, activeCreditNotes] = await Promise.all([
    tx.receipt.findMany({
      where: {
        invoice_id: invoiceId,
        is_active: true,
        is_returned: false,
      },
      select: { amount: true },
    }),
    tx.creditNote.findMany({
      where: {
        invoice_id: invoiceId,
        is_active: true,
      },
      select: { amount: true },
    }),
  ]);

  const paidAmount = activeReceipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0);
  const creditedAmount = activeCreditNotes.reduce((sum, creditNote) => sum + Number(creditNote.amount), 0);
  const totalAmount = Number(invoice.total_amount);
  const balanceAmount = Math.max(0, Number((totalAmount - paidAmount - creditedAmount).toFixed(2)));
  const paymentStatus = resolveInvoiceStatus(balanceAmount, paidAmount, creditedAmount);

  await tx.invoice.update({
    where: { invoice_id: invoiceId },
    data: {
      paid_amount: paidAmount,
      credited_amount: creditedAmount,
      balance_amount: balanceAmount,
      payment_status: paymentStatus,
    },
  });

  return {
    paidAmount,
    creditedAmount,
    balanceAmount,
    paymentStatus,
  };
}
