"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  HandCoins,
  TrendingUp,
  Users,
} from "lucide-react";
import DataTable from "@/components/ui/DataTable";

type DatePreset = "today" | "month" | "custom";

type DashboardResponse = {
  period: {
    key: DatePreset;
    label: string;
    startDate: string;
    endDate: string;
  };
  kpis: {
    totalSales: number;
    totalOutstanding: number;
    collections: number;
    activeCustomers: number;
    overdueCustomers: number;
  };
  salesTrend: Array<{
    label: string;
    currentSales: number;
    previousSales: number;
  }>;
  outstandingVsCollections: {
    outstanding: number;
    collected: number;
  };
  topCustomers: Array<{
    customerId: number;
    customerName: string;
    salesRep: string;
    totalSales: number;
    outstanding: number;
    lastPurchaseDate: string;
  }>;
  overdueCustomers: Array<{
    customerId: number;
    customerName: string;
    salesRep: string;
    outstanding: number;
    daysOverdue: number;
  }>;
  salesByRep: Array<{
    repId: number;
    repName: string;
    totalSales: number;
    collections: number;
  }>;
  customerSegments: Array<{
    label: string;
    value: number;
  }>;
  summary: {
    previousPeriodSales: number;
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export default function CustomerSalesDashboardPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const queryString = new URLSearchParams({
    datePreset,
    ...(customStart ? { customStart } : {}),
    ...(customEnd ? { customEnd } : {}),
  }).toString();

  const dashboardQuery = useQuery({
    queryKey: ["customer-sales-dashboard", datePreset, customStart, customEnd],
    queryFn: async () => {
      const response = await fetch(`/api/customer-sales?${queryString}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as DashboardResponse | { error?: string };
      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "Failed to load dashboard.");
      }
      return data as DashboardResponse;
    },
  });

  const customerBarData = (dashboardQuery.data?.topCustomers ?? []).map((customer) => ({
    ...customer,
    collected: Math.max(0, customer.totalSales - customer.outstanding),
  }));

  const customerSummaryColumns: ColumnDef<DashboardResponse["topCustomers"][number]>[] = [
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => <span className="font-medium text-stone-800">{row.original.customerName}</span>,
    },
    {
      accessorKey: "totalSales",
      header: "Total Sales",
      cell: ({ row }) => <span className="text-stone-700">{formatCurrency(row.original.totalSales)}</span>,
      meta: { align: "right" },
    },
    {
      accessorKey: "outstanding",
      header: "Outstanding",
      cell: ({ row }) => (
        <span className={row.original.outstanding > 0 ? "text-red-700 font-medium" : "text-emerald-700"}>
          {formatCurrency(row.original.outstanding)}
        </span>
      ),
      meta: { align: "right" },
    },
    {
      accessorKey: "salesRep",
      header: "Sales Rep",
      cell: ({ row }) => <span className="text-stone-600">{row.original.salesRep}</span>,
      meta: { align: "right" },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Link
          href={`/customer-sales/${row.original.customerId}`}
          className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-stone-700 hover:bg-stone-50"
        >
          View
        </Link>
      ),
      meta: { align: "right" },
    },
  ];

  const clearDateFilters = () => {
    setDatePreset("month");
    setCustomStart("");
    setCustomEnd("");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.13em] text-stone-400 font-semibold [font-family:var(--font-dmsans)]">
            Customer Sales
          </p>
          <h1 className="text-[28px] leading-tight text-stone-900 font-semibold [font-family:var(--font-dmsans)] mt-1">
            Customer Sales Dashboard
          </h1>
          <p className="text-[13px] text-stone-500 mt-1 [font-family:var(--font-dmsans)]">
            Identify who owes, who is growing, and which reps drive the healthiest revenue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearDateFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50"
          >
            <Filter size={13} />
            Reset Filters
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
          <div className="flex items-end text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">
            Active: {dashboardQuery.data?.period.label ?? "-"}
          </div>
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

      {dashboardQuery.isLoading ? (
        <DashboardLoadingState />
      ) : dashboardQuery.error ? (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] [font-family:var(--font-dmsans)]">
          {(dashboardQuery.error as Error).message}
        </div>
      ) : !dashboardQuery.data ? (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[13px] [font-family:var(--font-dmsans)]">
          No customer sales data available.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="Total Sales" value={formatCurrency(dashboardQuery.data.kpis.totalSales)} icon={<TrendingUp size={16} className="text-emerald-600" />} helper={`${dashboardQuery.data.period.label}`} />
            <KpiCard label="Total Outstanding" value={formatCurrency(dashboardQuery.data.kpis.totalOutstanding)} icon={<HandCoins size={16} className="text-red-600" />} helper="Open receivables" />
            <KpiCard label="Collections" value={formatCurrency(dashboardQuery.data.kpis.collections)} icon={<CheckCircle2 size={16} className="text-blue-600" />} helper={`${dashboardQuery.data.period.label}`} />
            <KpiCard label="Active Customers" value={String(dashboardQuery.data.kpis.activeCustomers)} icon={<Users size={16} className="text-emerald-600" />} helper="Purchased in 30 days" />
            <KpiCard label="Overdue Customers" value={String(dashboardQuery.data.kpis.overdueCustomers)} icon={<AlertTriangle size={16} className="text-red-600" />} helper="Above 30 days" />
          </div>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
            <p className="mb-2 text-[13px] font-medium text-stone-700">Sales by Customer</p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edeae1" />
                  <XAxis dataKey="customerName" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                  <Legend />
                  <Bar dataKey="collected" stackId="customerTotal" name="Collected" fill="#2b2d7e" />
                  <Bar dataKey="outstanding" stackId="customerTotal" name="Outstanding" fill="#b91c1c" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

        
            <DataTable
              data={dashboardQuery.data.topCustomers}
              columns={customerSummaryColumns}
              minWidth={820}
              searchPlaceholder="Search customer or sales rep"
              emptyMessage="No customer sales found for this period."
            />
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10.5px] uppercase tracking-[0.09em] text-stone-400 font-semibold [font-family:var(--font-dmsans)]">
          {label}
        </p>
        <p className="text-[20px] leading-tight text-stone-900 font-semibold [font-family:var(--font-dmsans)] mt-1">
          {value}
        </p>
        <p className="text-[11px] text-stone-500 mt-1 [font-family:var(--font-dmsans)]">{helper}</p>
      </div>
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-[98px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
        ))}
      </div>
      <div className="h-[300px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-[290px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
        <div className="h-[290px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-[280px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
        <div className="h-[280px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
        <div className="h-[280px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
      </div>
    </div>
  );
}
