"use client";
// components/dashboard/OverdueBalances.tsx
import { AlertTriangle } from "lucide-react";
import type { OverdueCustomer } from "@/hooks/useSalesDashboard";
import { formatLKR } from "@/lib/formatters";

interface Props { data: OverdueCustomer[]; loading: boolean; }

function daysBadgeCls(days: number): string {
  if (days > 90) return "bg-red-100 text-red-700 border-red-200";
  if (days > 65) return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function OverdueBalances({ data, loading }: Props) {
  const top4 = data.slice(0, 4);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-400" />
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">Overdue Balances</span>
        </div>
        {!loading && data.length > 0 && (
          <span className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full [font-family:var(--font-dmsans)]">
            {data.length} customers
          </span>
        )}
      </div>

      <div className="divide-y divide-stone-50">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 bg-stone-100 rounded" />
              <div className="h-2.5 w-20 bg-stone-100 rounded" />
            </div>
            <div className="space-y-1.5 text-right">
              <div className="h-3 w-16 bg-stone-100 rounded" />
              <div className="h-4 w-14 bg-stone-100 rounded-full" />
            </div>
          </div>
        )) : top4.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={18} className="text-green-600" />
            </div>
            <p className="text-[13px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">All balances current</p>
            <p className="text-[11.5px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">No overdue customers</p>
          </div>
        ) : top4.map((cust) => (
          <div key={cust.customer_id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-stone-50/60 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-medium text-stone-800 [font-family:var(--font-dmsans)] truncate">{cust.name}</p>
              <p className="text-[10.5px] text-stone-400 [font-family:var(--font-dmsans)]">{cust.rep_name}</p>
            </div>
            <div className="text-right shrink-0 space-y-1">
              <p className="text-[12px] font-semibold text-red-600 [font-family:var(--font-jetbrains)]">
                {formatLKR(cust.outstanding)}
              </p>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border [font-family:var(--font-dmsans)] ${daysBadgeCls(cust.days_overdue)}`}>
                {cust.days_overdue}d overdue
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Commission rule reminder */}
      <div className="px-5 py-2.5 border-t border-stone-50 bg-stone-50/50">
        <p className="text-[10.5px] text-stone-400 [font-family:var(--font-dmsans)]">
          0–65 days: 2% commission · 65+ days: 0% commission
        </p>
      </div>
    </div>
  );
}
