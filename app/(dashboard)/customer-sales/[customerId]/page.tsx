"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { AlertCircle, ArrowLeft, Phone, ShieldAlert, Star, Filter } from "lucide-react";
import DataTable from "@/components/ui/DataTable";

type DetailResponse = {
  period: {
    key: "today" | "month" | "custom";
    label: string;
    startDate: string;
    endDate: string;
  };
  customer: {
    customerId: number;
    name: string;
    phone: string | null;
    assignedRep: {
      rep_id: number;
      full_name: string;
    } | null;
  };
  kpis: {
    totalPurchases: number;
    outstandingBalance: number;
    lastPurchaseDate: string | null;
    avgMonthlyPurchase: number;
  };
  purchaseTrend: Array<{
    label: string;
    amount: number;
  }>;
  paymentBehavior: Array<{
    label: string;
    invoices: number;
    payments: number;
  }>;
  agingAnalysis: Array<{
    label: string;
    amount: number;
  }>;
  topProducts: Array<{
    productId: number;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  transactions: {
    invoices: Array<{
      id: number;
      reference: string;
      date: string;
      amount: number;
      status: string;
    }>;
    receipts: Array<{
      id: number;
      reference: string;
      date: string;
      amount: number;
      status: string;
    }>;
    goodsIssueNotes: Array<{
      id: number;
      reference: string;
      date: string;
      amount: number;
      status: string;
    }>;
  };
  alerts: string[];
  cashBreakdown: {
    collected: number;
    outstanding: number;
  };
};

type TabKey = "invoices" | "receipts";
type DatePreset = "today" | "month" | "custom";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ALERT_META: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  OVERDUE: {
    label: "Overdue",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: <ShieldAlert size={12} />,
  },
  NO_PURCHASE_30: {
    label: "No Purchase in 30 Days",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <AlertCircle size={12} />,
  },
  HIGH_VALUE: {
    label: "High Value Customer",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Star size={12} />,
  },
};

export default function CustomerSalesDetailPage() {
  const params = useParams<{ customerId: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>("invoices");
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const customerId = Number(params.customerId);

  const queryString = new URLSearchParams({
    datePreset,
    ...(customStart ? { customStart } : {}),
    ...(customEnd ? { customEnd } : {}),
  }).toString();

  const detailQuery = useQuery({
    queryKey: ["customer-sales-detail", customerId, datePreset, customStart, customEnd],
    queryFn: async () => {
      const response = await fetch(`/api/customer-sales/${customerId}?${queryString}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as DetailResponse | { error?: string };
      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "Failed to load customer detail.");
      }
      return data as DetailResponse;
    },
    enabled: Number.isInteger(customerId) && customerId > 0,
  });

  const pieData = detailQuery.data
    ? [
        { name: "Collected", value: detailQuery.data.cashBreakdown.collected, color: "#1a5c2e" },
        { name: "Outstanding", value: detailQuery.data.cashBreakdown.outstanding, color: "#b91c1c" },
      ]
    : [];

  const resetDateFilters = () => {
    setDatePreset("month");
    setCustomStart("");
    setCustomEnd("");
  };

  const transactionRows = useMemo(() => {
    if (!detailQuery.data) return [];
    if (activeTab === "invoices") return detailQuery.data.transactions.invoices;
    return detailQuery.data.transactions.receipts;
  }, [detailQuery.data, activeTab]);

  const transactionColumns: ColumnDef<(typeof transactionRows)[number]>[] = [
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }) => <span className="text-stone-700 font-medium">{row.original.reference}</span>,
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => <span className="text-stone-500">{formatDate(row.original.date)}</span>,
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => <span className="text-stone-700">{formatCurrency(row.original.amount)}</span>,
      meta: { align: "right" },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <span className="text-stone-500">{row.original.status}</span>,
      meta: { align: "right" },
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/customer-sales"
            className="inline-flex items-center gap-1 text-[12px] text-stone-500 hover:text-stone-700 [font-family:var(--font-dmsans)]"
          >
            <ArrowLeft size={13} /> Back to Customer Sales Dashboard
          </Link>
          <h1 className="mt-1 text-[28px] leading-tight text-stone-900 font-semibold [font-family:var(--font-dmsans)]">
            {detailQuery.data?.customer.name ?? "Customer"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">
            <span className="inline-flex items-center gap-1">
              <Phone size={12} /> {detailQuery.data?.customer.phone ?? "-"}
            </span>
            <span className="text-stone-300">|</span>
            <span>Rep: {detailQuery.data?.customer.assignedRep?.full_name ?? "Unassigned"}</span>
          </div>
          {detailQuery.data && detailQuery.data.alerts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {detailQuery.data.alerts.map((alertKey) => {
                const meta = ALERT_META[alertKey];
                if (!meta) return null;
                return (
                  <span
                    key={alertKey}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold [font-family:var(--font-dmsans)] ${meta.className}`}
                  >
                    {meta.icon}
                    {meta.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetDateFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50"
          >
            <Filter size={13} />
            Reset Filters
          </button>
        </div>
      </div>

      {detailQuery.isLoading ? (
        <DetailLoadingState />
      ) : detailQuery.error ? (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] [font-family:var(--font-dmsans)]">
          {(detailQuery.error as Error).message}
        </div>
      ) : !detailQuery.data ? (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[13px] [font-family:var(--font-dmsans)]">
          No customer data found.
        </div>
      ) : (
        <>
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
                Active: {detailQuery.data.period.label}
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

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
            <MiniKpiCard label="Total Purchases" value={formatCurrency(detailQuery.data.kpis.totalPurchases)} />
            <MiniKpiCard label="Outstanding Balance" value={formatCurrency(detailQuery.data.kpis.outstandingBalance)} tone={detailQuery.data.kpis.outstandingBalance > 0 ? "danger" : "success"} />
          </div>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
            <p className="mb-2 text-[13px] font-medium text-stone-700">Collected vs Outstanding</p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={45} label>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="bg-white border border-stone-200 rounded-2xl p-4 lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <p className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
                Recent Transactions
              </p>
              <div className="inline-flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                <TabButton label="Invoices" active={activeTab === "invoices"} onClick={() => setActiveTab("invoices")} />
                <TabButton label="Receipts" active={activeTab === "receipts"} onClick={() => setActiveTab("receipts")} />
              </div>
            </div>

            <DataTable
              data={transactionRows.slice(0, 20)}
              columns={transactionColumns}
              minWidth={760}
              searchPlaceholder="Search reference or status"
              emptyMessage="No transactions found."
            />
          </div>
        </>
      )}
    </div>
  );
}

function MiniKpiCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-700"
      : tone === "success"
        ? "text-emerald-700"
        : "text-stone-900";

  return (
    <div className="bg-white border border-stone-200 rounded-2xl px-4 py-3">
      <p className="text-[10.5px] uppercase tracking-[0.09em] text-stone-400 font-semibold [font-family:var(--font-dmsans)]">
        {label}
      </p>
      <p className={`text-[20px] leading-tight font-semibold [font-family:var(--font-dmsans)] mt-1 ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1.5 text-[12px] rounded-md font-semibold [font-family:var(--font-dmsans)] transition-colors ${
        active ? "bg-white text-blue-700 shadow-sm" : "text-stone-500 hover:text-stone-700"
      }`}
    >
      {label}
    </button>
  );
}

function DetailLoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[90px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
        ))}
      </div>
      <div className="h-[300px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-[280px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
        <div className="h-[280px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
      </div>
      <div className="h-[300px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
      <div className="h-[320px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
    </div>
  );
}
