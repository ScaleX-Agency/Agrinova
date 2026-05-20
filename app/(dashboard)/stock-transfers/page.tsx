"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { StockTransferOptionDto, StockTransfersResponse } from "@/types/api";
import DataTable from "@/components/ui/DataTable";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const StockTransfersPage = () => {
  const [rangeFilter, setRangeFilter] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [appliedRange, setAppliedRange] = useState("month");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");

  const transfersQuery = useQuery({
    queryKey: ["stock-transfers-docs", appliedRange, appliedStart, appliedEnd],
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
      const response = await fetch(`/api/stock-transfers${query ? `?${query}` : ""}`);
      const result = (await response.json()) as StockTransfersResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load stock transfers.");
      }
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const rows = transfersQuery.data ?? [];

  const columns: ColumnDef<StockTransferOptionDto>[] = [
    {
      accessorKey: "transferNo",
      header: "Transfer #",
      cell: ({ row }) => (
        <span className="font-medium text-[#2b2d7e] [font-family:var(--font-jetbrains)]">
          {row.original.transferNo}
        </span>
      ),
    },
    {
      accessorKey: "transferDate",
      header: "Date",
      cell: ({ row }) => <span className="text-stone-700">{formatDate(row.original.transferDate)}</span>,
    },
    {
      id: "fromLocation",
      header: "From",
      cell: ({ row }) => (
        <span className="text-stone-700">{row.original.fromLocationCode} - {row.original.fromLocationName}</span>
      ),
    },
    {
      id: "toLocation",
      header: "To",
      cell: ({ row }) => (
        <span className="text-stone-700">{row.original.toLocationCode} - {row.original.toLocationName}</span>
      ),
    },
    {
      accessorKey: "lineCount",
      header: "Products",
      cell: ({ row }) => <span className="text-stone-700">{row.original.lineCount}</span>,
    },
    {
      accessorKey: "totalQty",
      header: "Total Qty",
      cell: ({ row }) => <span className="text-stone-700">{row.original.totalQty}</span>,
    },
    {
      accessorKey: "createdByName",
      header: "Created By",
      cell: ({ row }) => <span className="text-stone-700">{row.original.createdByName}</span>,
    },
    {
      id: "actions",
      header: "Action",
      enableSorting: false,
      cell: ({ row }) => (
        <Link
          href={`/stock-transfers/${row.original.id}`}
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
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Documents</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-dmsans)] font-semibold">
            Stock Transfers
          </h1>
          <p className="text-[13px] text-stone-500">Review inventory transfer records between locations.</p>
        </div>
      </header>

      <DataTable
        data={rows}
        columns={columns}
        minWidth={980}
        isLoading={transfersQuery.isLoading}
        searchPlaceholder="Search transfer no, locations, or creator"
        emptyMessage="No stock transfer records found yet."
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
              }}
              className="rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#2d7a42]"
            >
              Apply Filter
            </button>
          </>
        }
      />

      {transfersQuery.error instanceof Error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {transfersQuery.error.message}
        </p>
      )}
    </section>
  );
};

export default StockTransfersPage;
