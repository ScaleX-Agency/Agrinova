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
  return res.json();
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
