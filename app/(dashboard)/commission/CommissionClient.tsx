"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { BarChart3, Filter, Search, Settings } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import CommissionConfigModal from "./CommissionConfigModal";

type PeriodType = "daily" | "weekly" | "monthly" | "yearly" | "custom";

type CommissionRow = {
  repId: number;
  repName: string;
  invoiceCount: number;
  totalSales: number;
  cashCollected: number;
  avgDays: number;
  commissionRate: number;
  commissionAmount: number;
};

type CommissionDashboardResponse = {
  period: { startDate: string; endDate: string; label: string };
  totals: {
    totalCommission: number;
  };
  rows: CommissionRow[];
};

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

export default function CommissionClient() {
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [date, setDate] = useState(todayISO());
  const [month, setMonth] = useState(monthISO());
  const [year, setYear] = useState(yearISO());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [repId, setRepId] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFilterBasedOn, setDateFilterBasedOn] = useState<"invoice" | "settlement">("invoice");
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const filters = useMemo(
    () => ({ periodType, date, month, year, from, to, repId, search, dateFilterBasedOn }),
    [periodType, date, month, year, from, to, repId, search, dateFilterBasedOn],
  );

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("periodType", filters.periodType);
    if (filters.periodType === "daily") sp.set("date", filters.date);
    if (filters.periodType === "monthly") sp.set("month", filters.month);
    if (filters.periodType === "yearly") sp.set("year", filters.year);
    if (filters.periodType === "custom") {
      sp.set("from", filters.from);
      sp.set("to", filters.to);
    }
    if (filters.periodType === "weekly") sp.set("date", filters.date);
    sp.set("dateFilterBasedOn", filters.dateFilterBasedOn);
    sp.set("repId", filters.repId);
    if (filters.search.trim()) sp.set("search", filters.search.trim());
    return sp.toString();
  }, [filters]);

  const commissionQuery = useQuery({
    queryKey: ["commission-dashboard", filters],
    queryFn: async () => {
      const response = await fetch(`/api/commission?${queryString}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as
        | CommissionDashboardResponse
        | { error?: string };
      if (!response.ok) {
        throw new Error(
          (data as { error?: string }).error ?? "Failed to load commission data.",
        );
      }
      return data as CommissionDashboardResponse;
    },
  });

  const repOptions = useMemo(
    () =>
      Array.from(
        new Map((commissionQuery.data?.rows ?? []).map((row) => [row.repId, row]))
          .values(),
      ).sort((a, b) => a.repName.localeCompare(b.repName)),
    [commissionQuery.data?.rows],
  );

  const columns: ColumnDef<CommissionRow>[] = [
    { accessorKey: "repName", header: "Rep" },
    {
      accessorKey: "invoiceCount",
      header: "Invoices",
      meta: {
        align: "right",
        className: "border-l border-stone-200",
        headerClassName: "border-l border-stone-200",
      },
    },

    {
      accessorKey: "totalSales",
      header: "Total Sales",
      cell: ({ row }) => formatCurrency(row.original.totalSales),
      meta: {
        align: "right",
        className: "border-l border-stone-200",
        headerClassName: "border-l border-stone-200",
      },
    },
    {
      accessorKey: "cashCollected",
      header: "Cash Collected",
      cell: ({ row }) => formatCurrency(row.original.cashCollected),
      meta: {
        align: "right",
        className: "border-l border-stone-200",
        headerClassName: "border-l border-stone-200",
      },
    },
    {
      accessorKey: "commissionAmount",
      header: "Commission",
      cell: ({ row }) => formatCurrency(row.original.commissionAmount),
      meta: {
        align: "right",
        className: "border-l border-stone-200",
        headerClassName: "border-l border-stone-200",
      },
    },

    {
      id: "action",
      header: "",
      cell: ({ row }) => (
        <Link
          href={`/commission/${row.original.repId}`}
          className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-stone-700 hover:bg-stone-50"
        >
          View
        </Link>
      ),
      meta: {
        align: "right",
        className: "border-l border-stone-200",
        headerClassName: "border-l border-stone-200",
      },
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
    setSearch("");
  };

  return (
    <section className="space-y-5 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.13em] text-stone-400 font-semibold">
            Commission
          </p>
          <h1 className="text-[28px] leading-tight text-stone-900 font-semibold mt-1">
            Commission Overview
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50"
          >
            <Filter size={13} />
            Reset Filters
          </button>
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50"
          >
            <Settings size={13} />
            Commission Config
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap xl:flex-nowrap">
          <label className="space-y-1 flex-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Filter By</span>
            <select className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" value={dateFilterBasedOn} onChange={(e) => setDateFilterBasedOn(e.target.value as "invoice" | "settlement")}>
              <option value="settlement">Settlement Date</option>
              <option value="invoice">Invoice Date</option>
            </select>
          </label>
          <label className="space-y-1 flex-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Period Type</span>
            <select className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" value={periodType} onChange={(e) => setPeriodType(e.target.value as PeriodType)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {(periodType === "daily" || periodType === "weekly") && (
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">{periodType === "weekly" ? "Week Anchor" : "Date"}</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" />
            </label>
          )}
          {periodType === "monthly" && (
            <label className="space-y-1 flex-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Month</span>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" />
            </label>
          )}
          {periodType === "yearly" && (
            <label className="space-y-1 flex-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Year</span>
              <input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" />
            </label>
          )}
          {periodType === "custom" && (
            <>
              <label className="space-y-1 flex-1">
                <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">From</span>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" />
              </label>
              <label className="space-y-1 flex-1">
                <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">To</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" />
              </label>
            </>
          )}

          <label className="space-y-1 flex-[1.5]">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Search</span>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-9 py-2 text-[13px]" placeholder="Rep name..." />
            </div>
          </label>
        </div>
      </section>

      {commissionQuery.isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 1 }).map((_, idx) => (
              <div key={idx} className="h-[96px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
            ))}
          </div>
          <div className="h-[280px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
        </div>
      ) : commissionQuery.error ? (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
          {(commissionQuery.error as Error).message}
        </div>
      ) : !commissionQuery.data ? (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[13px]">
          No data available.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Metric label="Total Comm." value={formatCurrency(commissionQuery.data.totals.totalCommission)} icon={<BarChart3 size={15} className="text-violet-700" />} />
          </div>

          <DataTable
            data={commissionQuery.data.rows}
            columns={columns}
            minWidth={1320}
            hideSearch
            emptyMessage="No commission rows found for selected filters."
            isLoading={commissionQuery.isFetching}
          />
        </>
      )}

      <CommissionConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} />
    </section>
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
