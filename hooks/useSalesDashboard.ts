// hooks/useSalesDashboard.ts
// React Query hook for the Sales & Revenue tab.
// Fetches /api/customer-sales with date range params.

import { useQuery } from "@tanstack/react-query";

export type DateRange = "this-month" | "last-month" | "this-quarter" | "this-year";

export interface SalesKpis {
  totalSales:        number;
  collections:       number;
  totalOutstanding:  number;
  activeCustomers:   number;
  overdueCustomers:  number;
  newCustomers?:     number;
  salesGrowth?:      number;  // % vs previous period
}

export interface SalesTrendPoint {
  date:        string;
  sales:       number;
  collections: number;
}

export interface SalesByRep {
  rep_id:    number;
  rep_name:  string;
  sales:     number;
  collected: number;
}

export interface TopCustomer {
  customer_id:         number;
  name:                string;
  total_sales:         number;
  outstanding_balance: number;
  invoice_count:       number;
}

export interface CustomerSegments {
  active:   number;
  inactive: number;
  new:      number;
}

export interface OverdueCustomer {
  customer_id:  number;
  name:         string;
  rep_name:     string;
  outstanding:  number;
  days_overdue: number;
}

export interface SalesDashboardData {
  kpis:              SalesKpis;
  salesTrend:        SalesTrendPoint[];
  salesByRep:        SalesByRep[];
  topCustomers:      TopCustomer[];
  customerSegments:  CustomerSegments;
  overdueCustomers:  OverdueCustomer[];
}

type RawCustomer = {
  customerId?: number;
  name?: string;
  salesRep?: string | null;
  netSales?: number;
  collections?: number;
  outstanding?: number;
  overdueAmount?: number;
  invoiceCount?: number;
  riskStatus?: string;
  daysOutstanding?: number;
};

type RawTrendPoint = {
  label?: string;
  sales?: number;
  collections?: number;
};

function getDateRange(range: DateRange): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (range === "this-month") {
    return {
      from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
      to:   fmt(now),
    };
  }
  if (range === "last-month") {
    return {
      from: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to:   fmt(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (range === "this-quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return {
      from: fmt(new Date(now.getFullYear(), q * 3, 1)),
      to:   fmt(now),
    };
  }
  // this-year
  return {
    from: fmt(new Date(now.getFullYear(), 0, 1)),
    to:   fmt(now),
  };
}

async function fetchSalesDashboard(range: DateRange): Promise<SalesDashboardData> {
  const { from, to } = getDateRange(range);
  const url = `/api/customer-sales?from=${from}&to=${to}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to fetch sales data");
  }
  const raw = await res.json();

  // Already in expected dashboard shape.
  if (raw?.kpis) return raw as SalesDashboardData;

  // Normalize /api/customer-sales payload shape to dashboard shape.
  const customers: RawCustomer[] = Array.isArray(raw?.customers) ? raw.customers : [];
  const totals = raw?.totals ?? {};
  const trend: RawTrendPoint[] = Array.isArray(raw?.trend) ? raw.trend : [];

  const repMap = new Map<number, SalesByRep>();
  for (const c of customers) {
    const repName = String(c?.salesRep ?? "Unassigned");
    const key = repName
      .split("")
      .reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0);
    const sales = Number(c?.netSales ?? 0);
    const collected = Number(c?.collections ?? 0);
    const existing = repMap.get(key);
    if (existing) {
      existing.sales += sales;
      existing.collected += collected;
    } else {
      repMap.set(key, {
        rep_id: key,
        rep_name: repName,
        sales,
        collected,
      });
    }
  }

  const topCustomers: TopCustomer[] = customers
    .map((c) => ({
      customer_id: Number(c?.customerId ?? 0),
      name: String(c?.name ?? "-"),
      total_sales: Number(c?.netSales ?? 0),
      outstanding_balance: Number(c?.outstanding ?? 0),
      invoice_count: Number(c?.invoiceCount ?? 0),
    }))
    .sort((a, b) => b.total_sales - a.total_sales);

  const overdueCustomers: OverdueCustomer[] = customers
    .filter((c) => Number(c?.overdueAmount ?? 0) > 0)
    .map((c) => ({
      customer_id: Number(c?.customerId ?? 0),
      name: String(c?.name ?? "-"),
      rep_name: String(c?.salesRep ?? "Unassigned"),
      outstanding: Number(c?.overdueAmount ?? 0),
      days_overdue: Number(c?.daysOutstanding ?? 0),
    }))
    .sort((a, b) => b.days_overdue - a.days_overdue);

  const customerSegments: CustomerSegments = {
    active: customers.filter((c) => Number(c?.invoiceCount ?? 0) > 0).length,
    new: customers.filter((c) => {
      const invoiceCount = Number(c?.invoiceCount ?? 0);
      const risk = String(c?.riskStatus ?? "");
      return invoiceCount > 0 && risk !== "inactive";
    }).length,
    inactive: customers.filter((c) => String(c?.riskStatus ?? "") === "inactive").length,
  };

  const normalized: SalesDashboardData = {
    kpis: {
      totalSales: Number(totals?.netSales ?? 0),
      collections: Number(totals?.collections ?? 0),
      totalOutstanding: Number(totals?.outstanding ?? 0),
      activeCustomers: Number(totals?.activeCustomers ?? 0),
      overdueCustomers: overdueCustomers.length,
      newCustomers: customerSegments.new,
      salesGrowth: 0,
    },
    salesTrend: trend.map((t) => ({
      date: String(t?.label ?? ""),
      sales: Number(t?.sales ?? 0),
      collections: Number(t?.collections ?? 0),
    })),
    salesByRep: Array.from(repMap.values()).sort((a, b) => b.sales - a.sales),
    topCustomers,
    customerSegments,
    overdueCustomers,
  };

  return normalized;
}

export function useSalesDashboard(range: DateRange) {
  return useQuery<SalesDashboardData>({
    queryKey: ["sales-dashboard", range],
    queryFn:  () => fetchSalesDashboard(range),
    staleTime: 5 * 60 * 1000,   // 5 minutes
    retry: 2,
  });
}

// Export the date range helper so other hooks can use it
export { getDateRange };
