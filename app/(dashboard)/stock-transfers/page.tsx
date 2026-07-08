"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, Download } from "lucide-react";
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
  const [rangeFilter, setRangeFilter] = useState("year");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [appliedRange, setAppliedRange] = useState("year");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const transfersQuery = useQuery<StockTransfersResponse, Error>({
    queryKey: ["stock-transfers-docs", appliedRange, appliedStart, appliedEnd, page, searchTerm],
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
      params.set("pageSize", "20");
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const query = params.toString();
      const response = await fetch(`/api/stock-transfers?${query}`);
      const result = (await response.json()) as StockTransfersResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load stock transfers.");
      }
      return result;
    },
  });

  const rows = transfersQuery.data?.data ?? [];
  const pagination = transfersQuery.data?.pagination;

  const resolvedPeriod = useMemo(() => {
    let start = new Date();
    let end = new Date();
    const range = appliedRange;
    if (range === "day") {
      start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    } else if (range === "week") {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(start.getFullYear(), start.getMonth(), diff);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    } else if (range === "month") {
      start = new Date(start.getFullYear(), start.getMonth(), 1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    } else if (range === "year") {
      start = new Date(start.getFullYear(), 0, 1);
      end = new Date(start.getFullYear() + 1, 0, 1);
    } else if (range === "custom") {
      start = appliedStart ? new Date(appliedStart) : new Date(0);
      end = appliedEnd ? new Date(appliedEnd) : new Date();
    } else {
      // all time
      const dates = rows.map((r) => new Date(r.transferDate));
      if (dates.length === 0) return { from: "-", to: "-" };
      const min = new Date(Math.min(...dates.map((d) => d.getTime())));
      const max = new Date(Math.max(...dates.map((d) => d.getTime())));
      return { from: min.toISOString().slice(0, 10), to: max.toISOString().slice(0, 10) };
    }
    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    };
  }, [appliedRange, appliedStart, appliedEnd, rows]);

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
      params.set("pageSize", "100000");
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      params.set("includeLines", "true");

      const query = params.toString();
      const response = await fetch(`/api/stock-transfers?${query}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Failed to load stock transfers for export.");
      const exportRows = result.data ?? [];

      const { exportStockTransfersToExcel } = await import("@/lib/exportStockTransfers");
      await exportStockTransfersToExcel({
        fromLabel: resolvedPeriod.from !== "-" ? formatDate(resolvedPeriod.from) : "-",
        toLabel: resolvedPeriod.to !== "-" ? formatDate(resolvedPeriod.to) : "-",
        rows: exportRows,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: { msg: `Exported ${exportRows.length} stock transfers to Excel`, type: "success" },
          }),
        );
      }
    } catch (error: any) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: { msg: error?.message ?? "Failed to export stock transfers", type: "error" },
          }),
        );
      }
    } finally {
      setIsExporting(false);
    }
  };

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
        <div>
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-xl border border-[#c0c3f0] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#2b2d7e] hover:bg-[#eeeffe] disabled:opacity-50"
          >
            <Download size={14} />
            Export Excel
          </button>
        </div>
      </header>

      <DataTable
        data={rows}
        columns={columns}
        minWidth={980}
        isLoading={transfersQuery.isLoading}
        searchPlaceholder="Search transfer no, locations, notes, creator"
        emptyMessage="No stock transfers recorded yet."
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

      {transfersQuery.error instanceof Error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {transfersQuery.error.message}
        </p>
      )}
    </section>
  );
};

export default StockTransfersPage;
