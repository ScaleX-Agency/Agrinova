"use client";
// components/dashboard/SalesByLocation.tsx
// Phase 2 — Sales by Location bar chart
//
// Requires: salesByLocation[] added to /api/customer-sales response.
// Shape expected:
//   salesByLocation: Array<{ locationName: string; locationCode: string; totalSales: number }>
//
// Gracefully renders empty state until API is updated.
//
// Usage in dashboard/page.tsx:
//   import SalesByLocation from "@/components/dashboard/SalesByLocation";
//   <SalesByLocation data={salesData?.salesByLocation} loading={salesLoading} />

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { MapPin } from "lucide-react";
import { formatLKR } from "@/lib/formatters";

export interface SalesByLocationRow {
  locationName: string;
  locationCode: string;
  totalSales:   number;
}

interface Props {
  data?:    SalesByLocationRow[];
  loading?: boolean;
}

// Colour palette — matches existing dashboard accent colours
const COLOURS = ["#1d4ed8", "#059669", "#d97706", "#7c3aed", "#0891b2"];

// Custom tooltip
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as SalesByLocationRow;
  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-lg px-3 py-2.5 text-left">
      <p className="text-[11px] uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)] mb-0.5">
        {d.locationCode}
      </p>
      <p className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
        {d.locationName}
      </p>
      <p className="text-[15px] font-bold text-blue-700 [font-family:var(--font-jetbrains)] mt-1">
        {formatLKR(d.totalSales)}
      </p>
    </div>
  );
}

export default function SalesByLocation({ data = [], loading = false }: Props) {
  const sorted = [...data].sort((a, b) => b.totalSales - a.totalSales);
  const maxVal = sorted[0]?.totalSales ?? 1;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-stone-100">
        <MapPin size={15} className="text-stone-400" />
        <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
          Sales by Location
        </span>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="px-5 py-4 space-y-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-2 w-24 bg-stone-100 rounded" />
              <div className="h-4 bg-stone-100 rounded-full" style={{ width: `${70 - i * 15}%` }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && sorted.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-[13px] font-medium text-stone-500 [font-family:var(--font-dmsans)]">
            No location data yet
          </p>
          <p className="text-[11.5px] text-stone-400 [font-family:var(--font-dmsans)]">
            Available once API is updated
          </p>
        </div>
      )}

      {/* Chart */}
      {!loading && sorted.length > 0 && (
        <div className="px-5 py-4">
          {/* Horizontal bar rows (custom — simpler than recharts horizontal) */}
          <div className="space-y-3">
            {sorted.map((row, idx) => {
              const pct = Math.round((row.totalSales / maxVal) * 100);
              return (
                <div key={row.locationCode}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="[font-family:var(--font-jetbrains)] text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                        style={{
                          background: COLOURS[idx % COLOURS.length] + "18",
                          color:      COLOURS[idx % COLOURS.length],
                        }}
                      >
                        {row.locationCode}
                      </span>
                      <span className="text-[12px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                        {row.locationName}
                      </span>
                    </div>
                    <span className="text-[12px] font-bold text-stone-800 [font-family:var(--font-jetbrains)]">
                      {formatLKR(row.totalSales)}
                    </span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width:      `${pct}%`,
                        background: COLOURS[idx % COLOURS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mini recharts bar for visual comparison (optional, below fold) */}
          <div className="mt-5 h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sorted} barSize={28}>
                <XAxis
                  dataKey="locationCode"
                  tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains)", fill: "#78716c" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f5f5f4" }} />
                <Bar dataKey="totalSales" radius={[4, 4, 0, 0]}>
                  {sorted.map((_, i) => (
                    <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
