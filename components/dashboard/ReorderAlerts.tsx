"use client";
// components/dashboard/ReorderAlerts.tsx
// Phase 1 — Reorder Alerts List (Inventory tab)
// Fetches /api/inventory?status=low&pageSize=10 — existing endpoint, no API changes.
//
// Usage in dashboard/page.tsx (Inventory tab):
//   import ReorderAlerts from "@/components/dashboard/ReorderAlerts";
//   <ReorderAlerts />

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, ChevronRight, Package } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface LowStockRow {
  stock_id:           number;
  product_name:       string;
  product_code:       string;
  location_code:      string;
  location_name:      string;
  quantity_on_hand:   number;
  reorder_threshold:  number;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
function useLowStock() {
  return useQuery<LowStockRow[]>({
    queryKey: ["dashboard-low-stock"],
    queryFn: async () => {
      const res = await fetch("/api/inventory?status=low&pageSize=10");
      if (!res.ok) throw new Error("Failed to fetch low stock");
      const json = await res.json();
      // getAllStock returns { stock: [...], pagination: {...} }
      return (json.stock ?? json) as LowStockRow[];
    },
    staleTime: 60_000,
  });
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ReorderAlerts() {
  const { data: items = [], isLoading, isError } = useLowStock();

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-500" />
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
            Reorder Alerts
          </span>
          {!isLoading && items.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 rounded-full [font-family:var(--font-dmsans)]">
              {items.length}
            </span>
          )}
        </div>
        <Link
          href="/inventory?status=low"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)]"
        >
          View all <ChevronRight size={12} />
        </Link>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="divide-y divide-stone-50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-stone-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-32 bg-stone-100 rounded" />
                <div className="h-2 w-20 bg-stone-100 rounded" />
              </div>
              <div className="h-5 w-12 bg-stone-100 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <p className="px-5 py-6 text-[12.5px] text-stone-400 text-center [font-family:var(--font-dmsans)]">
          Could not load alerts.
        </p>
      )}

      {/* Empty */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
            <Package size={18} className="text-green-600" />
          </div>
          <p className="text-[13px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
            All stock levels healthy
          </p>
          <p className="text-[11.5px] text-stone-400 [font-family:var(--font-dmsans)]">
            No products below reorder threshold
          </p>
        </div>
      )}

      {/* List */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="divide-y divide-stone-50">
          {items.map((item) => {
            const pct = Math.round(
              (item.quantity_on_hand / Math.max(item.reorder_threshold, 1)) * 100
            );
            const isOut = item.quantity_on_hand <= 0;
            const statusCls = isOut
              ? "bg-red-50 text-red-700 border-red-100"
              : "bg-amber-50 text-amber-700 border-amber-100";
            const statusLabel = isOut ? "Out" : "Low";
            const barCls = isOut ? "bg-red-500" : "bg-amber-400";
            const barW = isOut ? 0 : Math.min(pct, 100);

            return (
              <div
                key={item.stock_id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/60 transition-colors"
              >
                {/* Icon */}
                <div className="w-8 h-8 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0">
                  <Package size={14} className="text-stone-400" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-stone-800 truncate [font-family:var(--font-dmsans)]">
                    {item.product_name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="[font-family:var(--font-jetbrains)] text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                      {item.location_code}
                    </span>
                    <span className="text-[10.5px] text-stone-400 [font-family:var(--font-dmsans)]">
                      {item.product_code}
                    </span>
                  </div>
                  {/* Mini bar */}
                  <div className="mt-1.5 h-1 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barCls}`}
                      style={{ width: `${barW}%` }}
                    />
                  </div>
                </div>

                {/* Qty + badge */}
                <div className="text-right shrink-0">
                  <p className="text-[15px] font-bold text-stone-800 [font-family:var(--font-jetbrains)] leading-none">
                    {item.quantity_on_hand}
                  </p>
                  <p className="text-[10px] text-stone-400 [font-family:var(--font-dmsans)] mt-0.5">
                    / {item.reorder_threshold} min
                  </p>
                </div>

                <span
                  className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border [font-family:var(--font-dmsans)] shrink-0 ${statusCls}`}
                >
                  {statusLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
