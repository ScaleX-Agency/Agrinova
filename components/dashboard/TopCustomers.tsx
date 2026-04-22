"use client";
// components/dashboard/TopCustomers.tsx
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import type { TopCustomer } from "@/hooks/useSalesDashboard";
import { formatLKR } from "@/lib/formatters";

interface Props { data: TopCustomer[]; loading: boolean; }

export default function TopCustomers({ data, loading }: Props) {
  const top5   = data.slice(0, 5);
  const maxSales = Math.max(...top5.map((c) => c.total_sales), 1);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-stone-400" />
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">Top Customers</span>
        </div>
        <Link href="/customers"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)]">
          View all <ChevronRight size={12} />
        </Link>
      </div>

      <div className="divide-y divide-stone-50">
        {loading ? Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
            <div className="w-6 h-6 rounded-full bg-stone-100 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 bg-stone-100 rounded" />
              <div className="h-2 w-20 bg-stone-100 rounded" />
            </div>
            <div className="space-y-1.5 text-right">
              <div className="h-3 w-16 bg-stone-100 rounded" />
              <div className="h-1.5 w-14 bg-stone-100 rounded-full" />
            </div>
          </div>
        )) : top5.length === 0 ? (
          <div className="px-5 py-8 text-center text-stone-400">
            <Users size={24} className="mx-auto mb-2 text-stone-300" />
            <p className="text-[13px] [font-family:var(--font-dmsans)]">No sales data this period</p>
          </div>
        ) : top5.map((cust, idx) => {
          const barPct = Math.round((cust.total_sales / maxSales) * 100);
          return (
            <div key={cust.customer_id} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/60 transition-colors">
              {/* Rank */}
              <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-stone-500 [font-family:var(--font-dmsans)]">{idx + 1}</span>
              </div>
              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-stone-800 [font-family:var(--font-dmsans)] truncate">{cust.name}</p>
                <p className="text-[10.5px] text-stone-400 [font-family:var(--font-dmsans)]">{cust.invoice_count} invoices</p>
              </div>
              {/* Amount + bar */}
              <div className="text-right shrink-0">
                <p className="text-[12px] font-semibold text-stone-800 [font-family:var(--font-jetbrains)]">
                  {formatLKR(cust.total_sales)}
                </p>
                <div className="mt-1 w-[56px] h-1 bg-stone-100 rounded-full overflow-hidden ml-auto">
                  <div className="h-full bg-blue-400 rounded-full"
                    style={{ width: `${barPct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
