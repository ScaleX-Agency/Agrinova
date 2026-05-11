"use client";
// components/dashboard/InventoryInsights.tsx
// Phase 3 — Dead Stock list + Top Velocity widget
//
// Requires: GET /api/dashboard/inventory-insights
// Shape:
//   {
//     deadStock: Array<{
//       stock_id: number; product_name: string; product_code: string;
//       location_code: string; quantity_on_hand: number; days_since_last_issue: number;
//     }>;
//     topVelocity: Array<{
//       product_id: number; product_name: string; product_code: string;
//       total_issued: number; movement_count: number;
//     }>;
//   }
//
// Usage in dashboard/page.tsx (Inventory tab):
//   import InventoryInsights from "@/components/dashboard/InventoryInsights";
//   <InventoryInsights />

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { TrendingUp, Wind, ChevronRight, Package } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface DeadStockRow {
  stock_id:               number;
  product_name:           string;
  product_code:           string;
  location_code:          string;
  quantity_on_hand:       number;
  days_since_last_issue:  number;
}

interface VelocityRow {
  product_id:     number;
  product_name:   string;
  product_code:   string;
  total_issued:   number;
  movement_count: number;
}

interface InsightsResponse {
  deadStock:    DeadStockRow[];
  topVelocity:  VelocityRow[];
}

// ── Hook ─────────────────────────────────────────────────────────────────────
function useInventoryInsights() {
  return useQuery<InsightsResponse>({
    queryKey: ["inventory-insights"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/inventory-insights");
      if (!res.ok) throw new Error("Not available");
      return res.json();
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

// ── Sub-components ───────────────────────────────────────────────────────────
function SkeletonRows({ n = 4 }: { n?: number }) {
  return (
    <div className="divide-y divide-stone-50">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-stone-100 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-32 bg-stone-100 rounded" />
            <div className="h-2 w-20 bg-stone-100 rounded" />
          </div>
          <div className="h-5 w-10 bg-stone-100 rounded" />
        </div>
      ))}
    </div>
  );
}

function Unavailable({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-6 text-center">
      <Package size={18} className="text-stone-300" />
      <p className="text-[12.5px] text-stone-400 [font-family:var(--font-dmsans)]">
        {label}
      </p>
    </div>
  );
}

// ── Dead Stock Panel ─────────────────────────────────────────────────────────
function DeadStockPanel({ rows, loading, error }: {
  rows: DeadStockRow[]; loading: boolean; error: boolean;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Wind size={15} className="text-stone-400" />
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
            Dead Stock
          </span>
          <span className="text-[10.5px] text-stone-400 [font-family:var(--font-dmsans)]">
            No issues in 30+ days
          </span>
        </div>
        <Link
          href="/inventory"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)]"
        >
          View all <ChevronRight size={12} />
        </Link>
      </div>

      {loading && <SkeletonRows />}
      {!loading && error && <Unavailable label="API endpoint not yet deployed" />}
      {!loading && !error && rows.length === 0 && (
        <Unavailable label="No stagnant stock — all items moving" />
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="divide-y divide-stone-50">
          {rows.map((r) => (
            <div
              key={r.stock_id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/60 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0">
                <Package size={13} className="text-stone-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-stone-700 truncate [font-family:var(--font-dmsans)]">
                  {r.product_name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="[font-family:var(--font-jetbrains)] text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                    {r.location_code}
                  </span>
                  <span className="text-[10.5px] text-stone-400 [font-family:var(--font-dmsans)]">
                    {r.product_code}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[14px] font-bold text-stone-700 [font-family:var(--font-jetbrains)] leading-none">
                  {r.quantity_on_hand}
                </p>
                <p className="text-[10px] text-stone-400 [font-family:var(--font-dmsans)] mt-0.5">
                  units
                </p>
              </div>
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-stone-50 text-stone-500 border border-stone-200 [font-family:var(--font-dmsans)] shrink-0">
                {r.days_since_last_issue}d idle
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Top Velocity Panel ───────────────────────────────────────────────────────
function TopVelocityPanel({ rows, loading, error }: {
  rows: VelocityRow[]; loading: boolean; error: boolean;
}) {
  const maxIssued = rows[0]?.total_issued ?? 1;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-stone-100">
        <TrendingUp size={15} className="text-stone-400" />
        <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
          Top Velocity
        </span>
        <span className="text-[10.5px] text-stone-400 [font-family:var(--font-dmsans)]">
          Most issued, last 30 days
        </span>
      </div>

      {loading && <SkeletonRows n={5} />}
      {!loading && error && <Unavailable label="API endpoint not yet deployed" />}
      {!loading && !error && rows.length === 0 && (
        <Unavailable label="No movement data for this period" />
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="px-5 py-3 space-y-3">
          {rows.map((r, idx) => {
            const pct = Math.round((r.total_issued / maxIssued) * 100);
            const COLOURS = ["#1d4ed8", "#059669", "#d97706", "#7c3aed", "#0891b2"];
            const color = COLOURS[idx % COLOURS.length];
            return (
              <div key={r.product_id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="text-[10.5px] font-bold w-4 shrink-0 [font-family:var(--font-jetbrains)]"
                      style={{ color }}
                    >
                      #{idx + 1}
                    </span>
                    <span className="text-[12px] font-semibold text-stone-700 truncate [font-family:var(--font-dmsans)]">
                      {r.product_name}
                    </span>
                  </div>
                  <span className="text-[12px] font-bold [font-family:var(--font-jetbrains)] shrink-0 ml-2" style={{ color }}>
                    {r.total_issued.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-0.5 [font-family:var(--font-dmsans)]">
                  {r.movement_count} movements
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function InventoryInsights() {
  const { data, isLoading, isError } = useInventoryInsights();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <DeadStockPanel
        rows={data?.deadStock ?? []}
        loading={isLoading}
        error={isError}
      />
      <TopVelocityPanel
        rows={data?.topVelocity ?? []}
        loading={isLoading}
        error={isError}
      />
    </div>
  );
}
