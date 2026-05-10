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
        is_active: true,
        invoice_number: true,
        invoice_date: true,
        total_amount: true,
        status: true,
        customer: {
          select: {
            customer_id: true,
            name: true,
            phone: true,
            address: true,
          },
        },
        rep: {
          select: {
            rep_id: true,
            full_name: true,
          },
        },
        location: {
          select: {
            location_id: true,
            code: true,
            name: true,
          },
        },
        receipts: {
          where: { is_active: true },
          select: {
            receipt_id: true,
            receipt_date: true,
            amount: true,
            payment_method: true,
          },
        },
        creditNotes: {
          where: { is_active: true },
          select: {
            credit_note_id: true,
            amount: true,
            created_at: true,
            sales_return_note: {
              select: {
                return_id: true,
                return_number: true,
                return_date: true,
              },
            },
          },
        },
        invoiceSettlements: {
          where: { is_active: true },
          select: {
            settlement_id: true,
            amount: true,
          },
        },
      },
    });

    if (!invoice || !invoice.is_active) {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 },
      );
    }

    const totalInvoiceAmount = Number(invoice.total_amount);

    const totalPaid = invoice.receipts.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );

    const totalCredits = invoice.creditNotes.reduce(
      (sum, cn) => sum + Number(cn.amount),
      0,
    );

    const byMethod: Record<string, number> = {
      CASH: 0,
      CHEQUE: 0,
      BANK_TRANSFER: 0,
    };

    for (const receipt of invoice.receipts) {
      byMethod[receipt.payment_method] += Number(receipt.amount);
    }

    const netAfterCredits = totalInvoiceAmount - totalCredits;
    const netBalance = netAfterCredits - totalPaid;

    const firstReceipt = invoice.receipts[0];
    const lastReceipt = invoice.receipts[invoice.receipts.length - 1];

    const firstCredit = invoice.creditNotes[0];
    const lastCredit = invoice.creditNotes[invoice.creditNotes.length - 1];

    return NextResponse.json({
      data: {
        invoice: {
          id: invoice.invoice_id,
          number: invoice.invoice_number,
          date: invoice.invoice_date.toISOString(),
          totalAmount: Number(totalInvoiceAmount.toFixed(2)),
          status: invoice.status,
          customer: invoice.customer,
          salesRep: invoice.rep,
          location: invoice.location,
        },
        receipts: {
          summary: {
            totalPaid: Number(totalPaid.toFixed(2)),
            receiptCount: invoice.receipts.length,
            firstReceiptDate: firstReceipt?.receipt_date.toISOString() ?? null,
            lastReceiptDate: lastReceipt?.receipt_date.toISOString() ?? null,
          },
          paymentBreakdown: {
            cash: Number(byMethod.CASH.toFixed(2)),
            cheque: Number(byMethod.CHEQUE.toFixed(2)),
            bankTransfer: Number(byMethod.BANK_TRANSFER.toFixed(2)),
          },
        },
        credits: {
          summary: {
            totalCredits: Number(totalCredits.toFixed(2)),
            creditNoteCount: invoice.creditNotes.length,
            relatedReturnCount: new Set(
              invoice.creditNotes.map((cn) => cn.sales_return_note.return_id),
            ).size,
            firstCreditDate: firstCredit?.created_at.toISOString() ?? null,
            lastCreditDate: lastCredit?.created_at.toISOString() ?? null,
          },
        },
        final: {
          invoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
          totalCredits: Number(totalCredits.toFixed(2)),
          amountAfterCredits: Number(netAfterCredits.toFixed(2)),
          totalPaid: Number(totalPaid.toFixed(2)),
          netBalance: Number(netBalance.toFixed(2)),
          balanceStatus:
            netBalance <= 0
              ? "PAID"
              : netBalance < totalInvoiceAmount * 0.5
                ? "PARTIAL"
                : "UNPAID",
        },
      },
    });
  } catch (error) {
    console.error("Failed to load financial summary", error);
    return NextResponse.json(
      { error: "Failed to load financial summary." },
      { status: 500 },
    );
  }
}
