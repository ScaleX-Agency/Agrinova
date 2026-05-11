import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  getDaysToPay,
  getOrCreateActiveCommissionConfig,
  resolveCommissionRate,
} from "@/lib/commissionConfig";
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

    const cfg = await getOrCreateActiveCommissionConfig();
    const settlements = await prisma.invoiceSettlement.findMany({
      where: {
        is_active: true,
        commission_issued: false,
        settlement_type: { in: ["RECEIPT", "CREDIT_NOTE"] },
        invoice: {
          invoice_date: { gte: period.startDate, lte: period.endDate },
          ...(repId ? { rep_id: repId } : {}),
        },
      },
      orderBy: [{ settled_date: "desc" }, { settlement_id: "desc" }],
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
    });

    const invoiceIds = Array.from(
      new Set(settlements.map((s) => s.invoice.invoice_id)),
    );
    const receiptSettlements = await prisma.invoiceSettlement.findMany({
      where: {
        is_active: true,
        settlement_type: "RECEIPT",
        receipt_id: { not: null },
        invoice_id: { in: invoiceIds },
      },
      orderBy: [{ settled_date: "asc" }, { settlement_id: "asc" }],
      select: {
        invoice_id: true,
        commission_issued: true,
        settled_date: true,
        receipt: {
          select: {
            receipt_id: true,
            receipt_date: true,
          },
        },
      },
    });
    const receiptByInvoiceId = new Map<number, (typeof receiptSettlements)[number]>();
    for (const r of receiptSettlements) {
      if (!receiptByInvoiceId.has(r.invoice_id)) {
        receiptByInvoiceId.set(r.invoice_id, r);
      }
    }

    const rows = settlements
      .map((s) => {
        const receiptSettlementForInvoice = receiptByInvoiceId.get(
          s.invoice.invoice_id,
        );

        if (!receiptSettlementForInvoice || !receiptSettlementForInvoice.receipt) return null;
        if (
          s.settlement_type === "CREDIT_NOTE" &&
          receiptSettlementForInvoice.commission_issued !== true
        ) {
          return null;
        }

        const baseReceiptDate = receiptSettlementForInvoice.settled_date;
        const daysToPay = getDaysToPay(s.invoice.invoice_date, baseReceiptDate);
        const rate = resolveCommissionRate(daysToPay, cfg);
        const settlementAmount = Number(s.amount);
        const signedAmount =
          s.settlement_type === "CREDIT_NOTE" ? settlementAmount * -1 : settlementAmount;
        const commissionAmount = signedAmount * rate;
        const conditionLabel =
          daysToPay <= 0
            ? "Same-day"
            : daysToPay >= cfg.rangeMinDays && daysToPay <= cfg.rangeMaxDays
              ? `${cfg.rangeMinDays}-${cfg.rangeMaxDays} days`
              : `>${cfg.rangeMaxDays} days`;

        return {
          settlementId: s.settlement_id,
          settlementType: s.settlement_type as "RECEIPT" | "CREDIT_NOTE",
          invoiceId: s.invoice.invoice_id,
          invoiceNo: s.invoice.invoice_number ?? "",
          invoiceDate: s.invoice.invoice_date.toISOString(),
          receiptId: receiptSettlementForInvoice.receipt!.receipt_id,
          receiptNo: getReceiptNumber(
            receiptSettlementForInvoice.receipt!.receipt_id,
            receiptSettlementForInvoice.receipt!.receipt_date,
          ),
          receiptDate: receiptSettlementForInvoice.receipt!.receipt_date.toISOString(),
          customerName: s.invoice.customer?.name ?? "",
          repId: s.invoice.rep.rep_id,
          repName: s.invoice.rep.full_name,
          settlementDate: s.settled_date.toISOString(),
          settlementAmount: Number(signedAmount.toFixed(2)),
          daysToPay,
          appliedRate: Number((rate * 100).toFixed(4)),
          computedCommissionAmount: Number(commissionAmount.toFixed(2)),
          conditionLabel,
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
