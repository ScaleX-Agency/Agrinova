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

    const invoice = await prisma.invoice.findFirst({
      where: { invoice_number: invoiceNumber, is_active: true },
      select: {
        invoice_id: true,
        is_active: true,
        invoice_number: true,
        invoice_date: true,
        total_amount: true,
        payment_status: true,
        receipts: {
          where: { is_active: true },
          select: {
            receipt_id: true,
            receipt_date: true,
            amount: true,
            payment_method: true,
            cheque_no: true,
            cheque_date: true,
            bank_name: true,
            notes: true,
            created_at: true,
            creator: {
              select: {
                full_name: true,
              },
            },
          },
          orderBy: { receipt_date: "asc" },
        },
        invoiceSettlements: {
          select: {
            settlement_id: true,
            settled_date: true,
            amount: true,
            receipt: {
              select: {
                receipt_id: true,
                receipt_date: true,
                amount: true,
                payment_method: true,
                cheque_no: true,
                cheque_date: true,
                bank_name: true,
                notes: true,
                created_at: true,
                creator: {
                  select: {
                    full_name: true,
                  },
                },
              },
            },
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

    const receiptsMap = new Map<
      number,
      {
        receiptId: number;
        receiptDate: string;
        amount: number;
        paymentMethod: string;
        chequeNo: string | null;
        chequeDate: string | null;
        bankName: string | null;
        notes: string | null;
        createdAt: string;
        createdBy: string;
        settlementAmount: number;
      }
    >();

    for (const receipt of invoice.receipts) {
      receiptsMap.set(receipt.receipt_id, {
        receiptId: receipt.receipt_id,
        receiptDate: receipt.receipt_date.toISOString(),
        amount: Number(receipt.amount),
        paymentMethod: receipt.payment_method,
        chequeNo: receipt.cheque_no,
        chequeDate: receipt.cheque_date?.toISOString() ?? null,
        bankName: receipt.bank_name,
        notes: receipt.notes,
        createdAt: receipt.created_at.toISOString(),
        createdBy: receipt.creator.full_name,
        settlementAmount: 0,
      });
    }

    for (const settlement of invoice.invoiceSettlements) {
      if (settlement.receipt) {
        const entry = receiptsMap.get(settlement.receipt.receipt_id);
        if (entry) {
          entry.settlementAmount += Number(settlement.amount);
        }
      }
    }

    const receipts = Array.from(receiptsMap.values()).map((r) => ({
      ...r,
      settlementAmount: Number(r.settlementAmount.toFixed(2)),
    }));

    return NextResponse.json({
      data: {
        invoice: {
          id: invoice.invoice_id,
          number: invoice.invoice_number,
          date: invoice.invoice_date.toISOString(),
          totalAmount: Number(invoice.total_amount),
          status: invoice.payment_status,
        },
        receipts,
        receiptCount: receipts.length,
      },
    });
  } catch (error) {
    console.error("Failed to load receipts details", error);
    return NextResponse.json(
      { error: "Failed to load receipts details." },
      { status: 500 },
    );
  }
}
