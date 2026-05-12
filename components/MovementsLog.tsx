"use client";

import { useState, useMemo } from "react";
import { MovementRow, MovementType } from "@/types/inventory";
import Pagination from "rc-pagination";
import "rc-pagination/assets/index.css";

interface Props {
  movements: MovementRow[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    setPage: (p: number) => void;
  };
  filterType?: FilterType;
  onFilterChange?: (t: FilterType) => void;
}

type FilterType = MovementType | "ALL";

const TYPES: FilterType[] = [
  "ALL",
  "ISSUE",
  "RETURN",
  "PURCHASE",
  "ADJUSTMENT",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "RETURN_UNUSABLE",
  "ISSUE_REVERSAL",
  "RETURN_REVERSAL",
  "PURCHASE_REVERSAL",
  "TRANSFER_OUT_REVERSAL",
  "TRANSFER_IN_REVERSAL",
  "RETURN_UNUSABLE_REVERSAL",
];

const TYPE_LABELS: Record<FilterType, string> = {
  ALL: "All",
  ISSUE: "Issue",
  RETURN: "Return",
  PURCHASE: "Purchase",
  ADJUSTMENT: "Adjustment",
  TRANSFER_OUT: "Transfer Out",
  TRANSFER_IN: "Transfer In",
  RETURN_UNUSABLE: "Return Unusable",
  ISSUE_REVERSAL: "Issue Reversal",
  RETURN_REVERSAL: "Return Reversal",
  PURCHASE_REVERSAL: "Purchase Reversal",
  TRANSFER_OUT_REVERSAL: "Transfer Out Reversal",
  TRANSFER_IN_REVERSAL: "Transfer In Reversal",
  RETURN_UNUSABLE_REVERSAL: "Return Unusable Reversal",
};

const TYPE_BADGE: Record<MovementType, string> = {
  ISSUE:      "bg-blue-50   text-blue-800",
  RETURN:     "bg-teal-50   text-teal-700",
  PURCHASE:   "bg-green-50  text-green-700",
  ADJUSTMENT: "bg-amber-50  text-amber-800",
  TRANSFER_OUT: "bg-violet-50 text-violet-700",
  TRANSFER_IN: "bg-cyan-50 text-cyan-700",
  RETURN_UNUSABLE: "bg-rose-50 text-rose-700",
  ISSUE_REVERSAL: "bg-indigo-50 text-indigo-700",
  RETURN_REVERSAL: "bg-orange-50 text-orange-700",
  PURCHASE_REVERSAL: "bg-yellow-50 text-yellow-700",
  TRANSFER_OUT_REVERSAL: "bg-emerald-50 text-emerald-700",
  TRANSFER_IN_REVERSAL: "bg-fuchsia-50 text-fuchsia-700",
  RETURN_UNUSABLE_REVERSAL: "bg-pink-50 text-pink-700",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function MovementsLog({ movements, pagination, filterType, onFilterChange }: Props) {
  const [localTypeFilter, setLocalTypeFilter] = useState<FilterType>("ALL");
  const typeFilter = filterType !== undefined ? filterType : localTypeFilter;
  const setTypeFilter = onFilterChange !== undefined ? onFilterChange : setLocalTypeFilter;

  // With server pagination, the array should already be filtered. 
  // We only run local filtering as a fallback if no server pagination is passed.
  const filtered = useMemo(() =>
    pagination ? movements : (typeFilter === "ALL" ? movements : movements.filter((m) => m.movement_type === typeFilter)),
    [movements, typeFilter, pagination]
  );

  return (
    <div className="space-y-3">
      {/* Filter toggle */}
      <div className="flex items-center gap-3">
        <div className="flex border border-stone-200 rounded-lg overflow-hidden bg-white">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-[12px] font-medium border-r border-stone-200 last:border-r-0 transition-colors ${
                typeFilter === t
                  ? "bg-blue-800 text-white"
                  : "text-stone-500 hover:bg-stone-50"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-stone-400 ml-auto">
          {pagination ? pagination.total : filtered.length} records
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-stone-100">
              {["Date", "Type", "Product", "Location", "Recorded Qty", "Stock Delta", "Reference / Notes", "By"].map((h, i) => (
                <th
                  key={h}
                  className={`px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-stone-400 bg-white ${i === 4 || i === 5 ? "text-right" : "text-left"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const isNeg = m.qty_delta < 0;
              const display = isNeg ? `−${Math.abs(m.qty_delta)}` : `+${Math.abs(m.qty_delta)}`;
              return (
                <tr key={m.movement_id} className="border-b border-stone-50 hover:bg-stone-50/60 transition-colors last:border-b-0">
                  <td className="px-3.5 py-3 text-[12px] text-stone-400 whitespace-nowrap">
                    {fmtDate(m.movement_date)}
                  </td>
                  <td className="px-3.5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_BADGE[m.movement_type]}`}>
                      {TYPE_LABELS[m.movement_type]}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-[13px] font-medium text-stone-700">
                    {m.product_name}
                  </td>
                  <td className="px-3.5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800">
                      {m.location_code}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-right [font-family:var(--font-jetbrains)] text-[14px] font-medium text-stone-700">
                    {m.movement_qty}
                  </td>
                  <td className="px-3.5 py-3 text-right [font-family:var(--font-jetbrains)] text-[14px] font-bold" style={{ color: isNeg ? "#991b1b" : "#166534" }}>
                    {display}
                  </td>
                  <td className="px-3.5 py-3 text-[12px] text-stone-400 max-w-[180px] truncate">
                    {m.notes ?? "—"}
                  </td>
                  <td className="px-3.5 py-3 text-[12px] text-stone-400">
                    {m.created_by_name}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center">
                  <p className="text-[14px] font-medium text-stone-400">No movements found</p>
                  <p className="text-[12px] text-stone-300 mt-1">Try a different filter</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {pagination && pagination.total > pagination.pageSize && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-stone-100 bg-stone-50">
            <span className="text-[12px] text-stone-500">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} entries
            </span>
            <Pagination
              current={pagination.page}
              total={pagination.total}
              pageSize={pagination.pageSize}
              onChange={(p) => pagination.setPage(p)}
              className="text-[12px]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
