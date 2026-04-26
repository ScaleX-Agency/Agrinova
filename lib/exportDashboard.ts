// lib/exportDashboard.ts
// Exports the sales dashboard data as a multi-sheet .xlsx file.
// Uses the `xlsx` package (already installed as a dependency).

import * as XLSX from "xlsx";
import type { SalesDashboardData, DateRange } from "@/hooks/useSalesDashboard";

function fmtNum(n: number): string {
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function exportDashboardReport(
  data: SalesDashboardData,
  range: DateRange
): Promise<void> {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: KPIs ──────────────────────────────────────────
  const kpiRows = [
    ["Metric", "Value"],
    ["Total Sales (LKR)",         fmtNum(data.kpis.totalSales)],
    ["Collections (LKR)",         fmtNum(data.kpis.collections)],
    ["Total Outstanding (LKR)",   fmtNum(data.kpis.totalOutstanding)],
    ["Active Customers",          String(data.kpis.activeCustomers)],
    ["Overdue Customers",         String(data.kpis.overdueCustomers)],
    ["New Customers",             String(data.kpis.newCustomers ?? 0)],
  ];
  const wsKpi = XLSX.utils.aoa_to_sheet(kpiRows);
  wsKpi["!cols"] = [{ wch: 28 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsKpi, "KPIs");

  // ── Sheet 2: Sales Trend ───────────────────────────────────
  const trendRows = [
    ["Date", "Sales (LKR)", "Collections (LKR)"],
    ...data.salesTrend.map((r) => [r.date, fmtNum(r.sales), fmtNum(r.collections)]),
  ];
  const wsTrend = XLSX.utils.aoa_to_sheet(trendRows);
  wsTrend["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsTrend, "Sales Trend");

  // ── Sheet 3: Rep Performance ───────────────────────────────
  const repRows = [
    ["Sales Rep", "Total Sales (LKR)", "Collected (LKR)", "Collection Rate"],
    ...data.salesByRep.map((r) => {
      const rate = r.sales > 0 ? ((r.collected / r.sales) * 100).toFixed(1) + "%" : "0%";
      return [r.rep_name, fmtNum(r.sales), fmtNum(r.collected), rate];
    }),
  ];
  const wsRep = XLSX.utils.aoa_to_sheet(repRows);
  wsRep["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsRep, "Rep Performance");

  // ── Sheet 4: Top Customers ─────────────────────────────────
  const custRows = [
    ["Customer", "Total Sales (LKR)", "Outstanding (LKR)", "Invoices"],
    ...data.topCustomers.map((c) => [
      c.name, fmtNum(c.total_sales), fmtNum(c.outstanding_balance), String(c.invoice_count),
    ]),
  ];
  const wsCust = XLSX.utils.aoa_to_sheet(custRows);
  wsCust["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 20 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsCust, "Top Customers");

  // ── Sheet 5: Overdue Balances ──────────────────────────────
  const overdueRows = [
    ["Customer", "Sales Rep", "Outstanding (LKR)", "Days Overdue"],
    ...data.overdueCustomers.map((c) => [
      c.name, c.rep_name, fmtNum(c.outstanding), String(c.days_overdue),
    ]),
  ];
  const wsOverdue = XLSX.utils.aoa_to_sheet(overdueRows);
  wsOverdue["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 20 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsOverdue, "Overdue Balances");

  // ── Write file ─────────────────────────────────────────────
  const today    = new Date().toISOString().split("T")[0];
  const filename = `agrinova-dashboard-${range}-${today}.xlsx`;
  XLSX.writeFile(wb, filename);
}
