"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
   
  // eslint-disable-next-line
import { Download, Eye, Loader2, Plus, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { InvoiceOptionDto, InvoicesResponse } from "@/types/api";
import DataTable from "@/components/ui/DataTable";

type StatusFilter = "ALL" | InvoiceOptionDto["status"];
type GinStatusFilter = "ALL" | InvoiceOptionDto["ginStatus"];

const STATUS_STYLE: Record<InvoiceOptionDto["status"], string> = {
  PAID: "bg-green-50 text-green-700 border-green-100",
  PARTIAL: "bg-amber-50 text-amber-800 border-amber-100",
  UNPAID: "bg-red-50 text-red-700 border-red-100",
  OVERDUE: "bg-red-50 text-red-700 border-red-100",
};

const STATUS_LABEL: Record<InvoiceOptionDto["status"], string> = {
  PAID: "Paid",
  PARTIAL: "Partial",
  UNPAID: "Unpaid",
  OVERDUE: "Overdue",
};

const GIN_STATUS_STYLE: Record<InvoiceOptionDto["ginStatus"], string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-100",
  ISSUED: "bg-[#eeeffe] text-[#2b2d7e] border-[#c0c3f0]",
  PARTIAL: "bg-blue-50 text-blue-700 border-blue-100",
};

const GIN_STATUS_LABEL: Record<InvoiceOptionDto["ginStatus"], string> = {
  PENDING: "Pending",
  ISSUED: "Issued",
  PARTIAL: "Partial",
};

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

const InvoicesPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<StatusFilter>("ALL");
  const [ginStatusFilter, setGinStatusFilter] = useState<GinStatusFilter>("ALL");
  const [repFilter, setRepFilter] = useState("ALL");
  const [rangeFilter, setRangeFilter] = useState("year");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [appliedRange, setAppliedRange] = useState("year");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const [page, setPage] = useState(0);

  const salesRepsQuery = useQuery({
    queryKey: ["sales-reps-all"],
    queryFn: async () => {
      const response = await fetch("/api/sales-reps");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Failed to load sales reps.");
      return (result.salesReps ?? []) as { rep_id: number; full_name: string }[];
    },
  });

  const invoicesQuery = useQuery<InvoicesResponse, Error>({
    queryKey: [
      "invoices-list",
      appliedRange,
      appliedStart,
      appliedEnd,
      page,
      searchTerm,
      paymentStatusFilter,
      ginStatusFilter,
      repFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedRange !== "all") {
        params.set("range", appliedRange);
        if (appliedRange === "custom") {
          if (appliedStart) params.set("startDate", appliedStart);
          if (appliedEnd) params.set("endDate", appliedEnd);
        }
      }
      params.set("page", String(page + 1));
      params.set("limit", "20");
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (paymentStatusFilter !== "ALL") params.set("paymentStatus", paymentStatusFilter);
      if (ginStatusFilter !== "ALL") params.set("ginStatus", ginStatusFilter);
      if (repFilter !== "ALL") params.set("repId", repFilter);

      const query = params.toString();
      const response = await fetch(`/api/invoices${query ? `?${query}` : ""}`);
      const result = (await response.json()) as InvoicesResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load invoices.");
      return result;
    },
  });

  const invoices = invoicesQuery.data?.data ?? [];
  const pagination = invoicesQuery.data?.pagination;
  const stats = invoicesQuery.data?.stats;

  const totalValue = stats?.totalValue ?? 0;
  const paid = stats?.paidCount ?? 0;
  const partial = stats?.partialCount ?? 0;

  const resolvedPeriod = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    if (appliedRange === "day") {
      // keep today
    } else if (appliedRange === "week") {
      const day = now.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      start.setDate(now.getDate() - diffToMonday);
    } else if (appliedRange === "month") {
      start.setDate(1);
    } else if (appliedRange === "year") {
      start.setMonth(0, 1);
    } else if (appliedRange === "custom" && appliedStart && appliedEnd) {
      return { from: appliedStart, to: appliedEnd };
    } else if (appliedRange === "all") {
      const dates = invoices.map((x) => new Date(x.invoiceDate)).filter((d) => !Number.isNaN(d.getTime()));
      if (dates.length === 0) {
        const today = new Date().toISOString().slice(0, 10);
        return { from: today, to: today };
      }
      const min = new Date(Math.min(...dates.map((d) => d.getTime())));
      const max = new Date(Math.max(...dates.map((d) => d.getTime())));
      return { from: min.toISOString().slice(0, 10), to: max.toISOString().slice(0, 10) };
    }
    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    };
  }, [appliedRange, appliedStart, appliedEnd, invoices]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (appliedRange !== "all") {
        params.set("range", appliedRange);
        if (appliedRange === "custom") {
          if (appliedStart) params.set("startDate", appliedStart);
          if (appliedEnd) params.set("endDate", appliedEnd);
        }
      }
      params.set("page", "1");
      params.set("limit", "100000");
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (paymentStatusFilter !== "ALL") params.set("paymentStatus", paymentStatusFilter);
      if (ginStatusFilter !== "ALL") params.set("ginStatus", ginStatusFilter);
      if (repFilter !== "ALL") params.set("repId", repFilter);

      const query = params.toString();
      const response = await fetch(`/api/invoices${query ? `?${query}` : ""}`);
      const result = (await response.json()) as InvoicesResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load invoices for export.");
      const exportRows = result.data ?? [];

      const { exportInvoicesToExcel } = await import("@/lib/exportInvoices");
      await exportInvoicesToExcel({
        fromLabel: formatDate(resolvedPeriod.from),
        toLabel: formatDate(resolvedPeriod.to),
        rows: exportRows.map((row) => ({
          customerName: row.customerName,
          invoiceNo: row.invoiceNo,
          repName: row.repName,
          date: formatDate(row.invoiceDate),
          amount: Math.max(0, row.totalAmount - row.creditedAmount),
        })),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: { msg: `Exported ${exportRows.length} invoices to Excel`, type: "success" },
          }),
        );
      }
    } catch {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: { msg: "Failed to export invoices", type: "error" },
          }),
        );
      }
    } finally {
      setIsExporting(false);
    }
  };

  const tableColumns = useMemo<ColumnDef<InvoiceOptionDto>[]>(
    () => [
      {
        accessorKey: "invoiceNo",
        header: "Invoice #",
        cell: ({ row }) => (
          <span className="font-medium text-[#2b2d7e] [font-family:var(--font-jetbrains)]">
            {row.original.invoiceNo}
          </span>
        ),
      },
      {
        accessorKey: "invoiceDate",
        header: "Date",
        cell: ({ row }) => <span className="text-stone-700">{formatDate(row.original.invoiceDate)}</span>,
      },
      {
        accessorKey: "customerName",
        header: "Customer",
        cell: ({ row }) => <span className="text-stone-800">{row.original.customerName}</span>,
      },
      {
        accessorKey: "repName",
        header: "Sales Rep",
        cell: ({ row }) => <span className="text-stone-700">{row.original.repName}</span>,
      },
      {
        accessorKey: "totalAmount",
        header: "Amount (LKR)",
        meta: { align: "right" },
        cell: ({ row }) => <span className="text-stone-900">{formatCurrency(row.original.totalAmount)}</span>,
      },
      {
        accessorKey: "status",
        header: "Payment Status",
        meta: { align: "center" },
        cell: ({ row }) => (
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLE[row.original.status]}`}>
            {STATUS_LABEL[row.original.status]}
          </span>
        ),
      },
      {
        accessorKey: "ginStatus",
        header: "GIN Status",
        meta: { align: "center" },
        cell: ({ row }) => (
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${GIN_STATUS_STYLE[row.original.ginStatus]}`}>
            {GIN_STATUS_LABEL[row.original.ginStatus]}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Action",
        enableSorting: false,
        meta: { align: "center" },
        cell: ({ row }) => {
          const invoice = row.original;
          return (
            <div className="flex items-center justify-center gap-2">
              <Link
                href={`/invoices/${invoice.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#c0c3f0] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#2b2d7e] hover:bg-[#eeeffe]"
              >
                <Eye size={12} />
                View
              </Link>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Sales</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-dmsans)] font-semibold">
            Invoices
          </h1>
          <p className="text-[13px] text-stone-500">Live invoice records from the backend.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2d7a42] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#1a5c2e]"
          >
            {isExporting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={14} />
                Export Excel
              </>
            )}
          </button>
          
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
          >
            <Plus size={14} />
            New Invoice
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Total Invoices</p>
          <p className="mt-1 text-[26px] leading-none text-stone-900 [font-family:var(--font-dmsans)]">
            {pagination?.total ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Paid</p>
          <p className="mt-1 text-[26px] leading-none text-[#1a5c2e] [font-family:var(--font-dmsans)]">{paid}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Partial</p>
          <p className="mt-1 text-[26px] leading-none text-amber-700 [font-family:var(--font-dmsans)]">{partial}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Total Value</p>
          <p className="mt-1 text-[26px] leading-none text-stone-900 [font-family:var(--font-dmsans)]">
            {formatCurrency(totalValue)}
          </p>
        </div>
      </div>

      <DataTable
        data={invoices}
        columns={tableColumns}
        minWidth={1180}
        isLoading={invoicesQuery.isFetching}
        searchPlaceholder="Search invoices, customer, or sales rep"
        emptyMessage="No invoices match the selected filters."
        initialPageSize={20}
        serverSide={{
          pageIndex: page,
          pageSize: 20,
          pageCount: pagination?.totalPages ?? 1,
          totalRecords: pagination?.total ?? 0,
          onPageChange: (p) => setPage(p),
          searchTerm: searchTerm,
          onSearchChange: (s) => {
            setSearchTerm(s);
            setPage(0);
          },
        }}
        toolbarRight={
          <>
            <select
              value={paymentStatusFilter}
              onChange={(event) => {
                setPaymentStatusFilter(event.target.value as StatusFilter);
                setPage(0);
              }}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="UNPAID">Unpaid</option>
              <option value="OVERDUE">Overdue</option>
            </select>

            <select
              value={repFilter}
              onChange={(event) => {
                setRepFilter(event.target.value);
                setPage(0);
              }}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
            >
              <option value="ALL">All Sales Reps</option>
              {salesRepsQuery.data?.map((rep) => (
                <option key={rep.rep_id} value={rep.rep_id.toString()}>
                  {rep.full_name}
                </option>
              ))}
            </select>

            <select
              value={ginStatusFilter}
              onChange={(event) => {
                setGinStatusFilter(event.target.value as GinStatusFilter);
                setPage(0);
              }}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
            >
              <option value="ALL">All GIN Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ISSUED">Issued</option>
              <option value="PARTIAL">Partial</option>
            </select>

            <select
              value={rangeFilter}
              onChange={(event) => setRangeFilter(event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
            >
              <option value="all">All Time</option>
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>

            {rangeFilter === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
                />
                <span className="text-[12px] text-stone-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
                />
              </div>
            )}
            <button
              onClick={() => {
                setAppliedRange(rangeFilter);
                setAppliedStart(customStart);
                setAppliedEnd(customEnd);
                setPage(0);
              }}
              className="rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#2d7a42]"
            >
              Apply Filter
            </button>
          </>
        }
      />

      {invoicesQuery.error instanceof Error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {invoicesQuery.error.message}
        </p>
      )}
    </section>
  );
};

export default InvoicesPage;
