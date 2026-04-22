"use client";
// components/dashboard/TopProducts.tsx
// Fetches /api/analytics/products and renders horizontal bar list.

import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import type { DateRange } from "@/hooks/useSalesDashboard";
import { getDateRange }   from "@/hooks/useSalesDashboard";
import { formatLKR }      from "@/lib/formatters";

interface ProductRow {
  product_id:    number;
  product_code:  string;
  product_name:  string;
  pack_size:     string;
  category_name: string;
  total_revenue: number;
  total_qty:     number;
}

interface Props { dateRange: DateRange; }

async function fetchTopProducts(range: DateRange): Promise<ProductRow[]> {
  const { from, to } = getDateRange(range);
  const res = await fetch(`/api/analytics/products?from=${from}&to=${to}&limit=5`);
  if (!res.ok) throw new Error("Failed to fetch product analytics");
  const json = await res.json();
  return json.data ?? [];
}

export default function TopProducts({ dateRange }: Props) {
  const { data = [], isLoading, isError } = useQuery<ProductRow[]>({
    queryKey: ["product-analytics", dateRange],
    queryFn:  () => fetchTopProducts(dateRange),
    staleTime: 5 * 60 * 1000,
  });

  const maxRevenue = Math.max(...data.map((p) => p.total_revenue), 1);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Package size={15} className="text-stone-400" />
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">Top Selling Products</span>
        </div>
        <span className="text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">By revenue</span>
      </div>

      <div className="p-5 space-y-4">
        {isLoading ? Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse space-y-1.5">
            <div className="flex justify-between">
              <div className="h-3 w-36 bg-stone-100 rounded" />
              <div className="h-3 w-14 bg-stone-100 rounded" />
            </div>
            <div className="h-1.5 bg-stone-100 rounded-full" style={{ width: `${90 - i * 15}%` }} />
          </div>
        )) : isError ? (
          <div className="py-4 text-center">
            <p className="text-[12px] text-red-500 [font-family:var(--font-dmsans)]">Failed to load product data</p>
          </div>
        ) : data.length === 0 ? (
          <div className="py-6 text-center text-stone-400">
            <Package size={24} className="mx-auto mb-2 text-stone-300" />
            <p className="text-[13px] [font-family:var(--font-dmsans)]">No product sales this period</p>
          </div>
        ) : data.map((prod) => {
          const pct = Math.round((prod.total_revenue / maxRevenue) * 100);
          return (
            <div key={prod.product_id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="min-w-0">
                  <span className="text-[12.5px] font-medium text-stone-800 [font-family:var(--font-dmsans)] truncate block max-w-[220px]">
                    {prod.product_name}{" "}
                    <span className="text-stone-400 font-normal">{prod.pack_size}</span>
                  </span>
                </div>
                <span className="text-[12px] font-semibold text-green-700 [font-family:var(--font-jetbrains)] shrink-0 ml-2">
                  {formatLKR(prod.total_revenue)}
                </span>
              </div>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
