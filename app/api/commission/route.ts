import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

const toNum = (value: number | string | { toString(): string } | null | undefined) =>
  Number(value ?? 0);

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
    return {
      startDate: startOfDay(base),
      endDate: endOfDay(base),
      label: base.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    };
  }

  if (periodType === "weekly") {
    const raw = search.get("date");
    const base = raw ? new Date(raw) : now;
    if (Number.isNaN(base.getTime())) throw new Error("Invalid week date.");
    const start = getWeekStartMonday(base);
    const end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
    return {
      startDate: start,
      endDate: end,
      label: `${start.toLocaleDateString("en-GB")} - ${end.toLocaleDateString("en-GB")}`,
    };
  }

  if (periodType === "monthly") {
    const raw = search.get("month");
    const m = raw?.match(/^(\d{4})-(\d{2})$/);
    const year = m ? Number(m[1]) : now.getFullYear();
    const month = m ? Number(m[2]) - 1 : now.getMonth();
    if (month < 0 || month > 11) throw new Error("Invalid month.");
    const start = startOfDay(new Date(year, month, 1));
    const end = endOfDay(new Date(year, month + 1, 0));
    return {
      startDate: start,
      endDate: end,
      label: start.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
    };
  }

  if (periodType === "yearly") {
    const raw = search.get("year");
    const year = raw ? Number(raw) : now.getFullYear();
    if (!Number.isInteger(year)) throw new Error("Invalid year.");
    return {
      startDate: startOfDay(new Date(year, 0, 1)),
      endDate: endOfDay(new Date(year, 11, 31)),
      label: String(year),
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
  return {
    startDate: start,
    endDate: end,
    label: `${start.toLocaleDateString("en-GB")} - ${end.toLocaleDateString("en-GB")}`,
  };
}

export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams;
    const period = parsePeriod(search);
    const repIdRaw = search.get("repId");
    const repId = repIdRaw && repIdRaw !== "all" ? Number(repIdRaw) : null;
    if (repIdRaw && repIdRaw !== "all" && (!Number.isInteger(repId) || (repId as number) <= 0)) {
      return NextResponse.json({ error: "Invalid repId." }, { status: 400 });
    }
    const searchQuery = (search.get("search") ?? "").trim().toLowerCase();
    const dateFilterBasedOn = search.get("dateFilterBasedOn") === "invoice" ? "invoice" : "settlement";

    const [commissions] = await Promise.all([
      prisma.commission.findMany({
        where: {
          is_active: true,
          ...(repId ? { rep_id: repId } : {}),
          invoiceSettlement: {
            is: {
              is_active: true,
              ...(dateFilterBasedOn === "invoice"
                ? {
                    invoice: {
                      invoice_date: { gte: period.startDate, lte: period.endDate },
                    },
                  }
                : {
                    settled_date: { gte: period.startDate, lte: period.endDate },
                  }),
            },
          },
        },
        select: {
          rep_id: true,
          days_to_pay: true,
          commission_amount: true,
          invoiceSettlement: {
            select: {
              settlement_type: true,
              amount: true,
              invoice: {
                select: {
                  invoice_id: true,
                  total_amount: true,
                  customer_id: true,
                },
              },
              receipt: {
                select: {
                  receipt_id: true,
                  amount: true,
                },
              },
            },
          },
          rep: {
            select: {
              full_name: true,
            },
          },
        },
      }),
    ]);



    type Aggregate = {
      repId: number;
      repName: string;
      receiptIds: Set<number>;
      invoiceIds: Set<number>;
      totalSales: number;
      cashCollected: number;
      daysSum: number;
      daysCount: number;
      commissionAmount: number;
    };

    const byRep = new Map<number, Aggregate>();

    for (const commission of commissions) {
      const settlement = commission.invoiceSettlement;
      if (!settlement) continue;
      const repIdVal = commission.rep_id;
      const repName = commission.rep.full_name;
      const receiptId = settlement.receipt?.receipt_id ?? null;
      const invoiceId = settlement.invoice.invoice_id;
      const invoiceAmount = toNum(settlement.invoice.total_amount);
      const cashCollected = settlement.receipt ? toNum(settlement.receipt.amount) : 0;
      const commissionAmount = toNum(commission.commission_amount);
      const days = toNum(commission.days_to_pay);

      const existing = byRep.get(repIdVal) ?? {
        repId: repIdVal,
        repName,
        receiptIds: new Set<number>(),
        invoiceIds: new Set<number>(),
        totalSales: 0,
        cashCollected: 0,
        daysSum: 0,
        daysCount: 0,
        commissionAmount: 0,
      };

      if (receiptId) existing.receiptIds.add(receiptId);
      existing.invoiceIds.add(invoiceId);
      existing.totalSales += invoiceAmount;
      existing.cashCollected += cashCollected;
      existing.daysSum += days;
      existing.daysCount += 1;
      existing.commissionAmount += commissionAmount;
      byRep.set(repIdVal, existing);
    }

    const rows = Array.from(byRep.values())
      .map((row) => {
        const avgDays = row.daysCount > 0 ? row.daysSum / row.daysCount : 0;
        const commissionRate = row.totalSales > 0 ? (row.commissionAmount / row.totalSales) * 100 : 0;
        return {
          repId: row.repId,
          repName: row.repName,
          invoiceCount: row.invoiceIds.size,
          totalSales: Number(row.totalSales.toFixed(2)),
          cashCollected: Number(row.cashCollected.toFixed(2)),
          avgDays: Number(avgDays.toFixed(2)),
          commissionRate: Number(commissionRate.toFixed(2)),
          commissionAmount: Number(row.commissionAmount.toFixed(2)),
        };
      })
      .filter((row) => !searchQuery || row.repName.toLowerCase().includes(searchQuery))
      .sort((a, b) => b.commissionAmount - a.commissionAmount);

    const totalCommission = rows.reduce((sum, row) => sum + row.commissionAmount, 0);

    return NextResponse.json({
      period: {
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        label: period.label,
      },
      totals: {
        totalCommission: Number(totalCommission.toFixed(2)),
      },
      rows,
    });
  } catch (error) {
    console.error("Failed to load commission summary", error);
    return NextResponse.json({ error: "Failed to load commission summary." }, { status: 500 });
  }
}
