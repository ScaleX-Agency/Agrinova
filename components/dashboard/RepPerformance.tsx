"use client";
// components/dashboard/RepPerformance.tsx
import { BarChart3 } from "lucide-react";
import type { SalesByRep } from "@/hooks/useSalesDashboard";
import { formatLKR } from "@/lib/formatters";

interface Props { data: SalesByRep[]; loading: boolean; }

export default function RepPerformance({ data, loading }: Props) {
  const maxSales = Math.max(...data.map((r) => r.sales), 1);
  const sorted   = [...data].sort((a, b) => b.sales - a.sales).slice(0, 5);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <BarChart3 size={15} className="text-stone-400" />
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">Rep Performance</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10.5px] text-stone-400 [font-family:var(--font-dmsans)]">
            <span className="w-3 h-1.5 bg-blue-500 rounded-sm inline-block" />Sales
          </span>
          <span className="flex items-center gap-1.5 text-[10.5px] text-stone-400 [font-family:var(--font-dmsans)]">
            <span className="w-3 h-1.5 bg-green-500 rounded-sm inline-block" />Collected
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="flex justify-between">
              <div className="h-3 w-28 bg-stone-100 rounded" />
              <div className="h-3 w-14 bg-stone-100 rounded" />
            </div>
            <div className="h-1.5 w-full bg-stone-100 rounded-full" />
            <div className="h-1.5 w-4/5 bg-stone-50 rounded-full" />
          </div>
        )) : sorted.length === 0 ? (
          <div className="text-center py-6 text-stone-400">
            <BarChart3 size={24} className="mx-auto mb-2 text-stone-300" />
            <p className="text-[13px] [font-family:var(--font-dmsans)]">No rep data for this period</p>
          </div>
        ) : sorted.map((rep) => {
          const salesPct = Math.round((rep.sales     / maxSales) * 100);
          const collPct  = Math.round((rep.collected / maxSales) * 100);
          return (
            <div key={rep.rep_id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-stone-700 [font-family:var(--font-dmsans)] truncate max-w-[160px]">
                  {rep.rep_name}
                </span>
                <span className="text-[12px] font-semibold text-stone-800 [font-family:var(--font-jetbrains)]">
                  {formatLKR(rep.sales)}
                </span>
              </div>
              {/* Sales bar */}
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${salesPct}%` }} />
              </div>
              {/* Collections bar */}
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${collPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
