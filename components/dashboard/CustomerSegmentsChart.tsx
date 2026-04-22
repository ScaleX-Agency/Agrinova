"use client";
// components/dashboard/CustomerSegmentsChart.tsx
// Donut chart — Active / New / Inactive customer breakdown.

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Users } from "lucide-react";
import { Sk } from "@/components/ui/skeleton";
import type { CustomerSegments } from "@/hooks/useSalesDashboard";

interface Props {
  data?:   CustomerSegments;
  loading: boolean;
}

const SEGMENTS = [
  { key: "active",   label: "Active",   color: "#16a34a", bg: "bg-green-500"  },
  { key: "new",      label: "New",      color: "#3b82f6", bg: "bg-blue-500"   },
  { key: "inactive", label: "Inactive", color: "#d6d3d1", bg: "bg-stone-300"  },
] as const;

export default function CustomerSegmentsChart({ data, loading }: Props) {
  const total  = data ? data.active + data.new + data.inactive : 0;
  const slices = data
    ? SEGMENTS.map((s) => ({ name: s.label, value: data[s.key], color: s.color }))
    : [];

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden h-full">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-stone-100">
        <Users size={15} className="text-stone-400" />
        <div>
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
            Customer Segments
          </span>
          {!loading && data && (
            <span className="text-[11px] text-stone-400 ml-2 [font-family:var(--font-dmsans)]">
              {total} total
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-5 flex gap-6 items-center">
          <Sk className="w-[120px] h-[120px] rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Sk className="w-3 h-3 rounded-full" />
                <Sk className="h-3 flex-1 rounded" />
                <Sk className="h-3 w-6 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : !data || total === 0 ? (
        <div className="p-5 flex flex-col items-center justify-center text-stone-300 min-h-[140px]">
          <Users size={28} />
          <p className="text-[13px] mt-2 text-stone-400 [font-family:var(--font-dmsans)]">No customer data</p>
        </div>
      ) : (
        <div className="p-5 flex gap-5 items-center">
          {/* Donut */}
          <div className="relative w-[120px] h-[120px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={54}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {slices.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e7e5e4",
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "var(--font-dmsans)",
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [`${value} customers`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[20px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] leading-none">{total}</span>
              <span className="text-[10px] text-stone-400 [font-family:var(--font-dmsans)] mt-0.5">customers</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2.5 flex-1 min-w-0">
            {SEGMENTS.map((s) => {
              const count = data[s.key];
              const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.bg}`} />
                  <span className="text-[12px] text-stone-600 [font-family:var(--font-dmsans)] flex-1 truncate">{s.label}</span>
                  <span className="text-[12px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">{count}</span>
                  <span className="text-[10px] text-stone-400 [font-family:var(--font-dmsans)] w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
