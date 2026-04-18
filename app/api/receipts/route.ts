import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  CreateReceiptRequestDto,
  CreateReceiptResponse,
  ReceiptsResponse,
} from "@/types/api";

const toPositiveInt = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(0, Math.trunc(numberValue));
};

const toPositiveNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(0, numberValue);
};

const isValidPaymentMethod = (value: unknown): value is "CASH" | "CHEQUE" | "BANK_TRANSFER" =>
  value === "CASH" || value === "CHEQUE" || value === "BANK_TRANSFER";

export async function GET() {
  try {
    const receipts = await prisma.receipt.findMany({
      orderBy: [{ receipt_date: "desc" }, { receipt_id: "desc" }],
      select: {
        receipt_id: true,
        receipt_date: true,
        amount_received: true,
        payment_method: true,
        invoice: {
          select: {
            invoice_id: true,
            invoice_number: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const responseBody: ReceiptsResponse = {
      data: receipts.map((receipt) => {
        const year = receipt.receipt_date.getFullYear();
        const month = String(receipt.receipt_date.getMonth() + 1).padStart(2, "0");
        const receiptNo = `RCP-${year}${month}-${String(receipt.receipt_id).padStart(3, "0")}`;

        return {
          id: receipt.receipt_id,
          receiptNo,
          receiptDate: receipt.receipt_date.toISOString(),
          invoiceId: receipt.invoice.invoice_id,
          invoiceNo: receipt.invoice.invoice_number,
          customerName: receipt.invoice.customer.name,
          amountReceived: Number(receipt.amount_received),
          paymentMethod: receipt.payment_method,
        };
      }),
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Failed to load receipts", error);
    return NextResponse.json({ error: "Failed to load receipts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateReceiptRequestDto;

    const invoiceId = toPositiveInt(body.invoiceId);
    const collectedBy = toPositiveInt(body.collectedBy, 1);
    const amountReceived = toPositiveNumber(body.amountReceived);
    const paymentMethod = body.paymentMethod;
    const receiptDateRaw = body.receiptDate;

    if (!invoiceId || !collectedBy || !amountReceived || !isValidPaymentMethod(paymentMethod)) {
      return NextResponse.json(
        { error: "Missing or invalid receipt fields." },
        { status: 400 },
      );
    }

    if (!receiptDateRaw || Number.isNaN(new Date(receiptDateRaw).getTime())) {
      return NextResponse.json({ error: "Receipt date is invalid." }, { status: 400 });
    }

    if (paymentMethod === "CHEQUE") {
      if (!body.chequeNo?.trim()) {
        return NextResponse.json({ error: "Cheque number is required for cheque payments." }, { status: 400 });
      }
      if (!body.chequeDate || Number.isNaN(new Date(body.chequeDate).getTime())) {
        return NextResponse.json({ error: "Cheque date is required for cheque payments." }, { status: 400 });
      }
      if (!body.bankName?.trim()) {
        return NextResponse.json({ error: "Bank name is required for cheque payments." }, { status: 400 });
      }
    }

    if (paymentMethod === "BANK_TRANSFER" && !body.bankName?.trim()) {
      return NextResponse.json({ error: "Bank name is required for bank transfers." }, { status: 400 });
    }

    const receiptDate = new Date(receiptDateRaw);
    const chequeDate = body.chequeDate ? new Date(body.chequeDate) : null;

    const created = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { invoice_id: invoiceId },
        select: {
          invoice_id: true,
          total_amount: true,
          status: true,
          receipts: {
            select: {
              amount_received: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new Error("Selected invoice not found.");
      }

      const totalAmount = Number(invoice.total_amount);
      const paidAmount = invoice.receipts.reduce((sum, receipt) => sum + Number(receipt.amount_received), 0);
      const outstandingAmount = Math.max(0, totalAmount - paidAmount);

      if (outstandingAmount <= 0) {
        throw new Error("Invoice is already fully paid.");
      }

      if (amountReceived > outstandingAmount) {
        throw new Error(`Amount exceeds outstanding balance. Outstanding: ${outstandingAmount.toFixed(2)}`);
      }

      const receipt = await tx.receipt.create({
        data: {
          invoice_id: invoice.invoice_id,
          collected_by: collectedBy,
          receipt_date: receiptDate,
          amount_received: amountReceived,
          payment_method: paymentMethod,
          cheque_no: paymentMethod === "CHEQUE" ? body.chequeNo?.trim() ?? null : null,
          cheque_date: paymentMethod === "CHEQUE" ? chequeDate : null,
          bank_name: paymentMethod === "CHEQUE" || paymentMethod === "BANK_TRANSFER"
            ? body.bankName?.trim() ?? null
            : null,
        },
        select: {
          receipt_id: true,
          receipt_date: true,
        },
      });

      const nextPaidAmount = paidAmount + amountReceived;
      const nextStatus =
        nextPaidAmount >= totalAmount
          ? "PAID"
          : nextPaidAmount > 0
            ? "PARTIAL"
            : "UNPAID";

      await tx.invoice.update({
        where: { invoice_id: invoice.invoice_id },
        data: { status: nextStatus },
      });

      const year = receipt.receipt_date.getFullYear();
      const month = String(receipt.receipt_date.getMonth() + 1).padStart(2, "0");
      const receiptNo = `RCP-${year}${month}-${String(receipt.receipt_id).padStart(3, "0")}`;

      return {
        receiptId: receipt.receipt_id,
        receiptNo,
      };
    });

    const responseBody: CreateReceiptResponse = {
      data: {
        success: true,
        receiptId: created.receiptId,
        receiptNo: created.receiptNo,
      },
    };

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const isValidationError =
        error.message.includes("invoice") ||
        error.message.includes("outstanding") ||
        error.message.includes("paid") ||
        error.message.includes("Amount exceeds");

      if (isValidationError) {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }
    }

    console.error("Create receipt failed", error);
    return NextResponse.json({ error: "Failed to create receipt." }, { status: 500 });
  }
}
