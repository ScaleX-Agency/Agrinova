"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
   
  // eslint-disable-next-line
import { Download, Eye, Plus, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { ReceiptMethod, ReceiptOptionDto, ReceiptsResponse } from "@/types/api";
import DataTable from "@/components/ui/DataTable";

type MethodFilter = "ALL" | ReceiptMethod;

const METHOD_LABEL: Record<ReceiptMethod, string> = {
  CASH: "Cash",
  CHEQUE: "Cheque",
  BANK_TRANSFER: "Bank Transfer",
};

const METHOD_STYLE: Record<ReceiptMethod, string> = {
  CASH: "bg-green-50 text-green-700 border-green-100",
  CHEQUE: "bg-amber-50 text-amber-800 border-amber-100",
  BANK_TRANSFER: "bg-blue-50 text-blue-700 border-blue-100",
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

const ReceiptsClient = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("ALL");
  const [rangeFilter, setRangeFilter] = useState("year");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [appliedRange, setAppliedRange] = useState("year");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [page, setPage] = useState(0);

  const receiptsQuery = useQuery<ReceiptsResponse, Error>({
    queryKey: [
      "receipts-list",
      appliedRange,
      appliedStart,
      appliedEnd,
      page,
      searchTerm,
      methodFilter,
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
      if (methodFilter !== "ALL") params.set("paymentMethod", methodFilter);

      const query = params.toString();
      const response = await fetch(`/api/receipts${query ? `?${query}` : ""}`);
      const result = (await response.json()) as ReceiptsResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load receipts.");
      return result;
    },
  });

  const receipts = receiptsQuery.data?.data ?? [];
  const pagination = receiptsQuery.data?.pagination;
  const stats = receiptsQuery.data?.stats;

  const totalValidCollected = stats?.totalCollected ?? 0;

  const tableColumns = useMemo<ColumnDef<ReceiptOptionDto>[]>(
    () => [
      {
        accessorKey: "receiptNo",
        header: "Receipt #",
        cell: ({ row }) => (
          <span className="font-medium text-[#2b2d7e] [font-family:var(--font-jetbrains)]">
            {row.original.receiptNo}
          </span>
        ),
      },
      {
        accessorKey: "receiptDate",
        header: "Date",
        cell: ({ row }) => <span className="text-stone-700">{formatDate(row.original.receiptDate)}</span>,
      },
      {
        accessorKey: "invoiceNo",
        header: "Invoice",
        cell: ({ row }) => <span className="text-stone-700">{row.original.invoiceNo}</span>,
      },
      {
        accessorKey: "customerName",
        header: "Customer",
        cell: ({ row }) => <span className="text-stone-800">{row.original.customerName}</span>,
      },
      {
        accessorKey: "amountReceived",
        header: "Amount (LKR)",
        meta: { align: "right" },
        cell: ({ row }) => <span className="text-stone-900">{formatCurrency(row.original.amountReceived)}</span>,
      },
      {
        accessorKey: "paymentMethod",
        header: "Method",
        cell: ({ row }) => (
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${METHOD_STYLE[row.original.paymentMethod]}`}>
            {METHOD_LABEL[row.original.paymentMethod]}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.isReturned ? (
            <span className="inline-flex rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700">
              Returned
            </span>
          ) : (
            <span className="inline-flex rounded-full border border-green-100 bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700">
              Active
            </span>
          ),
      },
      {
        id: "actions",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`/receipts/${row.original.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#c0c3f0] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#2b2d7e] hover:bg-[#eeeffe]"
          >
            <Eye size={12} />
            View
          </Link>
        ),
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
            Receipts
          </h1>
          <p className="text-[13px] text-stone-500">Payment receipts recorded against invoices.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
          >
            <Plus size={14} />
            Record Payment
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Total Receipts</p>
          <p className="mt-1 text-[26px] leading-none text-stone-900 [font-family:var(--font-dmsans)]">
            {pagination?.total ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 lg:col-span-2">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Total Collected</p>
          <p className="mt-1 text-[26px] leading-none text-[#1a5c2e] [font-family:var(--font-dmsans)]">
            {formatCurrency(totalValidCollected)}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Cash Receipts</p>
          <p className="mt-1 text-[26px] leading-none text-stone-900 [font-family:var(--font-dmsans)]">
            {stats?.cashCount ?? 0}
          </p>
        </div>
      </div>

      <DataTable
        data={receipts}
        columns={tableColumns}
        minWidth={1080}
        isLoading={receiptsQuery.isLoading}
        searchPlaceholder="Search receipt no, invoice no, or customer"
        emptyMessage="No receipts match the selected filters."
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
              value={methodFilter}
              onChange={(event) => {
                setMethodFilter(event.target.value as MethodFilter);
                setPage(0);
              }}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
            >
              <option value="ALL">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
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
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
                />
                <span className="text-[12px] text-stone-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
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

      {receiptsQuery.error instanceof Error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {receiptsQuery.error.message}
        </p>
      )}
    </section>
  );
};

export default ReceiptsClient;
