"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft,
  Phone,
  RefreshCcw,
} from "lucide-react";
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

  const commissionColumns: ColumnDef<DetailResponse["commissionLedger"][number]>[] = [
    { accessorKey: "commissionId", header: "Commission #" },
    { accessorKey: "invoiceNo", header: "Invoice" },
    { accessorKey: "customerName", header: "Customer" },
    {
      accessorKey: "settlementAmount",
      header: "Settlement",
      cell: ({ row }) => (
        <span className={row.original.settlementAmount < 0 ? "font-medium text-red-700" : ""}>
          {formatCurrency(row.original.settlementAmount)}
        </span>
      ),
      meta: { align: "right", className: "border-l border-stone-200", headerClassName: "border-l border-stone-200" },
    },
    {
      accessorKey: "commissionRate",
      header: "Rate",
      cell: ({ row }) => `${row.original.commissionRate.toFixed(2)}%`,
      meta: { align: "right", className: "border-l border-stone-200", headerClassName: "border-l border-stone-200" },
    },
    {
      accessorKey: "commissionAmount",
      header: "Commission",
      cell: ({ row }) => (
        <span className={row.original.commissionAmount < 0 ? "font-medium text-red-700" : ""}>
          {formatCurrency(row.original.commissionAmount)}
        </span>
      ),
      meta: { align: "right", className: "border-l border-stone-200", headerClassName: "border-l border-stone-200" },
    },
    {
      accessorKey: "daysToPay",
      header: "Days",
      meta: { align: "right", className: "border-l border-stone-200", headerClassName: "border-l border-stone-200" },
    },
    {
      accessorKey: "settlementType",
      header: "Type",
      cell: ({ row }) => {
        const isCredit = row.original.settlementType === "CREDIT_NOTE";
        return (
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              isCredit
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-stone-200 bg-stone-50 text-stone-700"
            }`}
          >
            {isCredit ? "Return" : "Payment"}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/commission" className="inline-flex items-center gap-1 text-[12px] text-stone-500 hover:text-stone-700">
            <ArrowLeft size={13} /> Back to Commission
          </Link>
          <h1 className="mt-1 text-[28px] leading-tight text-stone-900 font-semibold">{detailQuery.data?.rep.repName ?? "Sales Rep"}</h1>
          <p className="text-[13px] text-stone-500 mt-1 inline-flex items-center gap-2">
            <Phone size={13} /> {detailQuery.data?.rep.phone ?? "-"} | Assigned Customers: {detailQuery.data?.rep.assignedCustomers ?? "-"}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <div className="h-[420px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
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
          <DataTable 
            data={detailQuery.data.commissionLedger} 
            columns={commissionColumns} 
            minWidth={1300} 
            searchPlaceholder="Search commission, invoice, customer" 
            emptyMessage="No commission records." 
            isLoading={detailQuery.isFetching} 
            rowClassName={(row) => row.settlementType === "CREDIT_NOTE" ? "text-red-700 bg-red-50/40" : ""}
          />
        </>
      )}
    </div>
  );
}
