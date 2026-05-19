import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PeriodType = "daily" | "monthly" | "yearly" | "custom";
type Risk = "all" | "clear" | "watch" | "overdue" | "inactive";

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
    return { startDate: start, endDate: end, label: start.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) };
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
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid custom dates.");
  }
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
    const risk = (search.get("risk") ?? "all") as Risk;
    const safeRisk: Risk = ["all", "clear", "watch", "overdue", "inactive"].includes(risk) ? risk : "all";
    const query = (search.get("search") ?? "").trim().toLowerCase();

    const [periodInvoices, openInvoices, periodReceipts] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          is_active: true,
          invoice_date: { gte: period.startDate, lte: period.endDate },
          ...(repId ? { rep_id: repId } : {}),
        },
        select: {
          invoice_id: true,
          customer_id: true,
          invoice_date: true,
          total_amount: true,
          credited_amount: true,
        },
      }),
      prisma.invoice.findMany({
        where: {
          is_active: true,
          balance_amount: { gt: 0 },
          invoice_date: { gte: period.startDate, lte: period.endDate },
          ...(repId ? { rep_id: repId } : {}),
        },
        select: {
          customer_id: true,
          invoice_date: true,
          balance_amount: true,
        },
      }),
      prisma.receipt.findMany({
        where: {
          is_active: true,
          is_returned: false,
          receipt_date: { gte: period.startDate, lte: period.endDate },
          invoice: repId ? { rep_id: repId } : undefined,
        },
        select: {
          amount: true,
          receipt_date: true,
          invoice: { select: { customer_id: true, invoice_date: true } },
        },
      }),
    ]);

    const relevantCustomerIds = Array.from(
      new Set([
        ...periodInvoices.map((i) => i.customer_id),
        ...openInvoices.map((i) => i.customer_id),
        ...periodReceipts.map((r) => r.invoice.customer_id),
      ]),
    );

    const customers =
      relevantCustomerIds.length === 0
        ? []
        : await prisma.customer.findMany({
            where: {
              customer_id: { in: relevantCustomerIds },
              ...(repId ? { assigned_rep_id: repId } : {}),
            },
            select: {
              customer_id: true,
              name: true,
              phone: true,
              assigned_rep: { select: { full_name: true } },
            },
          });
    const now = new Date();
    const customerRows = customers.map((c) => {
      const invoices = periodInvoices.filter((i) => i.customer_id === c.customer_id);
      const open = openInvoices.filter((i) => i.customer_id === c.customer_id);
      const receipts = periodReceipts.filter((r) => r.invoice.customer_id === c.customer_id);

      const netSales = invoices.reduce((s, i) => s + (toNum(i.total_amount) - toNum(i.credited_amount)), 0);
      const collections = receipts.reduce((s, r) => s + toNum(r.amount), 0);
      const outstanding = open.reduce((s, i) => s + toNum(i.balance_amount), 0);
      const oldestOpen = open.length
        ? open.reduce((min, i) => (i.invoice_date < min ? i.invoice_date : min), open[0].invoice_date)
        : null;
      const daysOutstanding = oldestOpen ? Math.max(0, Math.floor((now.getTime() - oldestOpen.getTime()) / DAY_MS)) : 0;
      const overdueAmount = open
        .filter((i) => Math.floor((now.getTime() - i.invoice_date.getTime()) / DAY_MS) > 30)
        .reduce((s, i) => s + toNum(i.balance_amount), 0);
      const lastPurchase = invoices.length
        ? invoices.reduce((max, i) => (i.invoice_date > max ? i.invoice_date : max), invoices[0].invoice_date)
        : null;
      const inactiveDays = lastPurchase ? Math.floor((now.getTime() - lastPurchase.getTime()) / DAY_MS) : 9999;
      const riskStatus: Exclude<Risk, "all"> =
        overdueAmount > 0 ? "overdue" : inactiveDays > 60 ? "inactive" : outstanding > 0 ? "watch" : "clear";

      return {
        customerId: c.customer_id,
        name: c.name,
        phone: c.phone,
        salesRep: c.assigned_rep?.full_name ?? null,
        netSales: Number(netSales.toFixed(2)),
        collections: Number(collections.toFixed(2)),
        outstanding: Number(outstanding.toFixed(2)),
        overdueAmount: Number(overdueAmount.toFixed(2)),
        oldestOpenInvoiceDate: oldestOpen ? oldestOpen.toISOString() : null,
        daysOutstanding,
        lastPurchaseDate: lastPurchase ? lastPurchase.toISOString() : null,
        invoiceCount: invoices.length,
        riskStatus,
      };
    });

    const filtered = customerRows.filter((row) => {
      if (safeRisk !== "all" && row.riskStatus !== safeRisk) return false;
      if (!query) return true;
      return (
        row.name.toLowerCase().includes(query) ||
        (row.phone ?? "").toLowerCase().includes(query) ||
        (row.salesRep ?? "").toLowerCase().includes(query)
      );
    });

    const totals = filtered.reduce(
      (acc, row) => {
        acc.netSales += row.netSales;
        acc.collections += row.collections;
        acc.outstanding += row.outstanding;
        acc.overdueAmount += row.overdueAmount;
        if (row.invoiceCount > 0) acc.activeCustomers += 1;
        return acc;
      },
      {
        netSales: 0,
        collections: 0,
        outstanding: 0,
        overdueAmount: 0,
        activeCustomers: 0,
      },
    );

    const aging = [
      { bucket: "0-30", amount: 0 },
      { bucket: "31-60", amount: 0 },
      { bucket: "61-90", amount: 0 },
      { bucket: "90+", amount: 0 },
    ];
    for (const inv of openInvoices) {
      const days = Math.floor((now.getTime() - inv.invoice_date.getTime()) / DAY_MS);
      const amt = toNum(inv.balance_amount);
      if (days <= 30) aging[0].amount += amt;
      else if (days <= 60) aging[1].amount += amt;
      else if (days <= 90) aging[2].amount += amt;
      else aging[3].amount += amt;
    }

    const dayMap = new Map<string, { sales: number; collections: number }>();
    for (let cursor = new Date(period.startDate); cursor <= period.endDate; cursor = new Date(cursor.getTime() + DAY_MS)) {
      const key = cursor.toISOString().slice(0, 10);
      dayMap.set(key, { sales: 0, collections: 0 });
    }
    for (const inv of periodInvoices) {
      const key = inv.invoice_date.toISOString().slice(0, 10);
      const row = dayMap.get(key);
      if (row) row.sales += toNum(inv.total_amount) - toNum(inv.credited_amount);
    }
    let weightedDays = 0;
    let weightedAmount = 0;
    for (const rec of periodReceipts) {
      const key = rec.receipt_date.toISOString().slice(0, 10);
      const row = dayMap.get(key);
      const amt = toNum(rec.amount);
      if (row) row.collections += amt;
      const days = Math.max(0, Math.floor((rec.receipt_date.getTime() - rec.invoice.invoice_date.getTime()) / DAY_MS));
      weightedDays += days * amt;
      weightedAmount += amt;
    }

    const trend = Array.from(dayMap.entries()).map(([key, v]) => ({
      label: new Date(key).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      sales: Number(v.sales.toFixed(2)),
      collections: Number(v.collections.toFixed(2)),
    }));

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
        avgCollectionDays: weightedAmount > 0 ? Number((weightedDays / weightedAmount).toFixed(1)) : null,
      },
      trend,
      aging: aging.map((a) => ({ ...a, amount: Number(a.amount.toFixed(2)) })),
      customers: filtered.sort((a, b) => b.netSales - a.netSales),
    });
  } catch (error) {
    console.error("Failed to load customer sales", error);
    const message = error instanceof Error ? error.message : "Failed to load customer sales.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
