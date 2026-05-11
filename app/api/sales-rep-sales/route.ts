import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PeriodType = "daily" | "monthly" | "yearly" | "custom";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function toNum(value: number | string | { toString(): string } | null | undefined) {
  return Number(value ?? 0);
}

function canAccess(roleName?: string) {
  const role = roleName?.toLowerCase();
  return role === "admin" || role === "operator";
}

function parsePeriod(search: URLSearchParams) {
  const now = new Date();
  const periodTypeRaw = search.get("periodType");
  const periodType: PeriodType =
    periodTypeRaw === "daily" ||
    periodTypeRaw === "monthly" ||
    periodTypeRaw === "yearly" ||
    periodTypeRaw === "custom"
      ? periodTypeRaw
      : "monthly";

  if (periodType === "daily") {
    const raw = search.get("date");
    const base = raw ? new Date(raw) : now;
    if (Number.isNaN(base.getTime())) throw new Error("Invalid date. Use YYYY-MM-DD.");
    return {
      startDate: startOfDay(base),
      endDate: endOfDay(base),
      label: base.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      periodType,
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
      periodType,
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
      periodType,
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
    periodType,
  };
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(currentUser.role?.role_name)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const search = new URL(request.url).searchParams;
    const period = parsePeriod(search);

    const repIdRaw = search.get("repId");
    const repId = repIdRaw && repIdRaw !== "all" ? Number(repIdRaw) : null;
    if (repIdRaw && repIdRaw !== "all" && (!Number.isInteger(repId) || (repId as number) <= 0)) {
      return NextResponse.json({ error: "Invalid repId." }, { status: 400 });
    }

    const locationIdRaw = search.get("locationId");
    const locationId = locationIdRaw && locationIdRaw !== "all" ? Number(locationIdRaw) : null;
    if (locationIdRaw && locationIdRaw !== "all" && (!Number.isInteger(locationId) || (locationId as number) <= 0)) {
      return NextResponse.json({ error: "Invalid locationId." }, { status: 400 });
    }

    const searchQuery = (search.get("search") ?? "").trim().toLowerCase();
    const now = new Date();

    const invoiceWhere = {
      is_active: true,
      ...(repId ? { rep_id: repId } : {}),
      ...(locationId ? { location_id: locationId } : {}),
    };

    const [reps, allInvoices, periodInvoices, periodReceipts, pendingRows] = await Promise.all([
      prisma.salesRep.findMany({
        where: repId ? { rep_id: repId } : undefined,
        select: {
          rep_id: true,
          full_name: true,
          phone: true,
          _count: { select: { customers: true } },
        },
        orderBy: { full_name: "asc" },
      }),
      prisma.invoice.findMany({
        where: invoiceWhere,
        select: {
          invoice_id: true,
          rep_id: true,
          customer_id: true,
          invoice_date: true,
          total_amount: true,
          credited_amount: true,
          balance_amount: true,
          payment_status: true,
        },
      }),
      prisma.invoice.findMany({
        where: {
          ...invoiceWhere,
          invoice_date: { gte: period.startDate, lte: period.endDate },
        },
        select: {
          invoice_id: true,
          rep_id: true,
          customer_id: true,
          invoice_date: true,
          total_amount: true,
          credited_amount: true,
        },
      }),
      prisma.receipt.findMany({
        where: {
          is_active: true,
          receipt_date: { gte: period.startDate, lte: period.endDate },
          invoice: {
            ...(repId ? { rep_id: repId } : {}),
            ...(locationId ? { location_id: locationId } : {}),
          },
        },
        select: {
          receipt_id: true,
          amount: true,
          receipt_date: true,
          invoice: {
            select: {
              rep_id: true,
              invoice_date: true,
            },
          },
        },
      }),
      prisma.invoiceSettlement.findMany({
        where: {
          is_active: true,
          commission_issued: false,
          settlement_type: { in: ["RECEIPT", "CREDIT_NOTE"] },
          invoice: {
            ...(repId ? { rep_id: repId } : {}),
            ...(locationId ? { location_id: locationId } : {}),
          },
        },
        select: {
          invoice: { select: { rep_id: true } },
          amount: true,
          settlement_type: true,
        },
      }),
    ]);

    const pendingByRep = new Map<number, number>();
    for (const row of pendingRows) {
      const signedAmount = row.settlement_type === "CREDIT_NOTE" ? -toNum(row.amount) : toNum(row.amount);
      const existing = pendingByRep.get(row.invoice.rep_id) ?? 0;
      pendingByRep.set(row.invoice.rep_id, existing + signedAmount);
    }

    const repRows = reps
      .map((rep) => {
        const repAllInvoices = allInvoices.filter((i) => i.rep_id === rep.rep_id);
        const repPeriodInvoices = periodInvoices.filter((i) => i.rep_id === rep.rep_id);
        const repReceipts = periodReceipts.filter((r) => r.invoice.rep_id === rep.rep_id);

        const assignedCustomers = rep._count.customers;
        const activeCustomers = new Set(repPeriodInvoices.map((i) => i.customer_id)).size;

        const netSales = repPeriodInvoices.reduce((sum, i) => sum + toNum(i.total_amount) - toNum(i.credited_amount), 0);
        const collections = repReceipts.reduce((sum, r) => sum + toNum(r.amount), 0);
        const outstanding = repAllInvoices.reduce((sum, i) => sum + toNum(i.balance_amount), 0);
        const overdueAmount = repAllInvoices
          .filter((i) => toNum(i.balance_amount) > 0 && Math.floor((now.getTime() - i.invoice_date.getTime()) / DAY_MS) > 65)
          .reduce((sum, i) => sum + toNum(i.balance_amount), 0);

        const oldestOpenInvoice = repAllInvoices
          .filter((i) => toNum(i.balance_amount) > 0)
          .sort((a, b) => a.invoice_date.getTime() - b.invoice_date.getTime())[0];

        const daysOutstanding = oldestOpenInvoice
          ? Math.max(0, Math.floor((now.getTime() - oldestOpenInvoice.invoice_date.getTime()) / DAY_MS))
          : 0;

        const weighted = repReceipts.reduce(
          (acc, r) => {
            const days = Math.max(0, Math.floor((r.receipt_date.getTime() - r.invoice.invoice_date.getTime()) / DAY_MS));
            const amount = toNum(r.amount);
            acc.amount += amount;
            acc.days += amount * days;
            return acc;
          },
          { amount: 0, days: 0 },
        );

        const avgDaysToCollect = weighted.amount > 0 ? weighted.days / weighted.amount : null;
        const collectionRate = netSales > 0 ? (collections / netSales) * 100 : 0;

        let riskStatus: "clear" | "watch" | "overdue";
        if (overdueAmount > 0) riskStatus = "overdue";
        else if (outstanding > 0) riskStatus = "watch";
        else riskStatus = "clear";

        return {
          repId: rep.rep_id,
          repName: rep.full_name,
          phone: rep.phone,
          assignedCustomers,
          activeCustomers,
          invoiceCount: repPeriodInvoices.length,
          netSales: Number(netSales.toFixed(2)),
          collections: Number(collections.toFixed(2)),
          outstanding: Number(outstanding.toFixed(2)),
          overdueAmount: Number(overdueAmount.toFixed(2)),
          oldestOpenInvoiceDate: oldestOpenInvoice ? oldestOpenInvoice.invoice_date.toISOString() : null,
          daysOutstanding,
          collectionRate: Number(collectionRate.toFixed(2)),
          avgDaysToCollect: avgDaysToCollect === null ? null : Number(avgDaysToCollect.toFixed(1)),
          pendingCommission: Number((pendingByRep.get(rep.rep_id) ?? 0).toFixed(2)),
          riskStatus,
        };
      })
      .filter((row) => {
        if (!searchQuery) return true;
        return row.repName.toLowerCase().includes(searchQuery) || (row.phone ?? "").toLowerCase().includes(searchQuery);
      })
      .sort((a, b) => b.netSales - a.netSales);

    const totals = repRows.reduce(
      (acc, row) => {
        acc.netSales += row.netSales;
        acc.collections += row.collections;
        acc.outstanding += row.outstanding;
        acc.overdueAmount += row.overdueAmount;
        acc.activeCustomers += row.activeCustomers;
        acc.pendingCommission += row.pendingCommission;
        acc.invoiceCount += row.invoiceCount;
        return acc;
      },
      {
        netSales: 0,
        collections: 0,
        outstanding: 0,
        overdueAmount: 0,
        activeCustomers: 0,
        pendingCommission: 0,
        invoiceCount: 0,
      },
    );

    const avgDaysCollection = repRows
      .map((r) => r.avgDaysToCollect)
      .filter((v): v is number => v !== null);

    return NextResponse.json({
      period: {
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        label: period.label,
      },
      totals: {
        netSales: Number(totals.netSales.toFixed(2)),
        collections: Number(totals.collections.toFixed(2)),
        outstanding: Number(totals.outstanding.toFixed(2)),
        overdueAmount: Number(totals.overdueAmount.toFixed(2)),
        activeCustomers: totals.activeCustomers,
        avgDaysToCollect:
          avgDaysCollection.length > 0
            ? Number((avgDaysCollection.reduce((sum, v) => sum + v, 0) / avgDaysCollection.length).toFixed(1))
            : null,
        pendingCommission: Number(totals.pendingCommission.toFixed(2)),
        invoiceCount: totals.invoiceCount,
      },
      reps: repRows,
    });
  } catch (error) {
    console.error("Failed to load sales rep sales", error);
    const message = error instanceof Error ? error.message : "Failed to load sales rep sales.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
