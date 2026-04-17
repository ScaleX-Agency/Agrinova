"use client";

import { useState, useMemo } from "react";
import { MovementRow, MovementType } from "@/types/inventory";

interface Props {
  movements: MovementRow[];
}

type FilterType = MovementType | "ALL";

const TYPES: FilterType[] = ["ALL", "ISSUE", "RETURN", "PURCHASE", "ADJUSTMENT"];

const TYPE_LABELS: Record<FilterType, string> = {
  ALL: "All", ISSUE: "Issue", RETURN: "Return", PURCHASE: "Purchase", ADJUSTMENT: "Adjustment",
};

const TYPE_BADGE: Record<MovementType, string> = {
  ISSUE:      "bg-blue-50   text-blue-800",
  RETURN:     "bg-teal-50   text-teal-700",
  PURCHASE:   "bg-green-50  text-green-700",
  ADJUSTMENT: "bg-amber-50  text-amber-800",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function MovementsLog({ movements }: Props) {
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");

  const filtered = useMemo(() =>
    typeFilter === "ALL" ? movements : movements.filter((m) => m.movement_type === typeFilter),
    [movements, typeFilter]
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
          {filtered.length} records
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-stone-100">
              {["Date", "Type", "Product", "Location", "Qty Change", "Reference / Notes", "By"].map((h, i) => (
                <th
                  key={h}
                  className={`px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-stone-400 bg-white ${i === 4 ? "text-right" : "text-left"}`}
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
                  <td className="px-3.5 py-3 text-right font-mono text-[14px] font-bold" style={{ color: isNeg ? "#991b1b" : "#166534" }}>
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
                <td colSpan={7} className="px-4 py-10 text-center">
                  <p className="text-[14px] font-medium text-stone-400">No movements found</p>
                  <p className="text-[12px] text-stone-300 mt-1">Try a different filter</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
