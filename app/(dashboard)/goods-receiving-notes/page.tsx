"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, PackagePlus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { GoodsReceivingNotesResponse } from "@/types/api";
import DataTable from "@/components/ui/DataTable";

const ENTRY_TYPE_STYLE: Record<"LOCAL_PURCHASE" | "FOREIGN_IMPORT", string> = {
  LOCAL_PURCHASE: "bg-green-50 text-green-700 border-green-100",
  FOREIGN_IMPORT: "bg-blue-50 text-blue-700 border-blue-100",
};

const ENTRY_TYPE_LABEL: Record<"LOCAL_PURCHASE" | "FOREIGN_IMPORT", string> = {
  LOCAL_PURCHASE: "Local Purchase",
  FOREIGN_IMPORT: "Foreign Import",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

type GoodsReceivingRow = NonNullable<GoodsReceivingNotesResponse["data"]>[number];

const GoodsReceivingNotesPage = () => {
  const [rangeFilter, setRangeFilter] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [appliedRange, setAppliedRange] = useState("month");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");

  const notesQuery = useQuery({
    queryKey: ["goods-receiving-notes", appliedRange, appliedStart, appliedEnd],
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
      const response = await fetch(`/api/goods-receiving-notes${query ? `?${query}` : ""}`);
      const result = (await response.json()) as GoodsReceivingNotesResponse;
      if (!response.ok) {
        throw new Error(
          result.error ?? "Failed to load goods receiving notes.",
        );
      }
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const rows = notesQuery.data ?? [];
  const tableColumns = useMemo<ColumnDef<GoodsReceivingRow>[]>(
    () => [
      {
        accessorKey: "grnNumber",
        header: "GRN #",
        cell: ({ row }) => (
          <span className="font-medium text-[#2b2d7e] [font-family:var(--font-jetbrains)]">
            {row.original.grnNumber}
          </span>
        ),
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => <span className="text-stone-700">{formatDate(row.original.date)}</span>,
      },
      {
        accessorKey: "entryType",
        header: "Entry Type",
        cell: ({ row }) => (
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${ENTRY_TYPE_STYLE[row.original.entryType]}`}>
            {ENTRY_TYPE_LABEL[row.original.entryType]}
          </span>
        ),
      },
      {
        id: "location",
        header: "Location",
        cell: ({ row }) => (
          <span className="text-stone-700">{row.original.locationCode} - {row.original.locationName}</span>
        ),
      },
      {
        accessorKey: "referenceNo",
        header: "Reference",
        cell: ({ row }) => <span className="text-stone-700">{row.original.referenceNo ?? "-"}</span>,
      },
      {
        accessorKey: "lineCount",
        header: "Lines",
        cell: ({ row }) => <span className="text-stone-700">{row.original.lineCount}</span>,
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
            href={`/goods-receiving-notes/${row.original.id}`}
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
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
            Inventory
          </p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-dmsans)] font-semibold">
            Goods Receiving Notes
          </h1>
          <p className="text-[13px] text-stone-500">
            Review all stock receipts created from new stock entries.
          </p>
        </div>

        <Link
          href="/stock-entries/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
        >
          <PackagePlus size={14} />
          New Stock Entry
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <DataTable
        data={rows}
        columns={tableColumns}
        minWidth={980}
        isLoading={notesQuery.isLoading}
        searchPlaceholder="Search GRN no, location, reference, or creator"
        emptyMessage="No goods receiving notes found yet. Save a new stock entry to create the first one."
      />

      {notesQuery.error instanceof Error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {notesQuery.error.message}
        </p>
      )}
    </section>
  );
};

export default GoodsReceivingNotesPage;
