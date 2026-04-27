"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
   
  // eslint-disable-next-line
import { Download, Eye, Package, Plus, Printer } from "lucide-react";
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
  const [rangeFilter, setRangeFilter] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [appliedRange, setAppliedRange] = useState("month");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");

  const invoicesQuery = useQuery<InvoiceOptionDto[], Error>({
    queryKey: ["invoices-list", appliedRange, appliedStart, appliedEnd],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedRange !== "all") {
        params.set("range", appliedRange);
        if (appliedRange === "custom") {
          if (appliedStart) params.set("startDate", appliedStart);
          if (appliedEnd) params.set("endDate", appliedEnd);
        }
      }

      const query = params.toString();
      const response = await fetch(`/api/invoices${query ? `?${query}` : ""}`);
      const result = (await response.json()) as InvoicesResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load invoices.");
      return Array.isArray(result.data) ? result.data : [];
   
    },
  });
   

  // eslint-disable-next-line
  const invoices = invoicesQuery.data ?? [];

  const filtered = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const searchMatches =
        needle.length === 0 ||
        [invoice.invoiceNo, invoice.customerName, invoice.repName].join(" ").toLowerCase().includes(needle);

      const paymentMatches = paymentStatusFilter === "ALL" || invoice.status === paymentStatusFilter;
      const ginMatches = ginStatusFilter === "ALL" || invoice.ginStatus === ginStatusFilter;

      return searchMatches && paymentMatches && ginMatches;
    });
  }, [invoices, searchTerm, paymentStatusFilter, ginStatusFilter]);

  const totalValue = filtered.reduce((sum, row) => sum + row.totalAmount, 0);
  const paid = filtered.filter((row) => row.status === "PAID").length;
  const partial = filtered.filter((row) => row.status === "PARTIAL").length;

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
              {invoice.ginStatus === "ISSUED" ? (
                <span
                  className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 px-2.5 py-1.5 text-[12px] font-medium text-stone-400"
                  title="GIN already issued"
                >
                  <Package size={12} />
                  Issue Stocks
                </span>
              ) : (
                <Link
                  href={`/goods-issue-notes/new?invoiceId=${invoice.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a5c2e] px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#2d7a42]"
                >
                  <Package size={12} />
                  Issue Stocks
                </Link>
              )}
              {invoice.status === "PAID" ? (
                <span
                  className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 px-2.5 py-1.5 text-[12px] font-medium text-stone-400"
                  title="Invoice is fully paid"
                >
                  Record Payment
                </span>
              ) : (
                <Link
                  href={`/receipts/new?invoiceId=${invoice.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a5c2e] px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#2d7a42]"
                >
                  Record Payment
                </Link>
              )}
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
          <p className="mt-1 text-[26px] leading-none text-stone-900 [font-family:var(--font-dmsans)]">{filtered.length}</p>
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
        data={filtered}
        columns={tableColumns}
        minWidth={1180}
        isLoading={invoicesQuery.isFetching}
        searchPlaceholder="Search invoices, customer, or sales rep"
        emptyMessage="No invoices match the selected filters."
        toolbarRight={
          <>
            <select
              value={paymentStatusFilter}
              onChange={(event) => setPaymentStatusFilter(event.target.value as StatusFilter)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="UNPAID">Unpaid</option>
              <option value="OVERDUE">Overdue</option>
            </select>

            <select
              value={ginStatusFilter}
              onChange={(event) => setGinStatusFilter(event.target.value as GinStatusFilter)}
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