import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getReceiptNumber } from "@/lib/commission";
import type { PendingCommissionsResponse } from "@/types/api";

type PeriodType = "daily" | "weekly" | "monthly" | "yearly" | "custom";

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const getWeekStartMonday = (d: Date) => {
  const date = startOfDay(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

function parsePeriod(search: URLSearchParams) {
  const now = new Date();
  const periodTypeRaw = search.get("periodType");
  const periodType: PeriodType =
    periodTypeRaw === "daily" ||
    periodTypeRaw === "weekly" ||
    periodTypeRaw === "monthly" ||
    periodTypeRaw === "yearly" ||
    periodTypeRaw === "custom"
      ? periodTypeRaw
      : "monthly";

  if (periodType === "daily") {
    const raw = search.get("date");
    const base = raw ? new Date(raw) : now;
    if (Number.isNaN(base.getTime())) throw new Error("Invalid date.");
    return { startDate: startOfDay(base), endDate: endOfDay(base) };
  }

  if (periodType === "weekly") {
    const raw = search.get("date");
    const base = raw ? new Date(raw) : now;
    if (Number.isNaN(base.getTime())) throw new Error("Invalid week date.");
    const start = getWeekStartMonday(base);
    const end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
    return { startDate: start, endDate: end };
  }

  if (periodType === "monthly") {
    const raw = search.get("month");
    const m = raw?.match(/^(\d{4})-(\d{2})$/);
    const year = m ? Number(m[1]) : now.getFullYear();
    const month = m ? Number(m[2]) - 1 : now.getMonth();
    if (month < 0 || month > 11) throw new Error("Invalid month.");
    return {
      startDate: startOfDay(new Date(year, month, 1)),
      endDate: endOfDay(new Date(year, month + 1, 0)),
    };
  }

  if (periodType === "yearly") {
    const raw = search.get("year");
    const year = raw ? Number(raw) : now.getFullYear();
    if (!Number.isInteger(year)) throw new Error("Invalid year.");
    return {
      startDate: startOfDay(new Date(year, 0, 1)),
      endDate: endOfDay(new Date(year, 11, 31)),
    };
  }

  const fromRaw = search.get("from");
  const toRaw = search.get("to");
  if (!fromRaw || !toRaw) throw new Error("Custom period requires from and to.");

  const from = new Date(fromRaw);
  const to = new Date(toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new Error("Invalid custom dates.");
  const start = startOfDay(from);
  const end = endOfDay(to);
  if (start > end) throw new Error("from cannot be after to.");
  return { startDate: start, endDate: end };
}

const canManageCommission = (roleName?: string) => {
  const role = roleName?.toLowerCase();
  return role === "admin" || role === "operator";
};

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageCommission(user.role?.role_name)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const search = new URL(request.url).searchParams;
    const period = parsePeriod(search);
    const repIdRaw = search.get("repId");
    const repId = repIdRaw && repIdRaw !== "all" ? Number(repIdRaw) : null;

    // Query PENDING Commission records directly (not InvoiceSettlements)
    const pendingCommissions = await prisma.commission.findMany({
      where: {
        is_active: true,
        status: "PENDING",
        ...(repId ? { rep_id: repId } : {}),
        invoiceSettlement: {
          is: {
            is_active: true,
            invoice: {
              invoice_date: { gte: period.startDate, lte: period.endDate },
            },
          },
        },
      },
      orderBy: [{ created_at: "desc" }, { commission_id: "desc" }],
      select: {
        commission_id: true,
        commission_rate: true,
        commission_amount: true,
        days_to_pay: true,
        rep_id: true,
        rep: {
          select: { full_name: true },
        },
        invoiceSettlement: {
          select: {
            settlement_id: true,
            settlement_type: true,
            settled_date: true,
            amount: true,
            invoice: {
              select: {
                invoice_id: true,
                invoice_number: true,
                invoice_date: true,
                customer: { select: { name: true } },
                rep: { select: { rep_id: true, full_name: true } },
              },
            },
            receipt: {
              select: {
                receipt_id: true,
                receipt_date: true,
              },
            },
          },
        },
        reversalAllocations: {
          where: { is_active: true },
          select: {
            allocation_id: true,
            source_settlement_id: true,
            allocated_amount: true,
            applied_rate: true,
            reversal_amount: true,
            sourceSettlement: {
              select: {
                settled_date: true,
                receipt: {
                  select: {
                    receipt_id: true,
                    receipt_date: true,
                  },
                },
              },
            },
          },
          orderBy: { allocation_id: "asc" },
        },
      },
    });

    const rows = pendingCommissions
      .map((c) => {
        const settlement = c.invoiceSettlement;
        if (!settlement) return null;

        const isReceipt = settlement.settlement_type === "RECEIPT";
        const receiptId = settlement.receipt?.receipt_id ?? null;
        const receiptDate = settlement.receipt?.receipt_date ?? null;
        const receiptNo = receiptId && receiptDate
          ? getReceiptNumber(receiptId, receiptDate)
          : null;

        const settlementAmount = Number(settlement.amount);
        const signedAmount = isReceipt ? settlementAmount : -settlementAmount;

        // Build reversal allocation details for credit notes
        const reversalDetails = c.reversalAllocations.map((a) => ({
          allocationId: a.allocation_id,
          sourceReceiptId: a.sourceSettlement.receipt?.receipt_id ?? null,
          sourceReceiptNo: a.sourceSettlement.receipt
            ? getReceiptNumber(
                a.sourceSettlement.receipt.receipt_id,
                a.sourceSettlement.receipt.receipt_date,
              )
            : null,
          allocatedAmount: Number(a.allocated_amount),
          appliedRate: Number((Number(a.applied_rate) * 100).toFixed(4)),
          reversalAmount: Number(a.reversal_amount),
        }));

        return {
          commissionId: c.commission_id,
          settlementId: settlement.settlement_id,
          settlementType: settlement.settlement_type as "RECEIPT" | "CREDIT_NOTE",
          invoiceId: settlement.invoice.invoice_id,
          invoiceNo: settlement.invoice.invoice_number ?? "",
          invoiceDate: settlement.invoice.invoice_date.toISOString(),
          receiptId,
          receiptNo,
          receiptDate: receiptDate ? receiptDate.toISOString() : null,
          customerName: settlement.invoice.customer?.name ?? "",
          repId: c.rep_id,
          repName: c.rep.full_name,
          settlementDate: settlement.settled_date.toISOString(),
          settlementAmount: Number(signedAmount.toFixed(2)),
          daysToPay: c.days_to_pay,
          appliedRate: Number((Number(c.commission_rate) * 100).toFixed(4)),
          computedCommissionAmount: Number(c.commission_amount),
          conditionLabel: isReceipt
            ? c.days_to_pay <= 0
              ? "Same-day"
              : `${c.days_to_pay} days`
            : "Credit reversal",
          reversalDetails,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const response: PendingCommissionsResponse = { data: { rows } };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to load pending commissions", error);
    return NextResponse.json({ error: "Failed to load pending commissions." }, { status: 500 });
  }
}
