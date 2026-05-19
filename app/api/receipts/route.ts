import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createSettlementCommission } from "@/lib/commissionSettlement";
import { recalculateInvoiceFinancials } from "@/lib/invoiceFinancials";
import type {
  CreateReceiptRequestDto,
  CreateReceiptResponse,
  ReceiptNumberAvailabilityResponse,
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkReceiptNo = searchParams.get("checkReceiptNo") === "true";
    const receiptNo = searchParams.get("receiptNo")?.trim();

    if (checkReceiptNo) {
      if (!receiptNo) {
        return NextResponse.json(
          { error: "Receipt number is required." },
          { status: 400 },
        );
      }

      const existingReceipt = await prisma.receipt.findFirst({
        where: {
          receipt_number: receiptNo,
          is_active: true,
        },
        select: { receipt_id: true },
      });

      const responseBody: ReceiptNumberAvailabilityResponse = {
        data: {
          receiptNo,
          isUnique: existingReceipt === null,
        },
      };

      return NextResponse.json(responseBody);
    }

    const range = searchParams.get("range");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let dateFilter: Prisma.DateTimeFilter | undefined;
    if (range && range !== "all") {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;

      if (range === "day") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (range === "week") {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
      } else if (range === "month") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else if (range === "year") {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear() + 1, 0, 1);
      } else if (range === "custom") {
        start = startDateParam ? new Date(startDateParam) : null;
        if (endDateParam) {
          const endDate = new Date(endDateParam);
          end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
        }
      }

      if (start || end) {
        dateFilter = {};
        if (start) dateFilter.gte = start;
        if (end) dateFilter.lt = end;
      }
    } else if (startDateParam || endDateParam) {
      dateFilter = {};
      if (startDateParam) dateFilter.gte = new Date(startDateParam);
      if (endDateParam) {
        const end = new Date(endDateParam);
        dateFilter.lt = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
      }
    }

    const receipts = await prisma.receipt.findMany({
      where: {
        is_active: true,
        ...(dateFilter ? { receipt_date: dateFilter } : {}),
      },
      orderBy: [{ receipt_date: "desc" }, { receipt_id: "desc" }],
      select: {
        receipt_id: true,
        receipt_number: true,
        receipt_date: true,
        amount: true,
        payment_method: true,
        is_returned: true,
        returned_at: true,
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
        return {
          id: receipt.receipt_id,
          receiptNo: receipt.receipt_number,
          receiptDate: receipt.receipt_date.toISOString(),
          invoiceId: receipt.invoice.invoice_id,
          invoiceNo: receipt.invoice.invoice_number,
          customerName: receipt.invoice.customer.name,
          amountReceived: Number(receipt.amount),
          paymentMethod: receipt.payment_method,
          isReturned: receipt.is_returned,
          returnedAt: receipt.returned_at ? receipt.returned_at.toISOString() : null,
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

    // Get user from session
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = currentUser.user_id;

    const invoiceId = toPositiveInt(body.invoiceId);
    const receiptNo = body.receiptNo?.trim();
    const amountReceived = toPositiveNumber(body.amountReceived);
    const paymentMethod = body.paymentMethod;
    const receiptDateRaw = body.receiptDate;

    if (!invoiceId || !amountReceived || !isValidPaymentMethod(paymentMethod) || !receiptNo) {
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
          is_active: true,
          invoice_date: true,
          total_amount: true,
          paid_amount: true,
          credited_amount: true,
          balance_amount: true,
          payment_status: true,
          rep_id: true,
        },
      });

      if (!invoice) {
        throw new Error("Selected invoice not found.");
      }
      if (!invoice.is_active) {
        throw new Error("Selected invoice is inactive.");
      }

      const existingActiveReceipt = await tx.receipt.findFirst({
        where: {
          receipt_number: receiptNo,
          is_active: true,
        },
        select: { receipt_id: true },
      });
      if (existingActiveReceipt) {
        throw new Error("An active receipt with this number already exists.");
      }

      const totalAmount = Number(invoice.total_amount);
      const paidAmount = Number(invoice.paid_amount);
      const creditedAmount = Number(invoice.credited_amount);
      const outstandingAmount = Number(invoice.balance_amount);

      if (outstandingAmount <= 0) {
        throw new Error("Invoice is already fully paid.");
      }

      if (amountReceived > outstandingAmount) {
        throw new Error(`Amount exceeds outstanding balance. Outstanding: ${outstandingAmount.toFixed(2)}`);
      }

      // 1. Create Receipt
      const receipt = await tx.receipt.create({
        data: {
          invoice_id: invoice.invoice_id,
          receipt_number: receiptNo,
          created_by: userId,
          receipt_date: receiptDate,
          amount: amountReceived,
          payment_method: paymentMethod,
          cheque_no: paymentMethod === "CHEQUE" ? body.chequeNo?.trim() ?? null : null,
          cheque_date: paymentMethod === "CHEQUE" ? chequeDate : null,
          bank_name: paymentMethod === "CHEQUE" || paymentMethod === "BANK_TRANSFER"
            ? body.bankName?.trim() ?? null
            : null,
          notes: body.notes?.trim() ? body.notes.trim() : null,
        },
        select: {
          receipt_id: true,
          receipt_number: true,
          receipt_date: true,
          amount: true,
        },
      });

      // 2. Create InvoiceSettlement
      const settlement = await tx.invoiceSettlement.create({
        data: {
          invoice_id: invoice.invoice_id,
          receipt_id: receipt.receipt_id,
          amount: receipt.amount,
          settlement_type: "RECEIPT",
          settled_date: receipt.receipt_date,
        },
        select: { settlement_id: true },
      });

      // 3. Recompute Invoice financials from active records
      await recalculateInvoiceFinancials(tx, invoice.invoice_id);

      // 4. Auto-create Commission record
      const commissionResult = await createSettlementCommission(
        tx,
        invoice.invoice_id,
        settlement.settlement_id,
        "RECEIPT",
        invoice.invoice_date,
        receipt.receipt_date,
        invoice.rep_id,
        amountReceived,
      );

      return {
        receiptId: receipt.receipt_id,
        receiptNo: receipt.receipt_number,
        commissionId: commissionResult.commissionId,
        daysToPay: commissionResult.daysToPay,
        commissionRate: commissionResult.commissionRate,
        commissionAmount: commissionResult.commissionAmount,
      };
    }, { timeout: 20000, maxWait: 10000 });

    const responseBody: CreateReceiptResponse = {
      data: {
        success: true,
        receiptId: created.receiptId,
        receiptNo: created.receiptNo,
        commissionId: created.commissionId,
        daysToPay: created.daysToPay,
        commissionRate: created.commissionRate,
        commissionAmount: created.commissionAmount,
      },
    };

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const isValidationError =
        error.message.includes("invoice") ||
        error.message.includes("receipt") ||
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
