"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
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
import {
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import DataTable from "@/components/ui/DataTable";

type PeriodType = "daily" | "monthly" | "yearly" | "custom";

type DetailResponse = {
  rep: {
    repId: number;
    repName: string;
    phone: string | null;
    assignedCustomers: number;
  };
  period: { startDate: string; endDate: string; label: string };
  kpis: {
    lifetimeSales: number;
    periodNetSales: number;
    collections: number;
    outstanding: number;
    overdueAmount: number;
    avgDaysToCollect: number | null;
    invoiceCount: number;
    approvedCommission: number;
    pendingCommission: number;
  };
  trend: Array<{ label: string; sales: number; collections: number }>;
  aging: Array<{ bucket: string; amount: number }>;
  topProducts: Array<{ productId: number; productCode: string; productName: string; quantity: number; netRevenue: number }>;
  locationBreakdown: Array<{ locationId: number; locationCode: string; locationName: string; netSales: number; collections: number; outstanding: number }>;
  customerPerformance: Array<{ customerId: number; customerName: string; invoiceCount: number; netSales: number; collections: number; outstanding: number; overdueAmount: number; lastInvoiceDate: string | null }>;
  openInvoices: Array<{ invoiceId: number; invoiceNumber: string; customerName: string; invoiceDate: string; total: number; paid: number; credited: number; balance: number; daysOutstanding: number; status: string }>;
  commissionLedger: Array<{ commissionId: number; settlementId: number | null; settlementType: string | null; settlementDate: string | null; invoiceNo: string | null; customerName: string | null; settlementAmount: number; commissionRate: number; commissionAmount: number; daysToPay: number; status: string; createdAt: string }>;
  pendingCommissionRows: Array<{ settlementId: number; settlementType: string; invoiceId: number; invoiceNo: string; customerName: string; receiptId: number | null; receiptDate: string | null; settlementDate: string; settlementAmount: number }>;
  transactions: Array<{ type: "invoice" | "receipt" | "credit"; id: number; reference: string; date: string; amount: number; status: string }>;
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

export default function CommissionRepDetailPage() {
  const params = useParams<{ repId: string }>();
  const repId = Number(params.repId);

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
    queryKey: ["sales-rep-sales-detail", repId, filters],
    queryFn: async () => {
      const response = await fetch(`/api/sales-rep-sales/${repId}?${queryString}`, { cache: "no-store" });
      const data = (await response.json()) as DetailResponse | { error?: string };
      if (!response.ok) throw new Error((data as { error?: string }).error ?? "Failed to load sales rep detail.");
      return data as DetailResponse;
    },
    enabled: Number.isInteger(repId) && repId > 0,
  });

  const reset = () => {
    setPeriodType("monthly");
    setDate(todayISO());
    setMonth(monthISO());
    setYear(yearISO());
    setFrom(todayISO());
    setTo(todayISO());
  };

  const customerColumns: ColumnDef<DetailResponse["customerPerformance"][number]>[] = [
    { accessorKey: "customerName", header: "Customer" },
    { accessorKey: "invoiceCount", header: "Invoices", meta: { align: "right" } },
    { accessorKey: "netSales", header: "Net Sales", cell: ({ row }) => formatCurrency(row.original.netSales), meta: { align: "right" } },
    { accessorKey: "collections", header: "Collections", cell: ({ row }) => formatCurrency(row.original.collections), meta: { align: "right" } },
    { accessorKey: "outstanding", header: "Outstanding", cell: ({ row }) => formatCurrency(row.original.outstanding), meta: { align: "right" } },
    { accessorKey: "overdueAmount", header: "Overdue", cell: ({ row }) => formatCurrency(row.original.overdueAmount), meta: { align: "right" } },
    { accessorKey: "lastInvoiceDate", header: "Last Invoice", cell: ({ row }) => formatDate(row.original.lastInvoiceDate) },
  ];

  const openInvoiceColumns: ColumnDef<DetailResponse["openInvoices"][number]>[] = [
    { accessorKey: "invoiceNumber", header: "Invoice" },
    { accessorKey: "customerName", header: "Customer" },
    { accessorKey: "invoiceDate", header: "Date", cell: ({ row }) => formatDate(row.original.invoiceDate) },
    { accessorKey: "total", header: "Total", cell: ({ row }) => formatCurrency(row.original.total), meta: { align: "right" } },
    { accessorKey: "paid", header: "Paid", cell: ({ row }) => formatCurrency(row.original.paid), meta: { align: "right" } },
    { accessorKey: "credited", header: "Credited", cell: ({ row }) => formatCurrency(row.original.credited), meta: { align: "right" } },
    { accessorKey: "balance", header: "Balance", cell: ({ row }) => <span className="text-red-700 font-medium">{formatCurrency(row.original.balance)}</span>, meta: { align: "right" } },
    { accessorKey: "daysOutstanding", header: "Days", meta: { align: "right" } },
    { accessorKey: "status", header: "Status" },
  ];

  const commissionColumns: ColumnDef<DetailResponse["commissionLedger"][number]>[] = [
    { accessorKey: "commissionId", header: "Commission #" },
    { accessorKey: "settlementType", header: "Type" },
    { accessorKey: "invoiceNo", header: "Invoice" },
    { accessorKey: "customerName", header: "Customer" },
    { accessorKey: "settlementAmount", header: "Settlement", cell: ({ row }) => formatCurrency(row.original.settlementAmount), meta: { align: "right" } },
    { accessorKey: "commissionRate", header: "Rate", cell: ({ row }) => `${row.original.commissionRate.toFixed(2)}%`, meta: { align: "right" } },
    { accessorKey: "commissionAmount", header: "Commission", cell: ({ row }) => formatCurrency(row.original.commissionAmount), meta: { align: "right" } },
    { accessorKey: "daysToPay", header: "Days", meta: { align: "right" } },
    { accessorKey: "status", header: "Status" },
  ];

  const transactionColumns: ColumnDef<DetailResponse["transactions"][number]>[] = [
    { accessorKey: "type", header: "Type" },
    { accessorKey: "reference", header: "Reference" },
    { accessorKey: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount), meta: { align: "right" } },
    { accessorKey: "status", header: "Status" },
  ];

  const pieData = useMemo(() => {
    if (!detailQuery.data) return [];
    return [
      { name: "Collected", value: detailQuery.data.kpis.collections, color: "#1a5c2e" },
      { name: "Outstanding", value: detailQuery.data.kpis.outstanding, color: "#dc2626" },
    ].filter((item) => item.value > 0);
  }, [detailQuery.data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/commission" className="inline-flex items-center gap-1 text-[12px] text-stone-500 hover:text-stone-700">
            <ArrowLeft size={13} /> Back to Sales Rep Sales
          </Link>
          <h1 className="mt-1 text-[28px] leading-tight text-stone-900 font-semibold">{detailQuery.data?.rep.repName ?? "Sales Rep"}</h1>
          <p className="text-[13px] text-stone-500 mt-1 inline-flex items-center gap-2">
            <Phone size={13} /> {detailQuery.data?.rep.phone ?? "-"} | Assigned Customers: {detailQuery.data?.rep.assignedCustomers ?? "-"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/invoices" className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50">
            <FileText size={13} /> Invoices
          </Link>
          <Link href="/receipts" className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50">
            <CreditCard size={13} /> Receipts
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => (
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-8">
            <Kpi label="Lifetime Sales" value={formatCurrency(detailQuery.data.kpis.lifetimeSales)} icon={<TrendingUp size={14} className="text-emerald-700" />} />
            <Kpi label="Period Sales" value={formatCurrency(detailQuery.data.kpis.periodNetSales)} icon={<CalendarRange size={14} className="text-blue-700" />} />
            <Kpi label="Collections" value={formatCurrency(detailQuery.data.kpis.collections)} icon={<CheckCircle2 size={14} className="text-emerald-700" />} />
            <Kpi label="Outstanding" value={formatCurrency(detailQuery.data.kpis.outstanding)} icon={<HandCoins size={14} className="text-red-700" />} />
            <Kpi label="Overdue" value={formatCurrency(detailQuery.data.kpis.overdueAmount)} icon={<ShieldAlert size={14} className="text-red-700" />} />
            <Kpi label="Avg Days" value={detailQuery.data.kpis.avgDaysToCollect === null ? "-" : String(detailQuery.data.kpis.avgDaysToCollect)} icon={<Clock3 size={14} className="text-amber-700" />} />
            <Kpi label="Approved Comm." value={formatCurrency(detailQuery.data.kpis.approvedCommission)} icon={<CheckCircle2 size={14} className="text-violet-700" />} />
            <Kpi label="Pending Comm." value={formatCurrency(detailQuery.data.kpis.pendingCommission)} icon={<Clock3 size={14} className="text-violet-700" />} />
          </div>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
            <p className="mb-2 text-[13px] font-medium text-stone-700">Collected vs Outstanding</p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                  <Legend />
                </PieChart>
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

          <DataTable data={detailQuery.data.customerPerformance} columns={customerColumns} minWidth={1180} searchPlaceholder="Search customer" emptyMessage="No customer performance data." />
          <DataTable data={detailQuery.data.openInvoices} columns={openInvoiceColumns} minWidth={1300} hideSearch emptyMessage="No open invoices." />
          <DataTable data={detailQuery.data.commissionLedger} columns={commissionColumns} minWidth={1300} searchPlaceholder="Search commission, invoice, customer" emptyMessage="No commission records." />
          <DataTable data={detailQuery.data.transactions} columns={transactionColumns} minWidth={980} searchPlaceholder="Search transactions" emptyMessage="No transactions in selected period." />
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
