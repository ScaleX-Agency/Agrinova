"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CommissionRepDetailResponse } from "@/types/api";
import DataTable from "@/components/ui/DataTable";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const toDateInput = (value: Date) => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getIsoWeek = (date: Date) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

type SalesStatus = "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";

const statusConfig = {
  PAID: {
    label: "Paid",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  PARTIAL: {
    label: "Partial",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PENDING: {
    label: "Pending",
    pill: "bg-orange-50 text-orange-700 border-orange-200",
  },
  OVERDUE: {
    label: "Overdue",
    pill: "bg-red-50 text-red-700 border-red-200",
  },
  UNPAID: {
    label: "Unpaid",
    pill: "bg-rose-50 text-rose-700 border-rose-200",
  },
} as const;

const getPeriodKey = (value: string, granularity: "day" | "week" | "month") => {
  const date = new Date(value);
  if (granularity === "day") {
    return toDateInput(date);
  }
  if (granularity === "week") {
    return getIsoWeek(date);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const CommissionRepDetailPage = () => {
  const params = useParams<{ repId: string }>();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<"all" | SalesStatus>("all");

  const repId = Number(params.repId);
  const month = searchParams.get("month");

  const detailQuery = useQuery({
    queryKey: ["commission-detail", repId, month ?? "all"],
    enabled: Number.isInteger(repId) && repId > 0,
    queryFn: async () => {
      const response = await fetch(month ? `/api/commission/${repId}?month=${month}` : `/api/commission/${repId}`);
      const result = (await response.json()) as CommissionRepDetailResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load commission detail.");
      return result.data;
    },
  });

  const rows = detailQuery.data?.rows ?? [];

  const initialDateRange = useMemo(() => {
    if (rows.length === 0) {
      const now = new Date();
      return {
        start: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: toDateInput(now),
      };
    }

    const allDates = rows.flatMap((row) => [row.invoiceDate, row.receiptDate].filter(Boolean) as string[]);
    const sorted = allDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return {
      start: toDateInput(new Date(sorted[0])),
      end: toDateInput(new Date(sorted[sorted.length - 1])),
    };
  }, [rows]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const effectiveStart = startDate || initialDateRange.start;
  const effectiveEnd = endDate || initialDateRange.end;

  const inRange = (value: string | null) => {
    if (!value) return false;
    const time = new Date(value).getTime();
    const startTime = new Date(effectiveStart).getTime();
    const end = new Date(effectiveEnd);
    end.setHours(23, 59, 59, 999);
    return time >= startTime && time <= end.getTime();
  };

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesStatus = statusFilter === "all" ? true : row.salesStatus === statusFilter;
        const hasDateInRange = inRange(row.invoiceDate) || inRange(row.receiptDate);
        return matchesStatus && hasDateInRange;
      }),
    [rows, statusFilter, effectiveStart, effectiveEnd],
  );

  const invoiceMap = useMemo(() => {
    const map = new Map<number, { date: string; customer: string; amount: number; status: SalesStatus; invoiceNo: string }>();
    for (const row of filteredRows) {
      if (!map.has(row.invoiceId)) {
        map.set(row.invoiceId, {
          date: row.invoiceDate,
          customer: row.customerName,
          amount: row.invoiceAmount,
          status: row.salesStatus,
          invoiceNo: row.invoiceNo,
        });
      }
    }
    return map;
  }, [filteredRows]);

  const uniqueInvoices = useMemo(() => Array.from(invoiceMap.entries()), [invoiceMap]);

  const totals = useMemo(() => {
    const totalSales = uniqueInvoices.reduce((sum, [, invoice]) => sum + invoice.amount, 0);
    const totalCollected = filteredRows.reduce((sum, row) => sum + row.cashCollected, 0);
    const outstanding = Math.max(totalSales - totalCollected, 0);
    const totalCommission = filteredRows.reduce((sum, row) => sum + row.commissionAmount, 0);

    return {
      totalSales,
      totalCollected,
      outstanding,
      totalCommission,
    };
  }, [filteredRows, uniqueInvoices]);

  const monthlyData = useMemo(() => {
    const monthly = new Map<string, { label: string; sales: number; commission: number }>();
    for (const [, invoice] of uniqueInvoices) {
      const key = getPeriodKey(invoice.date, "month");
      const [year, monthNumber] = key.split("-").map(Number);
      const existing = monthly.get(key) ?? {
        label: new Date(year, monthNumber - 1, 1).toLocaleDateString("en-GB", {
          month: "short",
          year: "2-digit",
        }),
        sales: 0,
        commission: 0,
      };
      existing.sales += invoice.amount;
      monthly.set(key, existing);
    }

    for (const row of filteredRows) {
      const key = getPeriodKey(row.receiptDate ?? row.invoiceDate, "month");
      const [year, monthNumber] = key.split("-").map(Number);
      const existing = monthly.get(key) ?? {
        label: new Date(year, monthNumber - 1, 1).toLocaleDateString("en-GB", {
          month: "short",
          year: "2-digit",
        }),
        sales: 0,
        commission: 0,
      };
      existing.commission += row.commissionAmount;
      monthly.set(key, existing);
    }

    return Array.from(monthly.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, item]) => ({
        month: item.label,
        sales: Number(item.sales.toFixed(2)),
        commission: Number(item.commission.toFixed(2)),
      }));
  }, [filteredRows, uniqueInvoices]);

  const paymentStatusData = useMemo(() => {
    const amounts: Record<SalesStatus, number> = {
      PAID: 0,
      PARTIAL: 0,
      UNPAID: 0,
      OVERDUE: 0,
    };

    for (const [, invoice] of uniqueInvoices) {
      amounts[invoice.status] += invoice.amount;
    }

    return [
      { name: "Paid", value: Number(amounts.PAID.toFixed(2)), color: "#1a5c2e" },
      { name: "Partial", value: Number(amounts.PARTIAL.toFixed(2)), color: "#c07b1d" },
      { name: "Unpaid", value: Number(amounts.UNPAID.toFixed(2)), color: "#a32d2d" },
      { name: "Overdue", value: Number(amounts.OVERDUE.toFixed(2)), color: "#7f1d1d" },
    ].filter((item) => item.value > 0);
  }, [uniqueInvoices]);

  const customerInsights = useMemo(() => {
    const map = new Map<string, { sales: number; collected: number; invoices: number }>();

    for (const [, invoice] of uniqueInvoices) {
      const existing = map.get(invoice.customer) ?? { sales: 0, collected: 0, invoices: 0 };
      existing.sales += invoice.amount;
      existing.invoices += 1;
      map.set(invoice.customer, existing);
    }

    for (const row of filteredRows) {
      const existing = map.get(row.customerName) ?? { sales: 0, collected: 0, invoices: 0 };
      existing.collected += row.cashCollected;
      map.set(row.customerName, existing);
    }

    return Array.from(map.entries())
      .map(([customer, values]) => ({
        customer,
        invoices: values.invoices,
        totalSales: Number(values.sales.toFixed(2)),
        collected: Number(values.collected.toFixed(2)),
        outstanding: Number(Math.max(values.sales - values.collected, 0).toFixed(2)),
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 8);
  }, [filteredRows, uniqueInvoices]);

  const commissionTableRows = useMemo(
    () =>
      filteredRows
        .map((row) => ({
          key: `COM-${row.commissionId}`,
          commissionId: row.commissionId,
          receiptNo: row.receiptNo,
          invoiceNo: row.invoiceNo,
          invoiceDate: row.invoiceDate,
          dueDate: row.dueDate,
          paidDate: row.paidDate,
          daysToPay: row.daysToPay,
          commissionRate: row.commissionRate,
          commissionAmount: row.commissionAmount,
          status: row.status,
        }))
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
    [filteredRows],
  );

  const commissionColumns: ColumnDef<(typeof commissionTableRows)[number]>[] = [
    {
      accessorKey: "commissionId",
      header: "Commission #",
      cell: ({ row }) => <span className="[font-family:var(--font-jetbrains)] text-[#2b2d7e]">{row.original.commissionId}</span>,
    },
    {
      accessorKey: "receiptNo",
      header: "Receipt #",
      cell: ({ row }) => <span className="[font-family:var(--font-jetbrains)] text-[#2b2d7e]">{row.original.receiptNo ?? "-"}</span>,
    },
    {
      accessorKey: "invoiceNo",
      header: "Invoice #",
      cell: ({ row }) => <span className="[font-family:var(--font-jetbrains)] text-[#2b2d7e]">{row.original.invoiceNo}</span>,
    },
    {
      accessorKey: "invoiceDate",
      header: "Invoice Date",
      cell: ({ row }) => <span className="text-stone-700">{formatDate(row.original.invoiceDate)}</span>,
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => <span className="text-stone-700">{formatDate(row.original.dueDate)}</span>,
    },
    {
      accessorKey: "paidDate",
      header: "Paid Date",
      cell: ({ row }) => <span className="text-stone-700">{row.original.paidDate ? formatDate(row.original.paidDate) : "-"}</span>,
    },
    {
      accessorKey: "daysToPay",
      header: "Days",
      cell: ({ row }) => <span className="text-stone-700">{row.original.daysToPay}</span>,
    },
    {
      accessorKey: "commissionRate",
      header: "Rate",
      cell: ({ row }) => <span className="text-stone-700">{formatPercent(row.original.commissionRate)}</span>,
    },
    {
      accessorKey: "commissionAmount",
      header: "Amount",
      cell: ({ row }) => <span className="font-semibold text-[#1a5c2e]">{formatCurrency(row.original.commissionAmount)}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.status in statusConfig ? (
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusConfig[row.original.status as keyof typeof statusConfig].pill}`}
          >
            {statusConfig[row.original.status as keyof typeof statusConfig].label}
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-600">
            {row.original.status}
          </span>
        ),
    },
  ];

  const customerInsightColumns: ColumnDef<(typeof customerInsights)[number]>[] = [
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => <span className="text-stone-800">{row.original.customer}</span>,
    },
    {
      accessorKey: "invoices",
      header: "Invoices",
      cell: ({ row }) => <span className="text-stone-700">{row.original.invoices}</span>,
    },
    {
      accessorKey: "totalSales",
      header: "Total Sales",
      cell: ({ row }) => <span className="text-stone-700">{formatCurrency(row.original.totalSales)}</span>,
    },
    {
      accessorKey: "collected",
      header: "Collected",
      cell: ({ row }) => <span className="text-stone-700">{formatCurrency(row.original.collected)}</span>,
    },
    {
      accessorKey: "outstanding",
      header: "Outstanding",
      cell: ({ row }) => (
        <span className={row.original.outstanding > 0 ? "font-medium text-red-700" : "text-emerald-700"}>
          {formatCurrency(row.original.outstanding)}
        </span>
      ),
    },
  ];

  return (
    <section className="space-y-5 pb-16">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Commission</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-playfair)] font-semibold">
            {detailQuery.data?.repName ?? "Sales Rep"} Commission
          </h1>
          <p className="text-[13px] text-stone-500">{month ? `Month: ${month}` : "All time"}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[12px] text-stone-600">
            <span className="mr-2">From</span>
            <input
              type="date"
              value={effectiveStart}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-[12px]"
            />
          </label>
          <label className="text-[12px] text-stone-600">
            <span className="mr-2">To</span>
            <input
              type="date"
              value={effectiveEnd}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-[12px]"
            />
          </label>
          <label className="text-[12px] text-stone-600">
            <span className="mr-2">Sales Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | SalesStatus)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-[12px]"
            >
              <option value="all">All</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="UNPAID">Unpaid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </label>
          <Link
            href="/commission"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
          >
            <ArrowLeft size={14} />
            Back to Commission
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Total Sales (LKR)</p>
          <p className="mt-1 text-[20px] leading-none text-stone-900 [font-family:var(--font-playfair)]">
            {formatCurrency(totals.totalSales)}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Total Collected</p>
          <p className="mt-1 text-[20px] leading-none text-stone-900 [font-family:var(--font-playfair)]">
            {formatCurrency(totals.totalCollected)}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Outstanding Amount</p>
          <p className="mt-1 text-[20px] leading-none text-red-700 [font-family:var(--font-playfair)]">
            {formatCurrency(totals.outstanding)}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Total Commission</p>
          <p className="mt-1 text-[20px] leading-none text-[#1a5c2e] [font-family:var(--font-playfair)]">
            {formatCurrency(totals.totalCommission)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 lg:col-span-2">
          <h2 className="mb-3 text-[16px] font-semibold text-[#2b2d7e]">Monthly Breakdown</h2>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 16, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e7e5e4" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#78716c" }} />
                <YAxis tick={{ fontSize: 11, fill: "#78716c" }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                <Legend />
                <Bar dataKey="sales" fill="#2b2d7e" radius={[6, 6, 0, 0]} name="Sales" />
                <Bar dataKey="commission" fill="#1a5c2e" radius={[6, 6, 0, 0]} name="Commission" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="mb-3 text-[16px] font-semibold text-[#2b2d7e]">Payment Behavior</h2>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {paymentStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {paymentStatusData.map((item) => (
              <span
                key={item.name}
                className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}: {formatCurrency(item.value)}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[#2b2d7e]">Commission Table</h2>
          <p className="text-[12px] text-stone-500">Rep-specific commission records</p>
        </div>

        <DataTable
          data={commissionTableRows}
          columns={commissionColumns}
          minWidth={1120}
          searchPlaceholder="Search invoice, receipt, or status"
          emptyMessage="No commission records found for this sales rep."
        />
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="mb-3 text-[16px] font-semibold text-[#2b2d7e]">Customer Insights</h2>
        <DataTable
          data={customerInsights}
          columns={customerInsightColumns}
          minWidth={760}
          searchPlaceholder="Search customer"
          emptyMessage="No customer insight data available for this range."
        />
      </section>

      {detailQuery.isLoading && <p className="text-[13px] text-stone-500">Loading commission detail...</p>}

      {detailQuery.error instanceof Error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {detailQuery.error.message}
        </p>
      )}
    </section>
  );
};

export default CommissionRepDetailPage;
