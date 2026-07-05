"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { GoodsIssueNoteOptionDto, GoodsIssueNotesResponse } from "@/types/api";
import DataTable from "@/components/ui/DataTable";

const GIN_STATUS_STYLE: Record<"PENDING" | "ISSUED" | "PARTIAL", string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-100",
  ISSUED: "bg-[#eeeffe] text-[#2b2d7e] border-[#c0c3f0]",
  PARTIAL: "bg-blue-50 text-blue-700 border-blue-100",
};

const GIN_STATUS_LABEL: Record<"PENDING" | "ISSUED" | "PARTIAL", string> = {
  PENDING: "Pending",
  ISSUED: "Issued",
  PARTIAL: "Partial",
};

const formatDate = (value: string) => {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const GoodsIssueNotesPage = () => {
  const [rangeFilter, setRangeFilter] = useState("year");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [appliedRange, setAppliedRange] = useState("year");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);

  const notesQuery = useQuery<GoodsIssueNotesResponse, Error>({
    queryKey: ["goods-issue-notes", appliedRange, appliedStart, appliedEnd, page, searchTerm],
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

      const query = params.toString();
      const response = await fetch(`/api/goods-issue-notes${query ? `?${query}` : ""}`);
      const result = (await response.json()) as GoodsIssueNotesResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load goods issue notes.");
      return result;
    },
  });

  const rows = notesQuery.data?.data ?? [];
  const pagination = notesQuery.data?.pagination;

  const tableColumns: ColumnDef<GoodsIssueNoteOptionDto>[] = [
    {
      accessorKey: "ginNumber",
      header: "GIN #",
      cell: ({ row }) => (
        <span className="font-medium text-[#2b2d7e] [font-family:var(--font-jetbrains)]">{row.original.ginNumber}</span>
      ),
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => <span className="text-stone-700">{formatDate(row.original.date)}</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => <span className="text-stone-800">{row.original.customerName}</span>,
    },
    {
      accessorKey: "locationCode",
      header: "Location",
      cell: ({ row }) => <span className="text-stone-700">{row.original.locationCode}</span>,
    },
    {
      accessorKey: "ginStatus",
      header: "Status",
      cell: ({ row }) => (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${GIN_STATUS_STYLE[row.original.ginStatus]}`}>
          {GIN_STATUS_LABEL[row.original.ginStatus]}
        </span>
      ),
    },
    {
      accessorKey: "lineCount",
      header: "Lines",
      cell: ({ row }) => <span className="text-stone-700">{row.original.lineCount}</span>,
    },
    {
      accessorKey: "invoiceNumber",
      header: "Invoice",
      cell: ({ row }) => (
        <span className="text-stone-700">{row.original.invoiceNumber ?? "Not Linked"}</span>
      ),
    },
    {
      id: "actions",
      header: "Action",
      enableSorting: false,
      cell: ({ row }) => (
        <Link
          href={`/goods-issue-notes/${row.original.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#c0c3f0] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#2b2d7e] hover:bg-[#eeeffe]"
        >
          <Eye size={12} />
          View
        </Link>
      ),
    },
  ];

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Operations</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-dmsans)] font-semibold">
            Goods Issue Notes
          </h1>
          <p className="text-[13px] text-stone-500">Track goods issued against invoices and review line-level details.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
          >
            <FileText size={14} />
            New Invoice
          </Link>
        </div>
      </header>

      <DataTable
        data={rows}
        columns={tableColumns}
        minWidth={940}
        isLoading={notesQuery.isLoading}
        searchPlaceholder="Search GIN no, customer or location"
        emptyMessage="No goods issue notes found yet. Create an invoice and the system will generate the GIN."
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

      {notesQuery.error instanceof Error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {notesQuery.error.message}
        </p>
      )}
    </section>
  );
};

export default GoodsIssueNotesPage;
