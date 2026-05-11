import { useQuery } from "@tanstack/react-query";

export interface TodayKpis {
  todaySales: number;
  todayCustomers: number;
  todayCollections: number;
  allInvoiceBalances: number;
  todayInvoices: number;
}

export interface TodayInvoiceRow {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  repName: string;
  totalAmount: number;
  balanceAmount: number;
  status: string;
}

export interface TodayReceiptRow {
  id: number;
  receiptDate: string;
  receiptNo: string;
  invoiceNo: string;
  customerName: string;
  paymentMethod: string;
  amount: number;
}

export interface TodayActivityRow {
  id: string;
  type: "invoice" | "receipt" | "gin" | "grn" | "sales_return" | "credit_note";
  refNo: string;
  title: string;
  subtitle: string;
  amount: number | null;
  occurredAt: string;
}

export interface TodayDashboardData {
  kpis: TodayKpis;
  invoicesToday: TodayInvoiceRow[];
  receiptsToday: TodayReceiptRow[];
  activitiesToday: TodayActivityRow[];
}

async function fetchTodayDashboard(): Promise<TodayDashboardData> {
  const res = await fetch("/api/dashboard/today");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to load dashboard.");
  }
  return (await res.json()) as TodayDashboardData;
}

export function useTodayDashboard() {
  return useQuery<TodayDashboardData>({
    queryKey: ["dashboard-today"],
    queryFn: fetchTodayDashboard,
    staleTime: 60 * 1000,
    retry: 2,
  });
}
