"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  CalendarRange,
  CheckCircle2,
  Clock3,
  Filter,
  HandCoins,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import DataTable from "@/components/ui/DataTable";

type PeriodType = "daily" | "monthly" | "yearly" | "custom";
type Risk = "all" | "clear" | "watch" | "overdue" | "inactive";

type CustomerRow = {
  customerId: number;
  name: string;
  phone: string | null;
  salesRep: string | null;
  netSales: number;
  collections: number;
  outstanding: number;
  overdueAmount: number;
  oldestOpenInvoiceDate: string | null;
  daysOutstanding: number;
  lastPurchaseDate: string | null;
  invoiceCount: number;
  riskStatus: "clear" | "watch" | "overdue" | "inactive";
};

type DashboardResponse = {
  period: { startDate: string; endDate: string; label: string };
  totals: {
    netSales: number;
    collections: number;
    outstanding: number;
    overdueAmount: number;
    activeCustomers: number;
    avgCollectionDays: number | null;
  };
  trend: Array<{ label: string; sales: number; collections: number }>;
  aging: Array<{ bucket: "0-30" | "31-60" | "61-90" | "90+"; amount: number }>;
  customers: CustomerRow[];
};

type SalesRepOption = { rep_id: number; full_name: string };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthISO() {
  return new Date().toISOString().slice(0, 7);
}

function yearISO() {
  return String(new Date().getFullYear());
}

export default function CustomerSalesPage() {
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [date, setDate] = useState(todayISO());
  const [month, setMonth] = useState(monthISO());
  const [year, setYear] = useState(yearISO());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [repId, setRepId] = useState("all");
  const [risk, setRisk] = useState<Risk>("all");
  const [search, setSearch] = useState("");

  const filterState = useMemo(
    () => ({ periodType, date, month, year, from, to, repId, risk, search }),
    [periodType, date, month, year, from, to, repId, risk, search],
  );

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("periodType", filterState.periodType);
    if (filterState.periodType === "daily") sp.set("date", filterState.date);
    if (filterState.periodType === "monthly") sp.set("month", filterState.month);
    if (filterState.periodType === "yearly") sp.set("year", filterState.year);
    if (filterState.periodType === "custom") {
      sp.set("from", filterState.from);
      sp.set("to", filterState.to);
    }
    sp.set("repId", filterState.repId);
    sp.set("risk", filterState.risk);
    if (filterState.search.trim()) sp.set("search", filterState.search.trim());
    return sp.toString();
  }, [filterState]);

  const dashboardQuery = useQuery({
    queryKey: ["customer-sales-v2", filterState],
    queryFn: async () => {
      const response = await fetch(`/api/customer-sales?${queryString}`, { cache: "no-store" });
      const data = (await response.json()) as DashboardResponse | { error?: string };
      if (!response.ok) throw new Error((data as { error?: string }).error ?? "Failed to load customer sales.");
      return data as DashboardResponse;
    },
  });

  const repsQuery = useQuery({
    queryKey: ["sales-reps-filter-customer-sales"],
    queryFn: async () => {
      const response = await fetch("/api/sales-reps", { cache: "no-store" });
      const data = await response.json();
      return (data.salesReps ?? []) as SalesRepOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const columns: ColumnDef<CustomerRow>[] = [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="text-stone-800 font-medium">{row.original.name}</p>
          <p className="text-[11px] text-stone-500">{row.original.phone ?? "-"}</p>
        </div>
      ),
    },
    {
      accessorKey: "netSales",
      header: "Net Sales",
      cell: ({ row }) => <span className="text-stone-800">{formatCurrency(row.original.netSales)}</span>,
      meta: { align: "right", className: "border-l border-stone-200", headerClassName: "border-l border-stone-200" },
    },
    {
      accessorKey: "collections",
      header: "Collections",
      cell: ({ row }) => <span className="text-emerald-700">{formatCurrency(row.original.collections)}</span>,
      meta: { align: "right", className: "border-l border-stone-200", headerClassName: "border-l border-stone-200" },
    },
    {
      accessorKey: "outstanding",
      header: "Outstanding",
      cell: ({ row }) => (
        <span className={row.original.outstanding > 0 ? "text-red-700 font-medium" : "text-emerald-700"}>
          {formatCurrency(row.original.outstanding)}
        </span>
      ),
      meta: { align: "right", className: "border-l border-stone-200", headerClassName: "border-l border-stone-200" },
    },
    {
      id: "view",
      header: "",
      cell: ({ row }) => (
        <Link
          href={`/customer-sales/${row.original.customerId}`}
          className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-stone-700 hover:bg-stone-50"
        >
          View
        </Link>
      ),
      meta: { align: "right", className: "border-l border-stone-200", headerClassName: "border-l border-stone-200" },
    },
  ];

  const reset = () => {
    setPeriodType("monthly");
    setDate(todayISO());
    setMonth(monthISO());
    setYear(yearISO());
    setFrom(todayISO());
    setTo(todayISO());
    setRepId("all");
    setRisk("all");
    setSearch("");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.13em] text-stone-400 font-semibold">Customer Sales</p>
          <h1 className="text-[28px] leading-tight text-stone-900 font-semibold mt-1">Customer Account Performance</h1>
          <p className="text-[13px] text-stone-500 mt-1">Sales, collections, receivables risk, and buying recency in one view.</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50"
        >
          <Filter size={13} />
          Reset Filters
        </button>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Period Type</span>
            <select className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" value={periodType} onChange={(e) => setPeriodType(e.target.value as PeriodType)}>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {periodType === "daily" && (
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" />
            </label>
          )}
          {periodType === "monthly" && (
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Month</span>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" />
            </label>
          )}
          {periodType === "yearly" && (
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Year</span>
              <input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" />
            </label>
          )}
          {periodType === "custom" && (
            <>
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">From</span>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">To</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" />
              </label>
            </>
          )}
          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Sales Rep</span>
            <select value={repId} onChange={(e) => setRepId(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]">
              <option value="all">All Reps</option>
              {(repsQuery.data ?? []).map((r) => (
                <option key={r.rep_id} value={String(r.rep_id)}>
                  {r.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Risk</span>
            <select value={risk} onChange={(e) => setRisk(e.target.value as Risk)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]">
              <option value="all">All</option>
              <option value="clear">Clear</option>
              <option value="watch">Watch</option>
              <option value="overdue">Overdue</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="space-y-1 xl:col-span-2">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Search</span>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-9 py-2 text-[13px]" placeholder="Customer, phone, rep..." />
            </div>
          </label>
        </div>
      </section>

      {dashboardQuery.isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-[96px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
            ))}
          </div>
          <div className="h-[280px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
          <div className="h-[280px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
        </div>
      ) : dashboardQuery.error ? (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
          {(dashboardQuery.error as Error).message}
        </div>
      ) : !dashboardQuery.data ? (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[13px]">
          No data available.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <Metric label="Net Sales" value={formatCurrency(dashboardQuery.data.totals.netSales)} icon={<TrendingUp size={15} className="text-emerald-600" />} />
            <Metric label="Collections" value={formatCurrency(dashboardQuery.data.totals.collections)} icon={<CheckCircle2 size={15} className="text-blue-600" />} />
            <Metric label="Outstanding" value={formatCurrency(dashboardQuery.data.totals.outstanding)} icon={<HandCoins size={15} className="text-red-600" />} />
            <Metric label="Overdue" value={formatCurrency(dashboardQuery.data.totals.overdueAmount)} icon={<AlertTriangle size={15} className="text-red-700" />} />
            <Metric label="Active Customers" value={String(dashboardQuery.data.totals.activeCustomers)} icon={<Users size={15} className="text-stone-700" />} />
            <Metric label="Avg Collection Days" value={dashboardQuery.data.totals.avgCollectionDays === null ? "-" : String(dashboardQuery.data.totals.avgCollectionDays)} icon={<Clock3 size={15} className="text-amber-700" />} />
          </div>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
            <p className="mb-2 text-[13px] font-medium text-stone-700 inline-flex items-center gap-2">
              <CalendarRange size={14} /> Customer Collections vs Outstanding
            </p>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dashboardQuery.data.customers.slice(0, 12).map((c) => ({
                    name: c.name,
                    collections: c.collections,
                    outstanding: c.outstanding,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#edeae1" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                  <Legend />
                  <Bar dataKey="collections" stackId="sales" fill="#1a5c2e" name="Collected" />
                  <Bar dataKey="outstanding" stackId="sales" fill="#dc2626" name="Outstanding" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <DataTable
            data={dashboardQuery.data.customers}
            columns={columns}
            minWidth={1400}
            hideSearch
            emptyMessage="No customers found for selected filters."
          />
        </>
      )}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.09em] text-stone-400 font-semibold">{label}</p>
        <p className="text-[18px] leading-tight text-stone-900 font-semibold mt-1">{value}</p>
      </div>
    </div>
  );
}
