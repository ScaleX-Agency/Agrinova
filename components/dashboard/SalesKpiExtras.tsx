"use client";
// components/dashboard/SalesKpiExtras.tsx
// Phase 1 — AOV + Collection Rate KPI cards
// Drop these two cards into the existing KPI grid in the Sales tab.
// Props come from the already-fetched salesData (useSalesDashboard),
// so zero additional API calls are needed.
//
// Usage in dashboard/page.tsx:
//   import { AovCard, CollectionRateCard } from "@/components/dashboard/SalesKpiExtras";
//   <AovCard   kpis={salesData?.kpis} loading={salesLoading} />
//   <CollectionRateCard kpis={salesData?.kpis} loading={salesLoading} />

import { ArrowUpRight, BarChart2, Percent } from "lucide-react";
import { formatLKR } from "@/lib/formatters";

// ── Re-usable skeleton (mirrors KpiCard loading state) ──────────────────────
function KpiSkeleton() {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-stone-100 shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-2 w-20 bg-stone-100 rounded" />
        <div className="h-7 w-16 bg-stone-100 rounded" />
        <div className="h-4 w-24 bg-stone-100 rounded-full" />
      </div>
    </div>
  );
}

// ── Shared card shell ────────────────────────────────────────────────────────
function KpiShell({
  label, value, sub, icon, iconBg, badgeCls, trendUp,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  badgeCls: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start hover:shadow-sm transition-shadow">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">
          {label}
        </p>
        <p className="text-[24px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] leading-none my-1">
          {value}
        </p>
        {sub && (
          <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full [font-family:var(--font-dmsans)] ${badgeCls}`}>
            {trendUp && <ArrowUpRight size={11} className="mr-0.5" />}
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Kpi shape expected (subset of what useSalesDashboard returns) ────────────
interface KpiSlice {
  totalSales:   number;
  collections:  number;
  invoiceCount?: number;
}

// ── Average Order Value ──────────────────────────────────────────────────────
export function AovCard({
  kpis,
  loading,
}: {
  kpis?: KpiSlice | null;
  loading?: boolean;
}) {
  if (loading) return <KpiSkeleton />;

  const aov =
    kpis && kpis.invoiceCount && kpis.invoiceCount > 0
      ? kpis.totalSales / kpis.invoiceCount
      : null;

  return (
    <KpiShell
      label="Avg. Order Value"
      value={aov !== null ? formatLKR(aov) : "—"}
      sub={kpis?.invoiceCount ? `From ${kpis.invoiceCount} invoices` : undefined}
      icon={<BarChart2 size={18} className="text-indigo-700" />}
      iconBg="bg-indigo-50 border-indigo-100"
      badgeCls="bg-indigo-50 text-indigo-700"
    />
  );
}

// ── Collection Rate ──────────────────────────────────────────────────────────
export function CollectionRateCard({
  kpis,
  loading,
}: {
  kpis?: KpiSlice | null;
  loading?: boolean;
}) {
  if (loading) return <KpiSkeleton />;

  const rate =
    kpis && kpis.totalSales > 0
      ? Math.min(100, Math.round((kpis.collections / kpis.totalSales) * 100))
      : null;

  const badgeColor =
    rate === null     ? "bg-stone-50 text-stone-500"
    : rate >= 80      ? "bg-green-50 text-green-700"
    : rate >= 50      ? "bg-amber-50 text-amber-700"
    :                   "bg-red-50 text-red-700";

  return (
    <KpiShell
      label="Collection Rate"
      value={rate !== null ? `${rate}%` : "—"}
      sub={rate !== null ? (rate >= 80 ? "On track" : rate >= 50 ? "Needs attention" : "Critical") : undefined}
      icon={<Percent size={18} className="text-teal-700" />}
      iconBg="bg-teal-50 border-teal-100"
      badgeCls={badgeColor}
      trendUp={rate !== null && rate >= 80}
    />
  );
}
