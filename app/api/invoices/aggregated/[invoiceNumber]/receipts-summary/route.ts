import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceNumber: string }> },
) {
  try {
    const invoiceNumber = (await params).invoiceNumber;

    if (!invoiceNumber || invoiceNumber.trim() === "") {
      return NextResponse.json(
        { error: "Invalid invoice number." },
        { status: 400 },
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { invoice_number: invoiceNumber },
      select: {
        invoice_id: true,
        invoice_number: true,
        invoice_date: true,
        total_amount: true,
        status: true,
        receipts: {
          where: { is_active: true },
          select: {
            receipt_id: true,
            receipt_date: true,
            amount: true,
            payment_method: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 },
      );
    }

    const totalPaid = invoice.receipts.reduce((sum, r) => sum + Number(r.amount), 0);

    const byMethod: Record<string, number> = {
      CASH: 0,
      CHEQUE: 0,
      BANK_TRANSFER: 0,
    };

    for (const receipt of invoice.receipts) {
      byMethod[receipt.payment_method] += Number(receipt.amount);
    }

    const firstReceipt = invoice.receipts[0];
    const lastReceipt = invoice.receipts[invoice.receipts.length - 1];

    return NextResponse.json({
      data: {
        invoice: {
          id: invoice.invoice_id,
          number: invoice.invoice_number,
          date: invoice.invoice_date.toISOString(),
          totalAmount: Number(invoice.total_amount),
          status: invoice.status,
        },
        summary: {
          totalPaid: Number(totalPaid.toFixed(2)),
          totalReceived: Number(totalPaid.toFixed(2)),
          outstanding: Number(
            (Number(invoice.total_amount) - totalPaid).toFixed(2),
          ),
          receiptCount: invoice.receipts.length,
          paymentBreakdown: {
            cash: Number(byMethod.CASH.toFixed(2)),
            cheque: Number(byMethod.CHEQUE.toFixed(2)),
            bankTransfer: Number(byMethod.BANK_TRANSFER.toFixed(2)),
          },
          firstReceiptDate: firstReceipt?.receipt_date.toISOString() ?? null,
          lastReceiptDate: lastReceipt?.receipt_date.toISOString() ?? null,
        },
      },
    });
  } catch (error) {
    console.error("Failed to load receipts summary", error);
    return NextResponse.json(
      { error: "Failed to load receipts summary." },
      { status: 500 },
    );
  }
}