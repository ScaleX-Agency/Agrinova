import { NextResponse } from "next/server";
import { InvoiceStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type DatePreset = "today" | "month" | "custom";

const DAY_MS = 24 * 60 * 60 * 1000;

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

function diffInDays(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

function toAmount(value: number | string | { toString(): string }) {
  return Number(value);
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

function makeTrendBuckets(start: Date, end: Date) {
  const buckets: Array<{
    key: string;
    label: string;
    currentSales: number;
    previousSales: number;
  }> = [];

  for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + DAY_MS)) {
    const key = cursor.toISOString().slice(0, 10);
    const label = cursor.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
    buckets.push({ key, label, currentSales: 0, previousSales: 0 });
  }

  return buckets;
}

function canAccessDashboard(roleName?: string) {
  const role = roleName?.toLowerCase();
  return role === "admin" || role === "operator";
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessDashboard(currentUser.role?.role_name)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const datePreset = parseDatePreset(url.searchParams.get("datePreset"));
    const currentRange = getCurrentRange(
      datePreset,
      url.searchParams.get("customStart"),
      url.searchParams.get("customEnd"),
    );
    const periodDays = diffInDays(currentRange.start, currentRange.end);

    const previousEnd = endOfDay(new Date(currentRange.start.getTime() - DAY_MS));
    const previousStart = startOfDay(new Date(previousEnd.getTime() - (periodDays - 1) * DAY_MS));

    const rangeInvoices = await 
      prisma.invoice.findMany({
        where: {
          invoice_date: {
            gte: previousStart,
            lte: currentRange.end,
          },
        },
        select: {
          invoice_id: true,
          customer_id: true,
          rep_id: true,
          invoice_date: true,
          total_amount: true,
          status: true,
          customer: {
            select: {
              name: true,
            },
          },
          rep: {
            select: {
              full_name: true,
            },
          },
          receipts: {
            select: {
              receipt_date: true,
              amount_received: true,
            },
          },
        },
      });

      const openInvoices = await prisma.invoice.findMany({
        where: {
          status: {
            in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE],
          },
        },
        select: {
          invoice_id: true,
          customer_id: true,
          invoice_date: true,
          total_amount: true,
          customer: {
            select: {
              name: true,
              assigned_rep: {
                select: {
                  full_name: true,
                },
              },
            },
          },
          receipts: {
            select: {
              amount_received: true,
            },
          },
        },
      });

      const allCustomers = await prisma.customer.findMany({
        select: {
          customer_id: true,
          created_at: true,
        },
      });

      const recentInvoiceCustomers = await prisma.invoice.findMany({
        where: {
          invoice_date: {
            gte: startOfDay(new Date(currentRange.end.getTime() - 30 * DAY_MS)),
            lte: currentRange.end,
          },
        },
        distinct: ["customer_id"],
        select: {
          customer_id: true,
        },
      });

      const receiptsThisPeriod = await prisma.receipt.aggregate({
        where: {
          receipt_date: {
            gte: currentRange.start,
            lte: currentRange.end,
          },
        },
        _sum: {
          amount_received: true,
        },
      });


    const currentInvoices = rangeInvoices.filter((invoice) => invoice.invoice_date >= currentRange.start);
    const previousInvoices = rangeInvoices.filter((invoice) => invoice.invoice_date < currentRange.start);

    const totalSalesThisPeriod = currentInvoices.reduce(
      (sum, invoice) => sum + toAmount(invoice.total_amount),
      0,
    );

    const collectionsThisPeriod = toAmount(receiptsThisPeriod._sum.amount_received ?? 0);

    const topCustomerMap = new Map<
      number,
      {
        customerId: number;
        customerName: string;
        salesRep: string;
        totalSales: number;
        outstanding: number;
        lastPurchaseDate: Date;
      }
    >();

    for (const invoice of currentInvoices) {
      const total = toAmount(invoice.total_amount);
      const paid = invoice.receipts.reduce((sum, receipt) => sum + toAmount(receipt.amount_received), 0);
      const outstanding = Math.max(0, total - paid);

      const entry = topCustomerMap.get(invoice.customer_id) ?? {
        customerId: invoice.customer_id,
        customerName: invoice.customer.name,
        salesRep: invoice.rep.full_name,
        totalSales: 0,
        outstanding: 0,
        lastPurchaseDate: invoice.invoice_date,
      };

      entry.totalSales += total;
      entry.outstanding += outstanding;
      entry.salesRep = invoice.rep.full_name;
      if (invoice.invoice_date > entry.lastPurchaseDate) {
        entry.lastPurchaseDate = invoice.invoice_date;
      }
      topCustomerMap.set(invoice.customer_id, entry);
    }

    const topCustomers = Array.from(topCustomerMap.values())
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 8)
      .map((item) => ({
        ...item,
        lastPurchaseDate: item.lastPurchaseDate.toISOString(),
      }));

    const overdueByCustomer = new Map<
      number,
      {
        customerId: number;
        customerName: string;
        salesRep: string;
        outstanding: number;
        daysOverdue: number;
      }
    >();

    let totalOutstanding = 0;
    for (const invoice of openInvoices) {
      const total = toAmount(invoice.total_amount);
      const paid = invoice.receipts.reduce((sum, receipt) => sum + toAmount(receipt.amount_received), 0);
      const outstanding = Math.max(0, total - paid);
      if (outstanding <= 0) continue;

      totalOutstanding += outstanding;

      const daysOverdue = Math.max(0, Math.floor((currentRange.end.getTime() - invoice.invoice_date.getTime()) / DAY_MS));
      if (daysOverdue < 31) continue;

      const entry = overdueByCustomer.get(invoice.customer_id) ?? {
        customerId: invoice.customer_id,
        customerName: invoice.customer.name,
        salesRep: invoice.customer.assigned_rep?.full_name ?? "Unassigned",
        outstanding: 0,
        daysOverdue: 0,
      };

      entry.outstanding += outstanding;
      entry.daysOverdue = Math.max(entry.daysOverdue, daysOverdue);
      overdueByCustomer.set(invoice.customer_id, entry);
    }

    const overdueCustomers = Array.from(overdueByCustomer.values()).sort(
      (a, b) => b.daysOverdue - a.daysOverdue || b.outstanding - a.outstanding,
    );

    const salesByRepMap = new Map<
      number,
      {
        repId: number;
        repName: string;
        totalSales: number;
        collections: number;
      }
    >();

    for (const invoice of currentInvoices) {
      const repEntry = salesByRepMap.get(invoice.rep_id) ?? {
        repId: invoice.rep_id,
        repName: invoice.rep.full_name,
        totalSales: 0,
        collections: 0,
      };

      repEntry.totalSales += toAmount(invoice.total_amount);
      repEntry.collections += invoice.receipts
        .filter(
          (receipt) =>
            receipt.receipt_date >= currentRange.start && receipt.receipt_date <= currentRange.end,
        )
        .reduce((sum, receipt) => sum + toAmount(receipt.amount_received), 0);

      salesByRepMap.set(invoice.rep_id, repEntry);
    }

    const salesByRep = Array.from(salesByRepMap.values()).sort(
      (a, b) => b.totalSales - a.totalSales,
    );

    const buckets = makeTrendBuckets(currentRange.start, currentRange.end);
    const bucketIndex = new Map<string, number>();
    for (let i = 0; i < buckets.length; i += 1) {
      bucketIndex.set(buckets[i].key, i);
    }

    for (const invoice of currentInvoices) {
      const key = invoice.invoice_date.toISOString().slice(0, 10);
      const index = bucketIndex.get(key);
      if (index === undefined) continue;
      buckets[index].currentSales += toAmount(invoice.total_amount);
    }

    for (const invoice of previousInvoices) {
      const shiftedDate = new Date(invoice.invoice_date.getTime() + periodDays * DAY_MS);
      const key = shiftedDate.toISOString().slice(0, 10);
      const index = bucketIndex.get(key);
      if (index === undefined) continue;
      buckets[index].previousSales += toAmount(invoice.total_amount);
    }

    const trend = buckets.map((bucket) => ({
      label: bucket.label,
      currentSales: Number(bucket.currentSales.toFixed(2)),
      previousSales: Number(bucket.previousSales.toFixed(2)),
    }));

    const recentBuyerIds = new Set(recentInvoiceCustomers.map((item) => item.customer_id));
    const recentCutoff = startOfDay(new Date(currentRange.end.getTime() - 30 * DAY_MS));

    let newCount = 0;
    let activeCount = 0;
    let inactiveCount = 0;

    for (const customer of allCustomers) {
      if (customer.created_at >= recentCutoff) {
        newCount += 1;
      } else if (recentBuyerIds.has(customer.customer_id)) {
        activeCount += 1;
      } else {
        inactiveCount += 1;
      }
    }

    return NextResponse.json({
      period: {
        key: currentRange.key,
        label: currentRange.label,
        startDate: currentRange.start.toISOString(),
        endDate: currentRange.end.toISOString(),
      },
      kpis: {
        totalSales: Number(totalSalesThisPeriod.toFixed(2)),
        totalOutstanding: Number(totalOutstanding.toFixed(2)),
        collections: Number(collectionsThisPeriod.toFixed(2)),
        activeCustomers: recentBuyerIds.size,
        overdueCustomers: overdueCustomers.length,
      },
      salesTrend: trend,
      outstandingVsCollections: {
        outstanding: Number(totalOutstanding.toFixed(2)),
        collected: Number(collectionsThisPeriod.toFixed(2)),
      },
      topCustomers,
      overdueCustomers,
      salesByRep,
      customerSegments: [
        { label: "Active", value: activeCount },
        { label: "Inactive", value: inactiveCount },
        { label: "New", value: newCount },
      ],
      summary: {
        previousPeriodSales: Number(
          previousInvoices
            .reduce((sum, invoice) => sum + toAmount(invoice.total_amount), 0)
            .toFixed(2),
        ),
      },
    });
  } catch (error) {
    console.error("Failed to build customer sales dashboard", error);
    return NextResponse.json(
      { error: "Failed to load customer sales dashboard." },
      { status: 500 },
    );
  }
}
