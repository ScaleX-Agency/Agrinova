"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Filter,
  HandCoins,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
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
import PendingCommissionTab from "./PendingCommissionTab";
import DataTable from "@/components/ui/DataTable";

type PeriodType = "daily" | "monthly" | "yearly" | "custom";

type RepRow = {
  repId: number;
  repName: string;
  phone: string | null;
  assignedCustomers: number;
  activeCustomers: number;
  invoiceCount: number;
  netSales: number;
  collections: number;
  outstanding: number;
  overdueAmount: number;
  oldestOpenInvoiceDate: string | null;
  daysOutstanding: number;
  collectionRate: number;
  avgDaysToCollect: number | null;
  pendingCommission: number;
  riskStatus: "clear" | "watch" | "overdue";
};

type DashboardResponse = {
  period: { startDate: string; endDate: string; label: string };
  totals: {
    netSales: number;
    collections: number;
    outstanding: number;
    overdueAmount: number;
    activeCustomers: number;
    avgDaysToCollect: number | null;
    pendingCommission: number;
    invoiceCount: number;
  };
  reps: RepRow[];
};

type SalesRepOption = { rep_id: number; full_name: string };
type LocationOption = { location_id: number; code: string; name: string };

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

const CommissionClient = () => {
  const [activeTab, setActiveTab] = useState<"performance" | "pending">("performance");
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [date, setDate] = useState(todayISO());
  const [month, setMonth] = useState(monthISO());
  const [year, setYear] = useState(yearISO());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [repId, setRepId] = useState("all");
  const [locationId, setLocationId] = useState("all");
  const [search, setSearch] = useState("");

  const filterState = useMemo(
    () => ({ periodType, date, month, year, from, to, repId, locationId, search }),
    [periodType, date, month, year, from, to, repId, locationId, search],
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
    sp.set("locationId", filterState.locationId);
    if (filterState.search.trim()) sp.set("search", filterState.search.trim());
    return sp.toString();
  }, [filterState]);

  const dashboardQuery = useQuery({
    queryKey: ["sales-rep-sales", filterState],
    queryFn: async () => {
      const response = await fetch(`/api/sales-rep-sales?${queryString}`, { cache: "no-store" });
      const data = (await response.json()) as DashboardResponse | { error?: string };
      if (!response.ok) throw new Error((data as { error?: string }).error ?? "Failed to load sales rep sales.");
      return data as DashboardResponse;
    },
    enabled: activeTab === "performance",
  });

  const repsQuery = useQuery({
    queryKey: ["sales-reps-filter-sales-rep-sales"],
    queryFn: async () => {
      const response = await fetch("/api/sales-reps", { cache: "no-store" });
      const data = await response.json();
      return (data.salesReps ?? []) as SalesRepOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const locationsQuery = useQuery({
    queryKey: ["inventory-locations-filter-sales-rep-sales"],
    queryFn: async () => {
      const response = await fetch("/api/inventory/locations", { cache: "no-store" });
      const data = await response.json();
      return (data.locations ?? []) as LocationOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const columns: ColumnDef<RepRow>[] = [
    {
      accessorKey: "repName",
      header: "Rep Name",
      cell: ({ row }) => <span className="text-stone-800 font-medium">{row.original.repName}</span>,
    },
    {
      accessorKey: "netSales",
      header: "Net Sales",
      cell: ({ row }) => formatCurrency(row.original.netSales),
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
          href={`/commission/${row.original.repId}`}
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
    setLocationId("all");
    setSearch("");
  };

  const repComparisonData = useMemo(
    () =>
      (dashboardQuery.data?.reps ?? []).map((rep) => ({
        repName: rep.repName,
        collected: rep.collections,
        outstanding: rep.outstanding,
      })),
    [dashboardQuery.data?.reps],
  );

  return (
    <section className="space-y-5 pb-16">
      <div className="inline-flex rounded-lg border border-stone-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setActiveTab("performance")}
          className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${activeTab === "performance" ? "bg-[#2b2d7e] text-white" : "text-stone-600"}`}
        >
          Performance
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${activeTab === "pending" ? "bg-[#1a5c2e] text-white" : "text-stone-600"}`}
        >
          Commission Queue
        </button>
      </div>

      {activeTab === "pending" ? (
        <PendingCommissionTab />
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.13em] text-stone-400 font-semibold">Sales Rep Sales</p>
              <h1 className="text-[28px] leading-tight text-stone-900 font-semibold mt-1">Rep Performance and Collections</h1>
              <p className="text-[13px] text-stone-500 mt-1">Sales, collections, receivables risk, customer coverage, and commission readiness.</p>
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
                <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Location</span>
                <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]">
                  <option value="all">All Locations</option>
                  {(locationsQuery.data ?? []).map((l) => (
                    <option key={l.location_id} value={String(l.location_id)}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 xl:col-span-2">
                <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Search</span>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-9 py-2 text-[13px]" placeholder="Rep name or phone..." />
                </div>
              </label>
            </div>
          </section>

          {dashboardQuery.isLoading ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                {Array.from({ length: 7 }).map((_, idx) => (
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
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                <Metric label="Net Sales" value={formatCurrency(dashboardQuery.data.totals.netSales)} icon={<TrendingUp size={15} className="text-emerald-600" />} />
                <Metric label="Collections" value={formatCurrency(dashboardQuery.data.totals.collections)} icon={<CheckCircle2 size={15} className="text-blue-600" />} />
                <Metric label="Outstanding" value={formatCurrency(dashboardQuery.data.totals.outstanding)} icon={<HandCoins size={15} className="text-red-600" />} />
                <Metric label="Overdue" value={formatCurrency(dashboardQuery.data.totals.overdueAmount)} icon={<AlertTriangle size={15} className="text-red-700" />} />
                <Metric label="Active Cust." value={String(dashboardQuery.data.totals.activeCustomers)} icon={<Users size={15} className="text-stone-700" />} />
                <Metric label="Avg Collect Days" value={dashboardQuery.data.totals.avgDaysToCollect === null ? "-" : String(dashboardQuery.data.totals.avgDaysToCollect)} icon={<Clock3 size={15} className="text-amber-700" />} />
                <Metric label="Pending Comm." value={formatCurrency(dashboardQuery.data.totals.pendingCommission)} icon={<BarChart3 size={15} className="text-violet-700" />} />
              </div>

              <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
                <p className="mb-2 text-[13px] font-medium text-stone-700">Sales Comparison by Rep (Collected vs Outstanding)</p>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={repComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#edeae1" />
                      <XAxis dataKey="repName" tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                      <Legend />
                      <Bar dataKey="collected" stackId="sales" fill="#1a5c2e" name="Collected" />
                      <Bar dataKey="outstanding" stackId="sales" fill="#dc2626" name="Outstanding" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <DataTable
                data={dashboardQuery.data.reps}
                columns={columns}
                minWidth={1040}
                hideSearch
                emptyMessage="No sales reps found for selected filters."
              />
            </>
          )}
        </>
      )}
    </section>
  );
};

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

export default CommissionClient;


