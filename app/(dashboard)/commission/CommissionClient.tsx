"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
  // eslint-disable-next-line
import { Download, Eye, Filter, X } from "lucide-react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import type {
  CommissionReceiptDetailDto,
  CommissionRepDetailResponse,
  CommissionSummaryResponse,
} from "@/types/api";
import DataTable from "@/components/ui/DataTable";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const formatDate = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

type DatePreset = "today" | "month" | "custom";
type SortMode = "highest" | "oldest";
type SalesStatus = "PAID" | "UNPAID" | "OVERDUE";
type DashboardCommissionRow = CommissionReceiptDetailDto & {
  repId: number;
  repName: string;
};

type AccountApiResponse = {
  account: {
    role_name: string;
  };
};

const commissionStatusConfig = {
  PAID: {
    label: "Paid",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  PENDING: {
    label: "Pending",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  OVERDUE: {
    label: "Overdue",
    pill: "bg-red-50 text-red-700 border-red-200",
  },
} as const;

const salesStatusConfig = {
  PAID: {
    label: "Paid",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  UNPAID: {
    label: "Unpaid",
    pill: "bg-rose-50 text-rose-700 border-rose-200",
  },
  OVERDUE: {
    label: "Overdue",
    pill: "bg-red-50 text-red-700 border-red-200",
  },
} as const;

const getSalesStatusForUi = (status: DashboardCommissionRow["salesStatus"]): SalesStatus => {
  if (status === "PARTIAL") {
    return "UNPAID";
  }
  return status;
};

const CommissionClient = () => {
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SalesStatus>("all");
  const [sortMode, setSortMode] = useState<SortMode>("highest");
  const [drillDownRepId, setDrillDownRepId] = useState<number | null>(null);

  const accountQuery = useQuery({
    queryKey: ["account-role"],
    queryFn: async () => {
      const response = await fetch("/api/account", { cache: "no-store" });
      if (!response.ok) return "operator";
      const payload = (await response.json()) as AccountApiResponse;
      return payload.account.role_name.toLowerCase();
    },
  });

  const commissionQuery = useQuery({
    queryKey: ["commission-summary"],
    queryFn: async () => {
      const response = await fetch("/api/commission");
      const result = (await response.json()) as CommissionSummaryResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load commission summary.");
      return result.data;
    },
  });

  const reps = commissionQuery.data?.rows ?? [];

  const detailQueries = useQueries({
    queries: reps.map((rep) => ({
      queryKey: ["commission-detail", rep.repId],
      queryFn: async () => {
        const response = await fetch(`/api/commission/${rep.repId}`);
        const result = (await response.json()) as CommissionRepDetailResponse;
        if (!response.ok) throw new Error(result.error ?? "Failed to load commission detail.");
        return result.data;
      },
      enabled: reps.length > 0,
    })),
  });

  const allRows = useMemo<DashboardCommissionRow[]>(() => {
    const aggregated: DashboardCommissionRow[] = [];
    for (const detailQuery of detailQueries) {
      const data = detailQuery.data;
      if (!data) continue;
      for (const row of data.rows) {
        aggregated.push({
          ...row,
          repId: data.repId,
          repName: data.repName,
        });
      }
    }
    return aggregated;
  }, [detailQueries]);

  const isAllDetailsLoaded = detailQueries.every((detail) => detail.isSuccess || detail.isError);
  const detailError = detailQueries.find((detail) => detail.error instanceof Error)?.error as Error | undefined;

  const isWithinDateFilter = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();

    if (datePreset === "today") {
      return date.toDateString() === now.toDateString();
    }

    if (datePreset === "month") {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }

    if (!customStart || !customEnd) {
      return true;
    }

    const start = new Date(customStart);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  };

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      const rowDate = row.receiptDate ?? row.invoiceDate;
      if (!isWithinDateFilter(rowDate)) return false;
      if (statusFilter !== "all" && getSalesStatusForUi(row.salesStatus) !== statusFilter) return false;
      return true;
    });
  }, [allRows, datePreset, customStart, customEnd, statusFilter]);

  const totals = useMemo(() => {
    const totalCommission = filteredRows.reduce((sum, row) => sum + row.commissionAmount, 0);

    const byRep = new Map<number, { repName: string; totalCommission: number; totalSales: number }>();
    for (const row of filteredRows) {
      const existing = byRep.get(row.repId) ?? {
        repName: row.repName,
        totalCommission: 0,
        totalSales: 0,
      };
      existing.totalCommission += row.commissionAmount;
      existing.totalSales += row.invoiceAmount;
      byRep.set(row.repId, existing);
    }
    const topRep = Array.from(byRep.entries())
      .sort((a, b) => b[1].totalCommission - a[1].totalCommission)
      .at(0);

    return {
      totalCommission,
      topRep,
    };
  }, [filteredRows]);

  const repBarData = useMemo(() => {
    const grouped = new Map<number, { repId: number; repName: string; commission: number; sales: number }>();
    for (const row of filteredRows) {
      const existing = grouped.get(row.repId) ?? {
        repId: row.repId,
        repName: row.repName,
        commission: 0,
        sales: 0,
      };
      existing.commission += row.commissionAmount;
      existing.sales += row.invoiceAmount;
      grouped.set(row.repId, existing);
    }
    return Array.from(grouped.values()).sort((a, b) => b.commission - a.commission);
  }, [filteredRows]);

  const repTableRows = useMemo(() => {
    const grouped = new Map<
      number,
      {
        repId: number;
        repName: string;
        invoices: Set<number>;
        paidInvoices: Set<number>;
        unpaidInvoices: Set<number>;
        overdueInvoices: Set<number>;
        totalSales: number;
        totalCommission: number;
        oldestOpenInvoiceDate: number | null;
      }
    >();

    for (const row of filteredRows) {
      const existing = grouped.get(row.repId) ?? {
        repId: row.repId,
        repName: row.repName,
        invoices: new Set<number>(),
        paidInvoices: new Set<number>(),
        unpaidInvoices: new Set<number>(),
        overdueInvoices: new Set<number>(),
        totalSales: 0,
        totalCommission: 0,
        oldestOpenInvoiceDate: null,
      };

      if (!existing.invoices.has(row.invoiceId)) {
        existing.invoices.add(row.invoiceId);
        existing.totalSales += row.invoiceAmount;
      }

      if (row.salesStatus === "PAID") {
        existing.paidInvoices.add(row.invoiceId);
      }
      if (row.salesStatus === "UNPAID" || row.salesStatus === "PARTIAL") {
        existing.unpaidInvoices.add(row.invoiceId);
      }
      if (row.salesStatus === "OVERDUE") {
        existing.overdueInvoices.add(row.invoiceId);
      }

      if (row.salesStatus !== "PAID") {
        const invoiceTime = new Date(row.invoiceDate).getTime();
        existing.oldestOpenInvoiceDate =
          existing.oldestOpenInvoiceDate === null
            ? invoiceTime
            : Math.min(existing.oldestOpenInvoiceDate, invoiceTime);
      }

      existing.totalCommission += row.commissionAmount;
      grouped.set(row.repId, existing);
    }

    const rows = Array.from(grouped.values()).map((row) => ({
      repId: row.repId,
      repName: row.repName,
      invoiceCount: row.invoices.size,
      paidCount: row.paidInvoices.size,
      unpaidCount: row.unpaidInvoices.size,
      overdueCount: row.overdueInvoices.size,
      totalSales: Number(row.totalSales.toFixed(2)),
      totalCommission: Number(row.totalCommission.toFixed(2)),
      avgRate: row.totalSales > 0 ? Number(((row.totalCommission / row.totalSales) * 100).toFixed(2)) : 0,
      oldestOpenInvoiceDate: row.oldestOpenInvoiceDate,
    }));

    if (sortMode === "highest") {
      rows.sort((a, b) => b.totalCommission - a.totalCommission);
      return rows;
    }

    rows.sort((a, b) => {
      if (a.oldestOpenInvoiceDate === null && b.oldestOpenInvoiceDate === null) return 0;
      if (a.oldestOpenInvoiceDate === null) return 1;
      if (b.oldestOpenInvoiceDate === null) return -1;
      return a.oldestOpenInvoiceDate - b.oldestOpenInvoiceDate;
    });
    return rows;
  }, [filteredRows, sortMode]);

  const repColumns = useMemo<ColumnDef<(typeof repTableRows)[number]>[]>(
    () => [
      {
        accessorKey: "repName",
        header: "Rep Name",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setDrillDownRepId(row.original.repId)}
            className="font-medium text-[#2b2d7e] hover:underline"
          >
            {row.original.repName}
          </button>
        ),
      },
      {
        accessorKey: "invoiceCount",
        header: "Invoices",
        cell: ({ row }) => (
          <span className="inline-flex rounded-full border border-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-700">
            {row.original.invoiceCount}
          </span>
        ),
      },
      {
        id: "salesStatus",
        header: "Sales Status",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${salesStatusConfig.PAID.pill}`}>
              Paid {row.original.paidCount}
            </span>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${salesStatusConfig.UNPAID.pill}`}>
              Unpaid {row.original.unpaidCount}
            </span>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${salesStatusConfig.OVERDUE.pill}`}>
              Overdue {row.original.overdueCount}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "totalSales",
        header: "Total Sales",
        cell: ({ row }) => <span className="text-stone-800">{formatCurrency(row.original.totalSales)}</span>,
      },
      {
        accessorKey: "totalCommission",
        header: "Commission",
        cell: ({ row }) => (
          <span className="font-semibold text-[#1a5c2e]">{formatCurrency(row.original.totalCommission)}</span>
        ),
      },
      {
        accessorKey: "avgRate",
        header: "Avg Rate",
        cell: ({ row }) => <span className="text-stone-700">{formatPercent(row.original.avgRate)}</span>,
      },
      {
        accessorKey: "oldestOpenInvoiceDate",
        header: "Oldest Open Invoice",
        cell: ({ row }) => (
          <span className="text-stone-700">
            {row.original.oldestOpenInvoiceDate
              ? formatDate(new Date(row.original.oldestOpenInvoiceDate).toISOString())
              : "-"}
          </span>
        ),
      },
      {
        id: "action",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`/commission/${row.original.repId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#c0c3f0] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#2b2d7e] hover:bg-[#eeeffe]"
          >
            <Eye size={12} />
            Drill Down
          </Link>
        ),
      },
    ],
    [],
  );

  const selectedRepSummary = useMemo(() => {
    if (!drillDownRepId) return null;
    const rows = filteredRows.filter((row) => row.repId === drillDownRepId);
    if (rows.length === 0) return null;

    const repName = rows[0].repName;
    const totalSales = rows.reduce((sum, row) => sum + row.invoiceAmount, 0);
    const totalCommission = rows.reduce((sum, row) => sum + row.commissionAmount, 0);
    const paid = rows.filter((row) => row.status === "PAID").reduce((sum, row) => sum + row.commissionAmount, 0);
    const pending = rows
      .filter((row) => row.status !== "PAID")
      .reduce((sum, row) => sum + row.commissionAmount, 0);

    const monthly = new Map<string, { month: string; commission: number; rate: number; sales: number }>();
    for (const row of rows) {
      const date = new Date(row.invoiceDate);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      const existing = monthly.get(key) ?? { month: key, commission: 0, rate: 0, sales: 0 };
      existing.commission += row.commissionAmount;
      existing.sales += row.invoiceAmount;
      monthly.set(key, existing);
    }

    const monthlyTrend = Array.from(monthly.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item) => ({
        month: item.month,
        commission: Number(item.commission.toFixed(2)),
        rate: item.sales > 0 ? Number(((item.commission / item.sales) * 100).toFixed(2)) : 0,
      }));

    return {
      repName,
      rows,
      totalSales,
      totalCommission,
      paid,
      pending,
      monthlyTrend,
    };
  }, [drillDownRepId, filteredRows]);

  const handleExport = () => {
    if (accountQuery.data !== "admin") return;
    const exportRows = repTableRows.map((row) => ({
      "Rep Name": row.repName,
      Invoices: row.invoiceCount,
      "Paid Sales": row.paidCount,
      "Unpaid Sales": row.unpaidCount,
      "Overdue Sales": row.overdueCount,
      "Total Sales": row.totalSales,
      "Total Commission": row.totalCommission,
      "Avg Commission Rate": `${row.avgRate.toFixed(2)}%`,
      "Oldest Open Invoice": row.oldestOpenInvoiceDate
        ? formatDate(new Date(row.oldestOpenInvoiceDate).toISOString())
        : "-",
    }));

    const sheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Commission");
    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `commission-dashboard-${timestamp}.xlsx`);
  };

  const clearInteractiveFilters = () => {
    setStatusFilter("all");
  };

  return (
    <section className="space-y-5 pb-16">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Sales Rep Sales</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-dmsans)] font-semibold">
            Rep. Sales Dashboard
          </h1>
          <p className="text-[13px] text-stone-500">
            Track payout quality, sales efficiency, and unpaid liabilities in one place.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearInteractiveFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50"
          >
            <Filter size={13} />
            Reset Filters
          </button>
          
        </div>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Date Range</span>
            <select
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700"
              value={datePreset}
              onChange={(event) => setDatePreset(event.target.value as DatePreset)}
            >
              <option value="today">Today</option>
              <option value="month">This Month</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Sales Status</span>
            <select
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | SalesStatus)}
            >
              <option value="all">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Sort</span>
            <select
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="highest">Highest Commission</option>
              <option value="oldest">Oldest Pending</option>
            </select>
          </label>
        </div>

        {datePreset === "custom" && (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Start Date</span>
              <input
                type="date"
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">End Date</span>
              <input
                type="date"
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
              />
            </label>
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Total Commission</p>
          <p className="mt-1 text-[20px] leading-none text-[#1a5c2e] [font-family:var(--font-dmsans)]">
            {formatCurrency(totals.totalCommission)}
          </p>
          <p className="mt-1 text-[12px] text-stone-500">This filtered period</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Top Rep</p>
          <p className="mt-1 truncate text-[18px] leading-none text-[#2b2d7e] [font-family:var(--font-dmsans)]">
            {totals.topRep?.[1].repName ?? "-"}
          </p>
          <p className="mt-1 text-[12px] text-stone-500">
            {totals.topRep ? formatCurrency(totals.topRep[1].totalCommission) : "No data"}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <div>
          <p className="mb-2 text-[13px] font-medium text-stone-700">Commission and Sales by Rep</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edeae1" />
                <XAxis dataKey="repName" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                <Legend />
                <Bar
                  dataKey="sales"
                  name="Sales"
                  fill="#2b2d7e"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="commission"
                  name="Commission"
                  fill="#1a5c2e"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

        
        <DataTable
          data={repTableRows}
          columns={repColumns}
          minWidth={1320}
          searchPlaceholder="Search by rep name"
          emptyMessage="No commission rows match these filters."
        />
     

      {(commissionQuery.isLoading || !isAllDetailsLoaded) && (
        <p className="text-[13px] text-stone-500">Loading commission analytics...</p>
      )}

      {commissionQuery.error instanceof Error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {commissionQuery.error.message}
        </p>
      )}

      {detailError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {detailError.message}
        </p>
      )}

      {drillDownRepId && selectedRepSummary && (
        <div className="fixed inset-0 z-40 bg-black/35" onClick={() => setDrillDownRepId(null)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-[460px] overflow-y-auto border-l border-stone-200 bg-white p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Rep Drill-Down</p>
                <h3 className="text-[24px] text-[#2b2d7e] [font-family:var(--font-dmsans)]">{selectedRepSummary.repName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDrillDownRepId(null)}
                className="rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">Total Sales</p>
                <p className="text-[16px] font-semibold text-stone-900">{formatCurrency(selectedRepSummary.totalSales)}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">Total Commission</p>
                <p className="text-[16px] font-semibold text-[#1a5c2e]">{formatCurrency(selectedRepSummary.totalCommission)}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">Paid</p>
                <p className="text-[16px] font-semibold text-emerald-700">{formatCurrency(selectedRepSummary.paid)}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">Pending</p>
                <p className="text-[16px] font-semibold text-amber-700">{formatCurrency(selectedRepSummary.pending)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-stone-200 p-3">
              <p className="mb-2 text-[13px] font-medium text-stone-700">Monthly Earnings Trend</p>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedRepSummary.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edeae1" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                    <Line type="monotone" dataKey="commission" stroke="#1a5c2e" strokeWidth={2} dot={{ r: 2.5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {selectedRepSummary.rows.slice(0, 8).map((row) => (
                <div key={row.commissionId} className="rounded-xl border border-stone-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-medium text-[#2b2d7e] [font-family:var(--font-jetbrains)]">{row.invoiceNo}</p>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${commissionStatusConfig[row.status].pill}`}>
                      {commissionStatusConfig[row.status].label}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-stone-600">{formatCurrency(row.commissionAmount)} | Due {formatDate(row.dueDate)}</p>
                </div>
              ))}
            </div>

            <Link
              href={`/commission/${drillDownRepId}`}
              className="mt-4 inline-flex items-center rounded-xl border border-[#c0c3f0] px-3 py-2 text-[12px] font-medium text-[#2b2d7e] hover:bg-[#eeeffe]"
            >
              Open Full Rep Page
            </Link>
          </div>
        </div>
      )}
    </section>
  );
};

export default CommissionClient;
