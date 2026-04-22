"use client";
import { Sk } from "@/components/ui/skeleton";
// components/dashboard/SalesTrendChart.tsx
// Line chart — Sales vs Collections over time.
// Uses recharts (already installed). Matches existing card style exactly.

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Activity } from "lucide-react";
import type { SalesTrendPoint } from "@/hooks/useSalesDashboard";
import { formatLKR, fmtShortDate } from "@/lib/formatters";

interface Props {
  data:    SalesTrendPoint[];
  loading: boolean;
}

function ChartSkeleton() {
  return (
    <div className="p-5 animate-pulse">
      <div className="flex justify-between mb-8">
        <div className="space-y-2">
          <Sk className="h-4 w-24 rounded" />
          <Sk className="h-6 w-32 rounded" />
        </div>
        <div className="flex gap-4">
          <Sk className="h-4 w-16 rounded" />
          <Sk className="h-4 w-16 rounded" />
        </div>
      </div>
      <div className="h-[180px] bg-stone-50 rounded-xl flex items-end gap-2 px-4 pb-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1" style={{ height: `${30 + (i * 10) % 60}%` }}><Sk className="w-full h-full rounded-sm" /></div>
        ))}
      </div>
    </div>
  );
}

export default function SalesTrendChart({ data, loading }: Props) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden h-full">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-stone-400" />
          <div>
            <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
              Sales vs Collections
            </span>
            <span className="text-[11px] text-stone-400 ml-2 [font-family:var(--font-dmsans)]">
              Trend
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">
            <span className="w-4 h-0.5 bg-blue-500 rounded inline-block" />Sales
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">
            <span className="w-4 h-0.5 bg-green-500 rounded inline-block" />Collections
          </span>
        </div>
      </div>

      {loading ? <ChartSkeleton /> : (
        <div className="px-4 pt-4 pb-2">
          {data.length === 0 ? (
            <div className="h-[180px] flex flex-col items-center justify-center text-stone-300">
              <Activity size={28} />
              <p className="text-[13px] mt-2 [font-family:var(--font-dmsans)] text-stone-400">No sales data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f0ec"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtShortDate}
                  tick={{ fill: "#a8a29e", fontSize: 10, fontFamily: "var(--font-dmsans)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatLKR(Number(v))}
                  tick={{ fill: "#a8a29e", fontSize: 10, fontFamily: "var(--font-dmsans)" }}
                  axisLine={false}
                  tickLine={false}
                  width={54}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e7e5e4",
                    borderRadius: 10,
                    fontSize: 12,
                    fontFamily: "var(--font-dmsans)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                  }}
                  labelStyle={{ color: "#78716c", fontSize: 11 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                   formatter={(value: any, name: any) => [
                    formatLKR(value),
                    name === "sales" ? "Sales" : "Collections",
                  ]}
                  labelFormatter={(label) => fmtShortDate(String(label))}
                />
                <Line
                  dataKey="sales"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Line
                  dataKey="collections"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: "#16a34a", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
