"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Loader2 } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import type { ReturnedChequeOptionDto, ReturnedChequesResponse } from "@/types/api";

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

export default function ReturnedChequesPage() {
  const queryClient = useQueryClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [rangeFilter, setRangeFilter] = useState("year");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedRange, setAppliedRange] = useState("year");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(0);

  const returnedChequesQuery = useQuery<ReturnedChequesResponse, Error>({
    queryKey: ["returned-cheques", appliedSearch, appliedRange, appliedStart, appliedEnd, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedSearch.trim()) params.set("search", appliedSearch.trim());
      if (appliedRange !== "all") {
        params.set("range", appliedRange);
        if (appliedRange === "custom") {
          if (appliedStart) params.set("startDate", appliedStart);
          if (appliedEnd) params.set("endDate", appliedEnd);
        }
      }
      params.set("page", String(page + 1));
      params.set("limit", "20");

      const query = params.toString();
      const response = await fetch(`/api/returned-cheques${query ? `?${query}` : ""}`);
      const result = (await response.json()) as ReturnedChequesResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load returned cheques.");
      return result;
    },
  });

  const returnedCheques = returnedChequesQuery.data?.data ?? [];
  const pagination = returnedChequesQuery.data?.pagination;

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/returned-cheques/${id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Failed to revert returned cheque.");
    },
    onSuccess: async () => {
      setPendingDeleteId(null);
      setError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["returned-cheques"] }),
        queryClient.invalidateQueries({ queryKey: ["receipts-list"] }),
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to revert returned cheque.");
    },
  });

  const columns = useMemo<ColumnDef<ReturnedChequeOptionDto>[]>(
    () => [
      {
        accessorKey: "returnDate",
        header: "Return Date",
        cell: ({ row }) => formatDate(row.original.returnDate),
      },
      {
        accessorKey: "receiptNo",
        header: "Receipt #",
        cell: ({ row }) => <span className="font-medium text-[#2b2d7e]">{row.original.receiptNo}</span>,
      },
      {
        accessorKey: "invoiceNo",
        header: "Invoice #",
      },
      {
        accessorKey: "customerName",
        header: "Customer",
      },
      {
        accessorKey: "chequeNo",
        header: "Cheque No",
        cell: ({ row }) => row.original.chequeNo ?? "-",
      },
      {
        accessorKey: "bankName",
        header: "Bank",
        cell: ({ row }) => row.original.bankName ?? "-",
      },
      {
        accessorKey: "amount",
        header: "Amount",
        meta: { align: "right" },
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
      {
        id: "action",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => {
              setError("");
              setPendingDeleteId(row.original.id);
            }}
            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] font-medium text-red-700 hover:bg-red-100"
          >
            Revert
          </button>
        ),
      },
    ],
    [],
  );

  const resolvedPeriod = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    if (appliedRange === "day") {
      // today
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
      const dates = returnedCheques
        .map((x) => new Date(x.returnDate))
        .filter((d) => !Number.isNaN(d.getTime()));
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
  }, [appliedRange, appliedStart, appliedEnd, returnedCheques]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (appliedSearch.trim()) params.set("search", appliedSearch.trim());
      if (appliedRange !== "all") {
        params.set("range", appliedRange);
        if (appliedRange === "custom") {
          if (appliedStart) params.set("startDate", appliedStart);
          if (appliedEnd) params.set("endDate", appliedEnd);
        }
      }
      params.set("page", "1");
      params.set("limit", "100000");

      const query = params.toString();
      const response = await fetch(`/api/returned-cheques${query ? `?${query}` : ""}`);
      const result = (await response.json()) as ReturnedChequesResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load returned cheques for export.");
      const exportRows = result.data ?? [];

      const { exportReturnedChequesToExcel } = await import("@/lib/exportReturnedCheques");
      const rows = exportRows.map((row) => ({
        receiptNo: row.receiptNo,
        chequeNo: row.chequeNo ?? "-",
        chequeAmount: row.amount,
        chequeDate: row.chequeDate ? formatDate(row.chequeDate) : "-",
        returnDate: formatDate(row.returnDate),
        bankName: row.bankName ?? "-",
      }));
      await exportReturnedChequesToExcel({
        fromLabel: formatDate(resolvedPeriod.from),
        toLabel: formatDate(resolvedPeriod.to),
        rows,
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: { msg: `Exported ${rows.length} returned cheques to Excel`, type: "success" },
          }),
        );
      }
    } catch {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: { msg: "Failed to export returned cheques", type: "error" },
          }),
        );
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Sales</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-dmsans)] font-semibold">
            Returned Cheques
          </h1>
          <p className="text-[13px] text-stone-500">Cheque receipts marked as returned with financial reversals.</p>
        </div>
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={isExporting || returnedChequesQuery.isFetching}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2d7a42] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#1a5c2e]"
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
      </header>

      <DataTable
        data={returnedCheques}
        columns={columns}
        minWidth={1200}
        isLoading={returnedChequesQuery.isLoading}
        hideSearch
        emptyMessage="No returned cheque records found."
        initialPageSize={20}
        serverSide={{
          pageIndex: page,
          pageSize: 20,
          pageCount: pagination?.totalPages ?? 1,
          totalRecords: pagination?.total ?? 0,
          onPageChange: (p) => setPage(p),
        }}
        toolbarRight={
          <>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search receipt, invoice, customer, cheque, bank"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e] md:w-80"
            />

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
              type="button"
              onClick={() => {
                setAppliedSearch(searchTerm);
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

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
      ) : null}

      {pendingDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="text-[16px] font-semibold text-stone-900">Revert returned cheque?</h3>
            <p className="mt-2 text-[13px] text-stone-600">
              This will restore the receipt as active payment and remove reversal settlement/commission entries.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(pendingDeleteId)}
                className="rounded-lg bg-red-700 px-3 py-2 text-[13px] font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Reverting..." : "Revert"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
