import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminOrOperatorUser } from "@/lib/auth";
import { rebuildInvoiceCreditNoteCommissions } from "@/lib/commissionSettlement";
import { recalculateInvoiceFinancials } from "@/lib/invoiceFinancials";
import type {
  CreateReturnedChequeRequestDto,
  ReturnedChequesResponse,
} from "@/types/api";

const toPositiveInt = (value: unknown) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
};

const toDate = (value: unknown) => {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminOrOperatorUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const range = (searchParams.get("range") ?? "all").toLowerCase();
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = (searchParams.get("search") ?? "").trim();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (range === "day") {
      start.setHours(0, 0, 0, 0);
    } else if (range === "week") {
      const day = now.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      start.setDate(now.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
    } else if (range === "month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (range === "year") {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    }

    const dateFilter =
      range === "custom"
        ? startDate && endDate
          ? {
              gte: new Date(`${startDate}T00:00:00.000Z`),
              lte: new Date(`${endDate}T23:59:59.999Z`),
            }
          : undefined
        : range === "all"
          ? undefined
          : {
              gte: start,
              lte: end,
            };

    const where: Prisma.ReturnedChequeWhereInput = {
      is_active: true,
      ...(dateFilter ? { return_date: dateFilter } : {}),
      ...(search.length > 0
        ? {
            OR: [
              { reason: { contains: search, mode: "insensitive" } },
              { receipt: { is: { receipt_number: { contains: search, mode: "insensitive" } } } },
              { receipt: { is: { cheque_no: { contains: search, mode: "insensitive" } } } },
              { receipt: { is: { bank_name: { contains: search, mode: "insensitive" } } } },
              { receipt: { is: { invoice: { is: { invoice_number: { contains: search, mode: "insensitive" } } } } } },
              { receipt: { is: { invoice: { is: { customer: { is: { name: { contains: search, mode: "insensitive" } } } } } } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.returnedCheque.count({ where }),
      prisma.returnedCheque.findMany({
        where,
        orderBy: [{ return_date: "desc" }, { returned_cheque_id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          returned_cheque_id: true,
          receipt_id: true,
          return_date: true,
          amount: true,
          reason: true,
          receipt: {
            select: {
              receipt_number: true,
              cheque_no: true,
              cheque_date: true,
              bank_name: true,
              invoice: {
                select: {
                  invoice_id: true,
                  invoice_number: true,
                  customer: { select: { name: true } },
                },
              },
            },
          },
          creator: { select: { full_name: true } },
        },
      }),
    ]);

    const response: ReturnedChequesResponse = {
      data: rows.map((row) => ({
        id: row.returned_cheque_id,
        receiptId: row.receipt_id,
        receiptNo: row.receipt.receipt_number,
        invoiceId: row.receipt.invoice.invoice_id,
        invoiceNo: row.receipt.invoice.invoice_number,
        customerName: row.receipt.invoice.customer.name,
        chequeNo: row.receipt.cheque_no,
        chequeDate: row.receipt.cheque_date?.toISOString() ?? null,
        bankName: row.receipt.bank_name,
        amount: Number(row.amount),
        returnDate: row.return_date.toISOString(),
        reason: row.reason,
        createdBy: row.creator.full_name,
      })),
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to load returned cheques", error);
    return NextResponse.json({ error: "Failed to load returned cheques." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminOrOperatorUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as CreateReturnedChequeRequestDto;
    const receiptId = toPositiveInt(body.receiptId);
    const returnDate = toDate(body.returnDate);
    const reason = body.reason?.trim();
    const bankReference = body.bankReference?.trim() || null;
    const notes = body.notes?.trim() || null;

    if (!receiptId || !returnDate || !reason) {
      return NextResponse.json({ error: "Invalid returned cheque payload." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.findUnique({
        where: { receipt_id: receiptId },
        select: {
          receipt_id: true,
          receipt_number: true,
          invoice_id: true,
          is_active: true,
          is_returned: true,
          amount: true,
          payment_method: true,
          invoice: {
            select: {
              invoice_id: true,
              is_active: true,
              rep_id: true,
            },
          },
          invoiceSettlements: {
            where: {
              is_active: true,
              settlement_type: "RECEIPT",
            },
            select: {
              settlement_id: true,
              amount: true,
              commissions: {
                where: { is_active: true },
                select: {
                  commission_amount: true,
                },
              },
            },
          },
        },
      });

      if (!receipt || !receipt.is_active) {
        throw new Error("Receipt not found.");
      }
      if (!receipt.invoice.is_active) {
        throw new Error("Invoice is inactive.");
      }
      if (receipt.payment_method !== "CHEQUE") {
        throw new Error("Only cheque receipts can be marked as returned.");
      }
      if (receipt.is_returned) {
        throw new Error("Receipt is already marked as returned.");
      }

      const existingReturn = await tx.returnedCheque.findFirst({
        where: { receipt_id: receipt.receipt_id, is_active: true },
        select: { returned_cheque_id: true },
      });
      if (existingReturn) {
        throw new Error("An active returned-cheque record already exists for this receipt.");
      }

      const returnedCheque = await tx.returnedCheque.create({
        data: {
          receipt_id: receipt.receipt_id,
          invoice_id: receipt.invoice_id,
          return_date: returnDate,
          amount: receipt.amount,
          reason,
          bank_reference: bankReference,
          notes,
          created_by: currentUser.user_id,
        },
        select: {
          returned_cheque_id: true,
          amount: true,
        },
      });

      await tx.receipt.update({
        where: { receipt_id: receipt.receipt_id },
        data: {
          is_returned: true,
          returned_at: returnDate,
        },
      });

      await recalculateInvoiceFinancials(tx, receipt.invoice_id);

      const returnSettlement = await tx.invoiceSettlement.create({
        data: {
          invoice_id: receipt.invoice_id,
          returned_cheque_id: returnedCheque.returned_cheque_id,
          amount: returnedCheque.amount,
          settlement_type: "CHEQUE_RETURN",
          settled_date: returnDate,
        },
        select: { settlement_id: true },
      });

      const commissionToNegate = receipt.invoiceSettlements.reduce((sum, settlement) => {
        const settlementCommission = settlement.commissions.reduce(
          (innerSum, commission) => innerSum + Number(commission.commission_amount),
          0,
        );
        return sum + settlementCommission;
      }, 0);

      if (Math.abs(commissionToNegate) > 0.0001) {
        const rateBase = Number(receipt.amount);
        const negRate = rateBase > 0 ? Number((commissionToNegate / rateBase).toFixed(4)) : 0;
        await tx.commission.create({
          data: {
            rep_id: receipt.invoice.rep_id,
            commission_rate: negRate,
            commission_amount: Number((-commissionToNegate).toFixed(2)),
            days_to_pay: 0,
            status: "PAID",
            settlement_id: returnSettlement.settlement_id,
          },
        });
      }

      await tx.invoiceSettlement.update({
        where: { settlement_id: returnSettlement.settlement_id },
        data: { commission_issued: true },
      });

      await rebuildInvoiceCreditNoteCommissions(tx, receipt.invoice_id, receipt.invoice.rep_id);

      return {
        returnedChequeId: returnedCheque.returned_cheque_id,
      };
    }, { timeout: 20000, maxWait: 10000 });

    return NextResponse.json({ data: { success: true, returnedChequeId: result.returnedChequeId } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create returned cheque.";
    const status = message.includes("not found") ? 404 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
