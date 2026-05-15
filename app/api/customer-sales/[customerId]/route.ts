import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PeriodType = "daily" | "monthly" | "yearly" | "custom";
const DAY_MS = 24 * 60 * 60 * 1000;

function toNum(value: number | string | { toString(): string } | null | undefined) {
  return Number(value ?? 0);
}

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
    const base = search.get("date") ? new Date(search.get("date") as string) : now;
    if (Number.isNaN(base.getTime())) throw new Error("Invalid date.");
    return { startDate: startOfDay(base), endDate: endOfDay(base), label: base.toLocaleDateString("en-GB") };
  }
  if (periodType === "monthly") {
    const raw = search.get("month");
    const m = raw?.match(/^(\d{4})-(\d{2})$/);
    const year = m ? Number(m[1]) : now.getFullYear();
    const month = m ? Number(m[2]) - 1 : now.getMonth();
    return {
      startDate: startOfDay(new Date(year, month, 1)),
      endDate: endOfDay(new Date(year, month + 1, 0)),
      label: new Date(year, month, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
    };
  }
  if (periodType === "yearly") {
    const year = search.get("year") ? Number(search.get("year")) : now.getFullYear();
    return {
      startDate: startOfDay(new Date(year, 0, 1)),
      endDate: endOfDay(new Date(year, 11, 31)),
      label: String(year),
    };
  }
  const from = new Date(search.get("from") || "");
  const to = new Date(search.get("to") || "");
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(currentUser.role?.role_name)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const customerId = Number((await params).customerId);
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return NextResponse.json({ error: "Invalid customerId." }, { status: 400 });
  }

  try {
    const search = new URL(request.url).searchParams;
    const period = parsePeriod(search);
    const now = new Date();

    const customer = await prisma.customer.findUnique({
      where: { customer_id: customerId },
      select: {
        customer_id: true,
        name: true,
        phone: true,
        address: true,
        assigned_rep: { select: { full_name: true } },
      },
    });
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

    const [allInvoices, periodInvoices, periodReceipts, periodReturns, periodCreditNotes] = await Promise.all([
      prisma.invoice.findMany({
        where: { customer_id: customerId, is_active: true },
        select: {
          invoice_id: true,
          invoice_number: true,
          invoice_date: true,
          total_amount: true,
          paid_amount: true,
          credited_amount: true,
          balance_amount: true,
          payment_status: true,
        },
      }),
      prisma.invoice.findMany({
        where: {
          customer_id: customerId,
          is_active: true,
          invoice_date: { gte: period.startDate, lte: period.endDate },
        },
        include: {
          invoice_lines: {
            select: {
              product_id: true,
              quantity: true,
              net_line_total: true,
              product: { select: { product_code: true, product_name: true } },
            },
          },
        },
      }),
      prisma.receipt.findMany({
        where: {
          is_active: true,
          receipt_date: { gte: period.startDate, lte: period.endDate },
          invoice: { customer_id: customerId },
        },
        select: {
          receipt_id: true,
          receipt_number: true,
          receipt_date: true,
          amount: true,
          payment_method: true,
          invoice: { select: { invoice_id: true, invoice_number: true, invoice_date: true } },
        },
      }),
      prisma.salesReturnNote.findMany({
        where: {
          customer_id: customerId,
          is_active: true,
          return_date: { gte: period.startDate, lte: period.endDate },
        },
        select: {
          return_id: true,
          return_number: true,
          return_date: true,
          total_amount: true,
          lines: {
            select: {
              product_id: true,
              quantity_usable: true,
              quantity_unusable: true,
              line_total: true,
              product: { select: { product_code: true, product_name: true } },
            },
          },
        },
      }),
      prisma.creditNote.findMany({
        where: {
          invoice: { customer_id: customerId },
          is_active: true,
          created_at: { gte: period.startDate, lte: period.endDate },
        },
        select: {
          credit_note_id: true,
          created_at: true,
          amount: true,
        },
      }),
    ]);

    const lifetimeSales = allInvoices.reduce((s, i) => s + toNum(i.total_amount) - toNum(i.credited_amount), 0);
    const netSales = periodInvoices.reduce((s, i) => s + toNum(i.total_amount) - toNum(i.credited_amount), 0);
    const collections = periodReceipts.reduce((s, r) => s + toNum(r.amount), 0);
    const outstanding = periodInvoices.reduce((s, i) => s + toNum(i.balance_amount), 0);
    const overdueAmount = periodInvoices
      .filter((i) => toNum(i.balance_amount) > 0 && Math.floor((now.getTime() - i.invoice_date.getTime()) / DAY_MS) > 30)
      .reduce((s, i) => s + toNum(i.balance_amount), 0);
    const lastPurchaseDate = periodInvoices.length
      ? periodInvoices.reduce((m, i) => (i.invoice_date > m ? i.invoice_date : m), periodInvoices[0].invoice_date)
      : null;

    const aging = {
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
    };
    for (const inv of periodInvoices) {
      const bal = toNum(inv.balance_amount);
      if (bal <= 0) continue;
      const days = Math.floor((now.getTime() - inv.invoice_date.getTime()) / DAY_MS);
      if (days <= 30) aging["0-30"] += bal;
      else if (days <= 60) aging["31-60"] += bal;
      else if (days <= 90) aging["61-90"] += bal;
      else aging["90+"] += bal;
    }

    const productMap = new Map<number, { productId: number; productCode: string; productName: string; quantity: number; netRevenue: number }>();
    for (const inv of periodInvoices) {
      for (const line of inv.invoice_lines) {
        const curr = productMap.get(line.product_id) ?? {
          productId: line.product_id,
          productCode: line.product.product_code,
          productName: line.product.product_name,
          quantity: 0,
          netRevenue: 0,
        };
        curr.quantity += line.quantity;
        curr.netRevenue += toNum(line.net_line_total);
        productMap.set(line.product_id, curr);
      }
    }
    for (const ret of periodReturns) {
      for (const line of ret.lines) {
        const curr = productMap.get(line.product_id) ?? {
          productId: line.product_id,
          productCode: line.product.product_code,
          productName: line.product.product_name,
          quantity: 0,
          netRevenue: 0,
        };
        curr.quantity -= line.quantity_usable + line.quantity_unusable;
        curr.netRevenue -= toNum(line.line_total);
        productMap.set(line.product_id, curr);
      }
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.netRevenue - a.netRevenue)
      .slice(0, 12)
      .map((p) => ({ ...p, netRevenue: Number(p.netRevenue.toFixed(2)) }));

    const openInvoices = periodInvoices
      .filter((i) => toNum(i.balance_amount) > 0)
      .sort((a, b) => a.invoice_date.getTime() - b.invoice_date.getTime())
      .map((i) => ({
        invoiceId: i.invoice_id,
        invoiceNumber: i.invoice_number,
        invoiceDate: i.invoice_date.toISOString(),
        total: Number(toNum(i.total_amount).toFixed(2)),
        paid: Number(toNum(i.paid_amount).toFixed(2)),
        credited: Number(toNum(i.credited_amount).toFixed(2)),
        balance: Number(toNum(i.balance_amount).toFixed(2)),
        daysOutstanding: Math.max(0, Math.floor((now.getTime() - i.invoice_date.getTime()) / DAY_MS)),
        status: i.payment_status,
      }));

    const transactions = [
      ...periodInvoices.map((i) => ({
        type: "invoice" as const,
        id: i.invoice_id,
        reference: i.invoice_number,
        date: i.invoice_date.toISOString(),
        amount: Number((toNum(i.total_amount) - toNum(i.credited_amount)).toFixed(2)),
        status: i.payment_status,
      })),
      ...periodReceipts.map((r) => ({
        type: "receipt" as const,
        id: r.receipt_id,
        reference: r.receipt_number,
        date: r.receipt_date.toISOString(),
        amount: Number(toNum(r.amount).toFixed(2)),
        status: r.payment_method,
      })),
      ...periodReturns.map((r) => ({
        type: "return" as const,
        id: r.return_id,
        reference: r.return_number,
        date: r.return_date.toISOString(),
        amount: Number(toNum(r.total_amount).toFixed(2)),
        status: "RETURNED",
      })),
      ...periodCreditNotes.map((c) => ({
        type: "credit" as const,
        id: c.credit_note_id,
        reference: `CRN-${String(c.credit_note_id).padStart(4, "0")}`,
        date: c.created_at.toISOString(),
        amount: Number(toNum(c.amount).toFixed(2)),
        status: "CREDITED",
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const monthMap = new Map<string, { sales: number; collections: number }>();
    for (let c = new Date(period.startDate); c <= period.endDate; c = new Date(c.getTime() + DAY_MS)) {
      const k = c.toISOString().slice(0, 10);
      monthMap.set(k, { sales: 0, collections: 0 });
    }
    for (const i of periodInvoices) {
      const k = i.invoice_date.toISOString().slice(0, 10);
      const row = monthMap.get(k);
      if (row) row.sales += toNum(i.total_amount) - toNum(i.credited_amount);
    }
    let weightedAmount = 0;
    let weightedDays = 0;
    for (const r of periodReceipts) {
      const days = Math.max(0, Math.floor((r.receipt_date.getTime() - r.invoice.invoice_date.getTime()) / DAY_MS));
      const amt = toNum(r.amount);
      weightedAmount += amt;
      weightedDays += amt * days;
    }
    for (const r of periodReceipts) {
      const k = r.receipt_date.toISOString().slice(0, 10);
      const row = monthMap.get(k);
      if (row) row.collections += toNum(r.amount);
    }
    const trend = Array.from(monthMap.entries()).map(([k, v]) => ({
      label: new Date(k).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      sales: Number(v.sales.toFixed(2)),
      collections: Number(v.collections.toFixed(2)),
    }));

    return NextResponse.json({
      customer: {
        customerId: customer.customer_id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        salesRep: customer.assigned_rep?.full_name ?? null,
      },
      period: {
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        label: period.label,
      },
      kpis: {
        lifetimeSales: Number(lifetimeSales.toFixed(2)),
        netSales: Number(netSales.toFixed(2)),
        collections: Number(collections.toFixed(2)),
        outstanding: Number(outstanding.toFixed(2)),
        overdueAmount: Number(overdueAmount.toFixed(2)),
        avgDaysToPay: weightedAmount > 0 ? Number((weightedDays / weightedAmount).toFixed(1)) : null,
        invoiceCount: periodInvoices.length,
        lastPurchaseDate: lastPurchaseDate ? lastPurchaseDate.toISOString() : null,
      },
      trend,
      aging: Object.entries(aging).map(([bucket, amount]) => ({ bucket, amount: Number(amount.toFixed(2)) })),
      topProducts,
      openInvoices,
      transactions,
    });
  } catch (error) {
    console.error("Failed to load customer sales detail", error);
    const message = error instanceof Error ? error.message : "Failed to load customer sales detail.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
