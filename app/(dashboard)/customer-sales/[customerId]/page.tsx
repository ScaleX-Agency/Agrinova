"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
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
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  HandCoins,
  Phone,
  RefreshCcw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import DataTable from "@/components/ui/DataTable";

type PeriodType = "daily" | "monthly" | "yearly" | "custom";
type TxType = "invoice" | "receipt" | "return" | "credit";

type DetailResponse = {
  customer: {
    customerId: number;
    name: string;
    phone: string | null;
    address: string | null;
    salesRep: string | null;
  };
  period: { startDate: string; endDate: string; label: string };
  kpis: {
    lifetimeSales: number;
    netSales: number;
    collections: number;
    outstanding: number;
    overdueAmount: number;
    avgDaysToPay: number | null;
    invoiceCount: number;
    lastPurchaseDate: string | null;
  };
  trend: Array<{ label: string; sales: number; collections: number }>;
  aging: Array<{ bucket: string; amount: number }>;
  topProducts: Array<{ productId: number; productCode: string; productName: string; quantity: number; netRevenue: number }>;
  openInvoices: Array<{
    invoiceId: number;
    invoiceNumber: string;
    invoiceDate: string;
    total: number;
    paid: number;
    credited: number;
    balance: number;
    daysOutstanding: number;
    status: string;
  }>;
  transactions: Array<{
    type: TxType;
    id: number;
    reference: string;
    date: string;
    amount: number;
    status: string;
  }>;
};

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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function monthISO() {
  return new Date().toISOString().slice(0, 7);
}
function yearISO() {
  return String(new Date().getFullYear());
}

function txTone(type: TxType) {
  if (type === "invoice") return "bg-blue-50 text-blue-700 border-blue-200";
  if (type === "receipt") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (type === "return") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-violet-50 text-violet-700 border-violet-200";
}

export default function CustomerSalesDetailPage() {
  const params = useParams<{ customerId: string }>();
  const customerId = Number(params.customerId);
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [date, setDate] = useState(todayISO());
  const [month, setMonth] = useState(monthISO());
  const [year, setYear] = useState(yearISO());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());

  const filters = useMemo(() => ({ periodType, date, month, year, from, to }), [periodType, date, month, year, from, to]);

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
    return sp.toString();
  }, [filters]);

  const detailQuery = useQuery({
    queryKey: ["customer-sales-v2-detail", customerId, filters],
    queryFn: async () => {
      const response = await fetch(`/api/customer-sales/${customerId}?${queryString}`, { cache: "no-store" });
      const data = (await response.json()) as DetailResponse | { error?: string };
      if (!response.ok) throw new Error((data as { error?: string }).error ?? "Failed to load customer sales detail.");
      return data as DetailResponse;
    },
    enabled: Number.isInteger(customerId) && customerId > 0,
  });

  const reset = () => {
    setPeriodType("monthly");
    setDate(todayISO());
    setMonth(monthISO());
    setYear(yearISO());
    setFrom(todayISO());
    setTo(todayISO());
  };

  const openInvoiceColumns: ColumnDef<DetailResponse["openInvoices"][number]>[] = [
    { accessorKey: "invoiceNumber", header: "Invoice" },
    { accessorKey: "invoiceDate", header: "Date", cell: ({ row }) => formatDate(row.original.invoiceDate) },
    { accessorKey: "total", header: "Total", cell: ({ row }) => formatCurrency(row.original.total), meta: { align: "right" } },
    { accessorKey: "paid", header: "Paid", cell: ({ row }) => formatCurrency(row.original.paid), meta: { align: "right" } },
    { accessorKey: "credited", header: "Credited", cell: ({ row }) => formatCurrency(row.original.credited), meta: { align: "right" } },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }) => <span className="text-red-700 font-medium">{formatCurrency(row.original.balance)}</span>,
      meta: { align: "right" },
    },
    { accessorKey: "daysOutstanding", header: "Days", meta: { align: "right" } },
    { accessorKey: "status", header: "Status" },
  ];

  const txColumns: ColumnDef<DetailResponse["transactions"][number]>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-medium ${txTone(row.original.type)}`}>
          {row.original.type}
        </span>
      ),
    },
    { accessorKey: "reference", header: "Reference" },
    { accessorKey: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount), meta: { align: "right" } },
    { accessorKey: "status", header: "Status", meta: { align: "right" } },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/customer-sales" className="inline-flex items-center gap-1 text-[12px] text-stone-500 hover:text-stone-700">
            <ArrowLeft size={13} /> Back to Customer Sales
          </Link>
          <h1 className="mt-1 text-[28px] leading-tight text-stone-900 font-semibold">{detailQuery.data?.customer.name ?? "Customer"}</h1>
          <p className="text-[13px] text-stone-500 mt-1 inline-flex items-center gap-2">
            <Phone size={13} /> {detailQuery.data?.customer.phone ?? "-"} | Rep: {detailQuery.data?.customer.salesRep ?? "Unassigned"} | Last Purchase: {formatDate(detailQuery.data?.kpis.lastPurchaseDate ?? null)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/customers/${customerId}`} className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50">
            <FileText size={13} /> Profile
          </Link>
          <Link href="/invoices/new" className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50">
            <CreditCard size={13} /> New Invoice
          </Link>
          <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50">
            <RefreshCcw size={13} /> Reset
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
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
        </div>
      </section>

      {detailQuery.isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-[95px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
            ))}
          </div>
          <div className="h-[260px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
          <div className="h-[260px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
        </div>
      ) : detailQuery.error ? (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
          {(detailQuery.error as Error).message}
        </div>
      ) : !detailQuery.data ? (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[13px]">
          No data available.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <Kpi label="Lifetime Sales" value={formatCurrency(detailQuery.data.kpis.lifetimeSales)} icon={<TrendingUp size={14} className="text-emerald-700" />} />
            <Kpi label="Period Sales" value={formatCurrency(detailQuery.data.kpis.netSales)} icon={<CalendarRange size={14} className="text-blue-700" />} />
            <Kpi label="Collections" value={formatCurrency(detailQuery.data.kpis.collections)} icon={<CheckCircle2 size={14} className="text-emerald-700" />} />
            <Kpi label="Outstanding" value={formatCurrency(detailQuery.data.kpis.outstanding)} icon={<HandCoins size={14} className="text-red-700" />} />
            <Kpi label="Overdue" value={formatCurrency(detailQuery.data.kpis.overdueAmount)} icon={<ShieldAlert size={14} className="text-red-700" />} />
            <Kpi label="Avg Days To Pay" value={detailQuery.data.kpis.avgDaysToPay === null ? "-" : String(detailQuery.data.kpis.avgDaysToPay)} icon={<Clock3 size={14} className="text-amber-700" />} />
            <Kpi label="Invoices" value={String(detailQuery.data.kpis.invoiceCount)} icon={<FileText size={14} className="text-stone-700" />} />
          </div>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
            <p className="mb-2 text-[13px] font-medium text-stone-700">Sales and Collections Trend</p>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={detailQuery.data.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edeae1" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                  <Legend />
                  <Line dataKey="sales" stroke="#1a5c2e" strokeWidth={2} dot={false} name="Sales" />
                  <Line dataKey="collections" stroke="#2b2d7e" strokeWidth={2} dot={false} name="Collections" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
            <p className="mb-2 text-[13px] font-medium text-stone-700">Aging Analysis</p>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={detailQuery.data.aging}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edeae1" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                  <Bar dataKey="amount" fill="#b91c1c" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
            <p className="mb-3 text-[13px] font-semibold text-stone-800">Top Products</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead className="text-[11px] uppercase tracking-[0.1em] text-stone-500">
                  <tr className="border-b border-stone-200">
                    <th className="py-2 text-left">Product</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Net Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {detailQuery.data.topProducts.map((p) => (
                    <tr key={p.productId} className="border-b border-stone-100">
                      <td className="py-2 text-stone-700">
                        {p.productCode} - {p.productName}
                      </td>
                      <td className="py-2 text-right text-stone-700">{p.quantity}</td>
                      <td className="py-2 text-right text-emerald-700">{formatCurrency(p.netRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <DataTable
            data={detailQuery.data.openInvoices}
            columns={openInvoiceColumns}
            minWidth={1100}
            hideSearch
            emptyMessage="No open invoices."
          />

          <DataTable
            data={detailQuery.data.transactions}
            columns={txColumns}
            minWidth={980}
            searchPlaceholder="Search transactions..."
            emptyMessage="No transactions in selected period."
          />
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.09em] text-stone-400 font-semibold">{label}</p>
        <p className="text-[17px] leading-tight text-stone-900 font-semibold mt-1">{value}</p>
      </div>
    </div>
  );
}

