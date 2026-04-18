import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
        receipt_date: true,
        amount_received: true,
        payment_method: true,
        cheque_no: true,
        cheque_date: true,
        bank_name: true,
        collector: {
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

    if (!receipt) {
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
        amountReceived: Number(receipt.amount_received),
        paymentMethod: receipt.payment_method,
        collectedBy: receipt.collector.full_name,
        chequeNo: receipt.cheque_no,
        chequeDate: receipt.cheque_date ? receipt.cheque_date.toISOString() : null,
        bankName: receipt.bank_name,
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
