"use client";
// components/dashboard/InventoryValuation.tsx
// Phase 2 — Inventory Valuation KPI card
//
// Requires: GET /api/inventory/valuation (new endpoint — see
// app/api/inventory/valuation/route.ts scaffold in this package).
//
// Degrades gracefully: shows "—" until endpoint exists.
//
// Usage in dashboard/page.tsx (Inventory tab KPI row):
//   import InventoryValuation from "@/components/dashboard/InventoryValuation";
//   <InventoryValuation />

import { useQuery } from "@tanstack/react-query";
import { Wallet, ArrowUpRight } from "lucide-react";
import { formatLKR } from "@/lib/formatters";

interface ValuationResponse {
  totalValuation:    number;
  totalUnits:        number;
  locationBreakdown: Array<{
    locationName: string;
    locationCode: string;
    valuation:    number;
  }>;
}

function useInventoryValuation() {
  return useQuery<ValuationResponse>({
    queryKey: ["inventory-valuation"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/valuation");
      if (!res.ok) throw new Error("Not available");
      return res.json();
    },
    staleTime: 5 * 60_000,
    retry: false, // don't hammer if endpoint not yet deployed
  });
}

export default function InventoryValuation() {
  const { data, isLoading, isError } = useInventoryValuation();

  // Loading skeleton — matches KpiCard style
  if (isLoading) {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-stone-100 shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-2 w-20 bg-stone-100 rounded" />
          <div className="h-7 w-24 bg-stone-100 rounded" />
          <div className="h-4 w-28 bg-stone-100 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start hover:shadow-sm transition-shadow">
      <div className="w-10 h-10 rounded-xl border bg-emerald-50 border-emerald-100 flex items-center justify-center shrink-0">
        <Wallet size={18} className="text-emerald-700" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">
          Stock Valuation
        </p>
        <p className="text-[24px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] leading-none my-1">
          {isError || !data ? "—" : formatLKR(data.totalValuation)}
        </p>
        {data ? (
          <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 [font-family:var(--font-dmsans)]">
            <ArrowUpRight size={11} className="mr-0.5" />
            {data.totalUnits.toLocaleString()} units on-hand
          </span>
        ) : (
          <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-50 text-stone-400 [font-family:var(--font-dmsans)]">
            API endpoint pending
          </span>
        )}
      </div>
    </div>
  );
}
