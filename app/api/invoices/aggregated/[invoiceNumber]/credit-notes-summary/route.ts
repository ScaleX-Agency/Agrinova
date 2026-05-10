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
                total_amount: true,
              },
            },
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

    const totalCredits = invoice.creditNotes.reduce(
      (sum, cn) => sum + Number(cn.amount),
      0,
    );

    const returnSummary = new Map<
      number,
      {
        returnId: number;
        returnNumber: string;
        returnDate: string;
        creditAmount: number;
      }
    >();

    for (const cn of invoice.creditNotes) {
      const srn = cn.sales_return_note;
      const entry = returnSummary.get(srn.return_id);
      if (entry) {
        entry.creditAmount += Number(cn.amount);
      } else {
        returnSummary.set(srn.return_id, {
          returnId: srn.return_id,
          returnNumber: srn.return_number,
          returnDate: srn.return_date.toISOString(),
          creditAmount: Number(cn.amount),
        });
      }
    }

    const relatedReturns = Array.from(returnSummary.values()).sort((a, b) =>
      b.creditAmount - a.creditAmount,
    );

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
          totalCredits: Number(totalCredits.toFixed(2)),
          creditNoteCount: invoice.creditNotes.length,
          relatedReturnCount: relatedReturns.length,
        },
        relatedReturns,
      },
    });
  } catch (error) {
    console.error("Failed to load credit notes summary", error);
    return NextResponse.json(
      { error: "Failed to load credit notes summary." },
      { status: 500 },
    );
  }
}
