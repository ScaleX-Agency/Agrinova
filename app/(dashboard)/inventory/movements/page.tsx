"use client";
// app/(dashboard)/inventory/movements/page.tsx
// Mock data removed. Data comes from useAllMovements() → GET /api/stock-movements.

import { useMemo, useState } from "react";
import { Activity, Download, Search, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAllMovements } from "@/hooks/useInventory";
import type { MovementRow, MovementType } from "@/types/inventory";
import type { UnusableStockSummaryResponse } from "@/types/api";

type FilterType   = MovementType | "ALL";

const TYPE_BADGE: Record<MovementType, string> = {
  ISSUE:      "bg-blue-50   text-blue-800",
  RETURN:     "bg-teal-50   text-teal-700",
  PURCHASE:   "bg-green-50  text-green-700",
  ADJUSTMENT: "bg-amber-50  text-amber-800",
  RETURN_UNUSABLE: "bg-rose-50 text-rose-700",
  ISSUE_REVERSAL: "bg-indigo-50 text-indigo-700",
  RETURN_REVERSAL: "bg-orange-50 text-orange-700",
  PURCHASE_REVERSAL: "bg-yellow-50 text-yellow-700",
  RETURN_UNUSABLE_REVERSAL: "bg-pink-50 text-pink-700",
};
const TYPE_LABELS: Record<FilterType, string> = {
  ALL: "All",
  ISSUE: "Issue",
  RETURN: "Return",
  PURCHASE: "Purchase",
  ADJUSTMENT: "Adjustment",
  RETURN_UNUSABLE: "Return Unusable",
  ISSUE_REVERSAL: "Issue Reversal",
  RETURN_REVERSAL: "Return Reversal",
  PURCHASE_REVERSAL: "Purchase Reversal",
  RETURN_UNUSABLE_REVERSAL: "Return Unusable Reversal",
};
const TYPES: FilterType[] = [
  "ALL",
  "ISSUE",
  "RETURN",
  "PURCHASE",
  "ADJUSTMENT",
  "RETURN_UNUSABLE",
  "ISSUE_REVERSAL",
  "RETURN_REVERSAL",
  "PURCHASE_REVERSAL",
  "RETURN_UNUSABLE_REVERSAL",
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

import Pagination from "rc-pagination";
import "rc-pagination/assets/index.css";

export default function MovementsPage() {
  const [page, setPage] = useState(1);
  // eslint-disable-next-line
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");
  const [search, setSearch] = useState("");

  const { data: response = { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }, isLoading } = useAllMovements({
    page,
    pageSize,
    movement_type: typeFilter !== "ALL" ? typeFilter : undefined,
    search: search || undefined
  });
   

  // eslint-disable-next-line
  const filtered = response.items || [];
  const unusableStockQuery = useQuery<number, Error>({
    queryKey: ["unusable-stock-summary-total"],
    queryFn: async () => {
      const response = await fetch("/api/unusable-stock");
      const result = (await response.json()) as UnusableStockSummaryResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load unusable stock summary.");
      }
      return result.data?.totalUnusableQty ?? 0;
    },
  });

  // With pagination, total stats are only approximate for the current page unless fetched separately.
  // For simplicity, we show current page stats here or omit them. We will show overall total from pagination.
  const stats = useMemo(() => ({
    total:     response.pagination.total,
    issues:    filtered.filter((m: MovementRow) => m.movement_type === "ISSUE").length,
    purchases: filtered.filter((m: MovementRow) => m.movement_type === "PURCHASE").length,
    returns:   filtered.filter((m: MovementRow) => m.movement_type === "RETURN").length,
  }), [response, filtered]);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)] mb-1">
            Inventory
          </p>
          <h1 className="text-[26px] font-semibold text-stone-900 [font-family:var(--font-dmsans)] leading-tight">
            Movements Log
          </h1>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            Full history of stock issues, returns, purchases and adjustments
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Records", value: stats.total,     accent: "bg-stone-50 border-stone-200", text: "text-stone-700" },
          { label: "Issues",        value: stats.issues,    accent: "bg-blue-50 border-blue-100",   text: "text-blue-800"  },
          { label: "Purchases",     value: stats.purchases, accent: "bg-green-50 border-green-100", text: "text-green-700" },
          { label: "Returns",       value: stats.returns,   accent: "bg-teal-50 border-teal-100",   text: "text-teal-700"  },
          { label: "Unusable Qty",  value: unusableStockQuery.data ?? 0, accent: "bg-rose-50 border-rose-100", text: "text-rose-700" },
        ].map((s) => (
          <div key={s.label} className={`border rounded-2xl p-4 ${s.accent}`}>
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">
              {s.label}
            </p>
            <p className={`text-[28px] font-semibold [font-family:var(--font-dmsans)] leading-none mt-1 ${s.text}`}>
              {isLoading ? "—" : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative w-[220px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            className="w-full pl-9 pr-3 py-2 text-[13px] border border-stone-200 rounded-xl bg-white placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 transition-all [font-family:var(--font-dmsans)]"
            placeholder="Search product…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex border border-stone-200 rounded-xl overflow-hidden bg-white">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(1); }}
              className={`px-3 py-2 text-[12px] font-medium border-r border-stone-200 last:border-r-0 transition-colors [font-family:var(--font-dmsans)] ${
                typeFilter === t ? "bg-green-700 text-white" : "text-stone-500 hover:bg-stone-50"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-stone-400 [font-family:var(--font-dmsans)]">
          {filtered.length} records
        </span>
        <button className="ml-auto flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-stone-500 border border-stone-200 rounded-xl bg-white hover:bg-stone-50 [font-family:var(--font-dmsans)]">
          <Download size={12} /> Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-stone-400" />
            <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">All Movements</span>
          </div>
          <span className="text-[11px] text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full [font-family:var(--font-dmsans)]">
            {filtered.length} records
          </span>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-stone-100">
              {["Date", "Type", "Product", "Location", "Recorded Qty", "Stock Delta", "By"].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-stone-400 bg-white [font-family:var(--font-dmsans)] ${i === 4 || i === 5 ? "text-right" : "text-left"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading rows — consistent height prevents layout shift
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-stone-50">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-stone-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-[14px] font-medium text-stone-400 [font-family:var(--font-dmsans)]">No movements found</p>
                  <p className="text-[12px] text-stone-300 mt-1 [font-family:var(--font-dmsans)]">Try a different filter</p>
                </td>
              </tr>
            ) : (
              filtered.map((m: MovementRow) => {
                const isNeg = m.qty_delta < 0;
                return (
                  <tr key={m.movement_id} className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/60 transition-colors">
                    <td className="px-4 py-3 text-[12px] text-stone-400 whitespace-nowrap [font-family:var(--font-dmsans)]">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />{fmtDate(m.movement_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium [font-family:var(--font-dmsans)] ${TYPE_BADGE[m.movement_type as MovementType]}`}>
                        {TYPE_LABELS[m.movement_type as FilterType]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">{m.product_name}</p>
                      <p className="text-[11px] text-stone-400 [font-family:var(--font-jetbrains)]">{m.product_code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="[font-family:var(--font-jetbrains)] text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                        {m.location_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right [font-family:var(--font-jetbrains)] text-[14px] font-medium text-stone-700">
                      {m.movement_qty}
                    </td>
                    <td className="px-4 py-3 text-right [font-family:var(--font-jetbrains)] text-[14px] font-bold" style={{ color: isNeg ? "#991b1b" : "#166534" }}>
                      {isNeg ? `−${Math.abs(m.qty_delta)}` : `+${m.qty_delta}`}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">
                      {m.created_by_name}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {response.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-stone-100 bg-stone-50">
            <span className="text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, response.pagination.total)} of {response.pagination.total} entries
            </span>
            <Pagination
              current={page}
              total={response.pagination.total}
              pageSize={pageSize}
              onChange={(p) => setPage(p)}
              className="text-[12px] [font-family:var(--font-dmsans)]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
