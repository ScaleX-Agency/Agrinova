import { NextResponse } from "next/server";
import { InvoiceStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
type DatePreset = "today" | "month" | "custom";

function canAccessDashboard(roleName?: string) {
  const role = roleName?.toLowerCase();
  return role === "admin" || role === "operator";
}

function toAmount(value: number | string | { toString(): string }) {
  return Number(value);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseCustomerId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function parseDatePreset(value: string | null): DatePreset {
  if (value === "today") return "today";
  if (value === "custom") return "custom";
  return "month";
}

function getCurrentRange(
  datePreset: DatePreset,
  customStartRaw: string | null,
  customEndRaw: string | null,
) {
  const now = new Date();
  const end = endOfDay(now);

  if (datePreset === "today") {
    const start = startOfDay(now);
    return { start, end, label: "Today", key: datePreset };
  }

  if (datePreset === "custom" && customStartRaw && customEndRaw) {
    const customStart = new Date(customStartRaw);
    const customEnd = new Date(customEndRaw);

    if (!Number.isNaN(customStart.getTime()) && !Number.isNaN(customEnd.getTime())) {
      const start = startOfDay(customStart);
      const endDate = endOfDay(customEnd);
      if (start <= endDate) {
        return { start, end: endDate, label: "Custom", key: datePreset };
      }
    }
  }

  const start = startOfDay(new Date(end.getFullYear(), end.getMonth(), 1));
  return { start, end, label: "This Month", key: "month" as const };
}

function buildLast12Months(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const months: Array<{ key: string; label: string; date: Date }> = [];

  for (let i = 0; i < 12; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
    months.push({
      key: monthKey(date),
      label: date.toLocaleDateString("en-GB", { month: "short" }),
      date,
    });
  }

  return months;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessDashboard(currentUser.role?.role_name)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const customerId = parseCustomerId((await params).customerId);
  if (!customerId) {
    return NextResponse.json({ error: "Invalid customer ID." }, { status: 400 });
  }

  try {
    const url = new URL(req.url);
    const datePreset = parseDatePreset(url.searchParams.get("datePreset"));
    const currentRange = getCurrentRange(
      datePreset,
      url.searchParams.get("customStart"),
      url.searchParams.get("customEnd"),
    );

    const customer = await 
      prisma.customer.findUnique({
        where: { customer_id: customerId },
        select: {
          customer_id: true,
          name: true,
          phone: true,
          assigned_rep: {
            select: {
              rep_id: true,
              full_name: true,
            },
          },
        },
      });

      const invoices = await prisma.invoice.findMany({
        where: { customer_id: customerId, is_active: true },
        orderBy: [{ invoice_date: "desc" }, { invoice_id: "desc" }],
        select: {
          invoice_id: true,
          invoice_number: true,
          invoice_date: true,
          total_amount: true,
          status: true,
          invoice_lines: {
            select: {
              quantity: true,
              line_total: true,
              product: {
                select: {
                  product_id: true,
                  product_name: true,
                },
              },
            },
          },
          receipts: {
            where: { is_active: true },
            orderBy: [{ receipt_date: "desc" }, { receipt_id: "desc" }],
            select: {
              receipt_id: true,
              receipt_date: true,
              amount: true,
              payment_method: true,
            },
          },
        },
      });

      const goodsIssueNotes = await prisma.goodsIssueNote.findMany({
        where: { customer_id: customerId, is_active: true },
        orderBy: [{ gin_date: "desc" }, { gin_id: "desc" }],
        select: {
          gin_id: true,
          gin_number: true,
          gin_date: true,
          invoice: {
            select: {
              total_amount: true,
            },
          },
        },
      });


    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const now = new Date();

    let totalPurchases = 0;
    let totalOutstanding = 0;
    let firstPurchaseDate: Date | null = null;
    let lastPurchaseDate: Date | null = null;

    const aging = {
      bucket0to30: 0,
      bucket31to60: 0,
      bucket61to90: 0,
      bucket90plus: 0,
    };

    const productMap = new Map<
      number,
      {
        productId: number;
        productName: string;
        quantity: number;
        revenue: number;
      }
    >();

    const invoiceTransactions = invoices.slice(0, 25).map((invoice) => ({
      id: invoice.invoice_id,
      reference: invoice.invoice_number,
      date: invoice.invoice_date.toISOString(),
      amount: toAmount(invoice.total_amount),
      status: invoice.status,
    }));

    const receiptTransactions: Array<{
      id: number;
      reference: string;
      date: string;
      amount: number;
      status: string;
    }> = [];

    for (const invoice of invoices) {
      const invoiceTotal = toAmount(invoice.total_amount);
      totalPurchases += invoiceTotal;

      if (!firstPurchaseDate || invoice.invoice_date < firstPurchaseDate) {
        firstPurchaseDate = invoice.invoice_date;
      }
      if (!lastPurchaseDate || invoice.invoice_date > lastPurchaseDate) {
        lastPurchaseDate = invoice.invoice_date;
      }

      const paid = invoice.receipts.reduce(
        (sum, receipt) => sum + toAmount(receipt.amount),
        0,
      );
      const outstanding = Math.max(0, invoiceTotal - paid);
      totalOutstanding += outstanding;

      if (
        outstanding > 0 &&
        (invoice.status === InvoiceStatus.UNPAID ||
          invoice.status === InvoiceStatus.PARTIAL ||
          invoice.status === InvoiceStatus.OVERDUE)
      ) {
        const days = Math.max(
          0,
          Math.floor((now.getTime() - invoice.invoice_date.getTime()) / DAY_MS),
        );

        if (days <= 30) {
          aging.bucket0to30 += outstanding;
        } else if (days <= 60) {
          aging.bucket31to60 += outstanding;
        } else if (days <= 90) {
          aging.bucket61to90 += outstanding;
        } else {
          aging.bucket90plus += outstanding;
        }
      }

      for (const line of invoice.invoice_lines) {
        const key = line.product.product_id;
        const entry = productMap.get(key) ?? {
          productId: key,
          productName: line.product.product_name,
          quantity: 0,
          revenue: 0,
        };

        entry.quantity += line.quantity;
        entry.revenue += toAmount(line.line_total);
        productMap.set(key, entry);
      }

      for (const receipt of invoice.receipts) {
        receiptTransactions.push({
          id: receipt.receipt_id,
          reference: `RCP-${String(receipt.receipt_id).padStart(4, "0")}`,
          date: receipt.receipt_date.toISOString(),
          amount: toAmount(receipt.amount),
          status: receipt.payment_method,
        });
      }
    }

    receiptTransactions.sort((a, b) => {
      if (a.date === b.date) return b.id - a.id;
      return a.date < b.date ? 1 : -1;
    });

    const ginTransactions = goodsIssueNotes.slice(0, 25).map((note) => ({
      id: note.gin_id,
      reference: note.gin_number,
      date: note.gin_date.toISOString(),
      amount: toAmount(note.invoice.total_amount),
      status: "ISSUED",
    }));

    const months = buildLast12Months(now);
    const monthSummary = new Map<string, { purchases: number; payments: number }>();
    for (const month of months) {
      monthSummary.set(month.key, { purchases: 0, payments: 0 });
    }

    for (const invoice of invoices) {
      const key = monthKey(invoice.invoice_date);
      const summary = monthSummary.get(key);
      if (!summary) continue;

      summary.purchases += toAmount(invoice.total_amount);
      for (const receipt of invoice.receipts) {
        const receiptKey = monthKey(receipt.receipt_date);
        const receiptSummary = monthSummary.get(receiptKey);
        if (!receiptSummary) continue;
        receiptSummary.payments += toAmount(receipt.amount);
      }
    }

    const purchaseTrend = months.map((month) => ({
      label: month.label,
      amount: Number((monthSummary.get(month.key)?.purchases ?? 0).toFixed(2)),
    }));

    const paymentBehavior = months.map((month) => ({
      label: month.label,
      invoices: Number((monthSummary.get(month.key)?.purchases ?? 0).toFixed(2)),
      payments: Number((monthSummary.get(month.key)?.payments ?? 0).toFixed(2)),
    }));

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((item) => ({
        ...item,
        revenue: Number(item.revenue.toFixed(2)),
      }));

    const monthsForAverage = firstPurchaseDate
      ? Math.max(
          1,
          (now.getFullYear() - firstPurchaseDate.getFullYear()) * 12 +
            (now.getMonth() - firstPurchaseDate.getMonth()) +
            1,
        )
      : 1;

    const avgMonthlyPurchase = totalPurchases / monthsForAverage;

    const hasOverdue = invoices.some((invoice) => {
      if (
        !(
          invoice.status === InvoiceStatus.UNPAID ||
          invoice.status === InvoiceStatus.PARTIAL ||
          invoice.status === InvoiceStatus.OVERDUE
        )
      ) {
        return false;
      }
      const invoiceTotal = toAmount(invoice.total_amount);
      const paid = invoice.receipts.reduce(
        (sum, receipt) => sum + toAmount(receipt.amount),
        0,
      );
      const outstanding = Math.max(0, invoiceTotal - paid);
      if (outstanding <= 0) return false;

      const days = Math.max(
        0,
        Math.floor((now.getTime() - invoice.invoice_date.getTime()) / DAY_MS),
      );
      return days > 30;
    });

    const daysSinceLastPurchase = lastPurchaseDate
      ? Math.floor((now.getTime() - lastPurchaseDate.getTime()) / DAY_MS)
      : null;

    const alerts: string[] = [];
    if (hasOverdue) alerts.push("OVERDUE");
    if (daysSinceLastPurchase === null || daysSinceLastPurchase > 30) {
      alerts.push("NO_PURCHASE_30");
    }
    if (totalPurchases >= 500000) alerts.push("HIGH_VALUE");

    let collectedInRange = 0;
    let outstandingInRange = 0;
    for (const invoice of invoices) {
      if (invoice.invoice_date < currentRange.start || invoice.invoice_date > currentRange.end) {
        continue;
      }
      const invoiceTotal = toAmount(invoice.total_amount);
      const paidTotal = invoice.receipts.reduce(
        (sum, receipt) => sum + toAmount(receipt.amount),
        0,
      );
      const outstanding = Math.max(0, invoiceTotal - paidTotal);
      outstandingInRange += outstanding;

      collectedInRange += invoice.receipts
        .filter(
          (receipt) =>
            receipt.receipt_date >= currentRange.start &&
            receipt.receipt_date <= currentRange.end,
        )
        .reduce((sum, receipt) => sum + toAmount(receipt.amount), 0);
    }

    return NextResponse.json({
      period: {
        key: currentRange.key,
        label: currentRange.label,
        startDate: currentRange.start.toISOString(),
        endDate: currentRange.end.toISOString(),
      },
      customer: {
        customerId: customer.customer_id,
        name: customer.name,
        phone: customer.phone,
        assignedRep: customer.assigned_rep,
      },
      kpis: {
        totalPurchases: Number(totalPurchases.toFixed(2)),
        outstandingBalance: Number(totalOutstanding.toFixed(2)),
        lastPurchaseDate: lastPurchaseDate ? lastPurchaseDate.toISOString() : null,
        avgMonthlyPurchase: Number(avgMonthlyPurchase.toFixed(2)),
      },
      purchaseTrend,
      paymentBehavior,
      agingAnalysis: [
        { label: "0-30 Days", amount: Number(aging.bucket0to30.toFixed(2)) },
        { label: "31-60 Days", amount: Number(aging.bucket31to60.toFixed(2)) },
        { label: "61-90 Days", amount: Number(aging.bucket61to90.toFixed(2)) },
        { label: "90+ Days", amount: Number(aging.bucket90plus.toFixed(2)) },
      ],
      topProducts,
      transactions: {
        invoices: invoiceTransactions,
        receipts: receiptTransactions.slice(0, 25),
        goodsIssueNotes: ginTransactions,
      },
      cashBreakdown: {
        collected: Number(collectedInRange.toFixed(2)),
        outstanding: Number(outstandingInRange.toFixed(2)),
      },
      alerts,
    });
  } catch (error) {
    console.error("Failed to load customer sales detail", error);
    return NextResponse.json(
      { error: "Failed to load customer sales detail." },
      { status: 500 },
    );
  }
}
