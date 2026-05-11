"use client";
// app/(dashboard)/dashboard/page.tsx
// Tabbed dashboard: "Sales & Revenue" tab + existing "Inventory" tab.
// Style matches the existing dashboard exactly:
//   - font-family: [font-family:var(--font-dmsans)] / [font-family:var(--font-jetbrains)]
//   - cards: bg-white border border-stone-200 rounded-2xl
//   - text: text-stone-800/700/400, muted uppercase tracking labels
//   - badges: bg-{color}-50 text-{color}-700 border-{color}-100 rounded-full
//   - buttons: bg-green-700 text-white rounded-xl

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Package, TrendingUp, AlertTriangle, XCircle,
  ArrowLeftRight, Plus, FileText, UserCheck,
  MapPin, ChevronRight, Activity, Boxes,
  ArrowUpRight, Clock, X, ChevronDown,
  DollarSign, Users, Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";

import {
  useAllStock,
  useLocationSummaries,
  useAllMovements,
  // eslint-disable-next-line
  KEYS,
} from "@/hooks/useInventory";
import { useSalesDashboard } from "@/hooks/useSalesDashboard";
import type {
  StockOverviewRow,
  MovementRow,
  MovementType,
  // eslint-disable-next-line
  LocationSummary,
} from "@/types/inventory";

import SalesTrendChart       from "@/components/dashboard/SalesTrendChart";
import CustomerSegmentsChart from "@/components/dashboard/CustomerSegmentsChart";
import RepPerformance        from "@/components/dashboard/RepPerformance";
import TopCustomers          from "@/components/dashboard/TopCustomers";
import TopProducts           from "@/components/dashboard/TopProducts";
import OverdueBalances       from "@/components/dashboard/OverdueBalances";
import { exportDashboardReport } from "@/lib/exportDashboard";
import { formatLKR }            from "@/lib/formatters";

// ─────────────────────────────────────────────────────────────
// Static location metadata
// ─────────────────────────────────────────────────────────────


const MOV_BADGE: Record<MovementType, string> = {
  ISSUE:      "bg-blue-50   text-blue-800",
  RETURN:     "bg-teal-50   text-teal-700",
  PURCHASE:   "bg-green-50  text-green-700",
  ADJUSTMENT: "bg-amber-50  text-amber-800",
  RETURN_UNUSABLE: "bg-rose-50 text-rose-700",
  ISSUE_REVERSAL: "bg-indigo-50 text-indigo-700",
  RETURN_REVERSAL: "bg-orange-50 text-orange-700",
  PURCHASE_REVERSAL: "bg-yellow-50 text-yellow-700",
  RETURN_UNUSABLE_REVERSAL: "bg-pink-50 text-pink-700",
};
const MOV_LABELS: Record<MovementType, string> = {
  ISSUE: "Issue",
  RETURN: "Return",
  PURCHASE: "Purchase",
  ADJUSTMENT: "Adjustment",
  RETURN_UNUSABLE: "Return Unusable",
  ISSUE_REVERSAL: "Issue Reversal",
  RETURN_REVERSAL: "Return Reversal",
  PURCHASE_REVERSAL: "Purchase Reversal",
  RETURN_UNUSABLE_REVERSAL: "Return Unusable Reversal",
};
const MOVEMENT_TYPES: MovementType[] = ["ISSUE", "RETURN", "PURCHASE", "ADJUSTMENT"];

const QUICK_ACTIONS = [
  { href: "/inventory",          icon: <Boxes size={20} />,    label: "Stock Overview", description: "View and manage all inventory",   accent: "bg-blue-50 text-blue-700 border-blue-100"     },
  { href: "/inventory/products", icon: <Package size={20} />,  label: "Products",       description: "View the product catalogue",      accent: "bg-green-50 text-green-700 border-green-100"  },
  { href: "/invoices",           icon: <FileText size={20} />, label: "New Invoice",    description: "Create a customer invoice",       accent: "bg-violet-50 text-violet-700 border-violet-100"},
  { href: "/sales-reps",         icon: <UserCheck size={20} />,label: "Sales Reps",     description: "Rep performance & commission",    accent: "bg-amber-50 text-amber-700 border-amber-100"  },
];

type DateRange = "this-month" | "last-month" | "this-quarter" | "this-year";

// ─────────────────────────────────────────────────────────────
// RecordMovementModal — unchanged from original
// ─────────────────────────────────────────────────────────────
function RecordMovementModal({
  stock, onClose, onSaved,
}: {
  stock:   StockOverviewRow[];
  onClose: () => void;
  onSaved: (mov: MovementRow) => void;
}) {
  const { user } = useUser();
  const [selectedStock, setSelectedStock] = useState<StockOverviewRow | null>(null);
  const [type,          setType]          = useState<MovementType>("ISSUE");
  const [qty,           setQty]           = useState("");
  const [notes,         setNotes]         = useState("");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  const qtyNum    = parseInt(qty) || 0;
  const isNeg     = type === "ISSUE" || type === "ADJUSTMENT";
  const projected = selectedStock
    ? isNeg ? selectedStock.quantity_on_hand - qtyNum : selectedStock.quantity_on_hand + qtyNum
    : null;
  const projStatus =
    projected === null ? null :
    projected <= 0     ? "out" :
    selectedStock && projected < selectedStock.reorder_threshold ? "low" : "ok";

  const handleSave = async () => {
    if (!selectedStock)      { setError("Select a product"); return; }
    if (!qty || qtyNum <= 0) { setError("Enter a valid quantity"); return; }
    if (isNeg && qtyNum > selectedStock.quantity_on_hand) {
      setError("Cannot issue more than on-hand stock"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/stock-movements", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ stock_id: selectedStock.stock_id, movement_type: type, quantity: qtyNum, notes: notes || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const delta = isNeg ? -qtyNum : qtyNum;
      onSaved({
        movement_id:     Date.now(),
        movement_date:   new Date().toISOString(),
        movement_type:   type,
        product_name:    selectedStock.product_name,
        product_code:    selectedStock.product_code,
        location_code:   selectedStock.location_code,
        movement_qty:    qtyNum,
        qty_delta:       delta,
        notes:           notes || null,
        created_by_name: user?.firstName || "Admin",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const uniqueLocations = Array.from(
    new Set(stock.map((s) => s.location_id))
  ).map((locId) => {
    const sample = stock.find((s) => s.location_id === locId);
    return {
      locationId: locId,
      code: sample?.location_code || `ID:${locId}`,
      name: sample?.location_name || `Location ${locId}`,
      items: stock.filter((r) => r.location_id === locId),
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity:0, scale:0.97, y:12 }} animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:0.97, y:8 }} transition={{ duration:0.18 }}
        className="bg-white border border-stone-200 rounded-2xl shadow-xl w-full max-w-[460px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center">
              <ArrowLeftRight size={14} className="text-green-700" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-stone-900 [font-family:var(--font-dmsans)] leading-none">Record Movement</p>
              <p className="text-[11.5px] text-stone-400 mt-0.5 [font-family:var(--font-dmsans)]">Issue, return, purchase or adjust stock</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:bg-stone-50">
            <X size={13} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 mb-1.5 [font-family:var(--font-dmsans)]">Product</p>
            <div className="relative">
              <select className="w-full px-3 py-2.5 text-[13px] appearance-none border border-stone-200 rounded-xl bg-white text-stone-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 transition-all [font-family:var(--font-dmsans)]"
                value={selectedStock?.stock_id ?? ""}
                onChange={(e) => { setSelectedStock(stock.find((r) => r.stock_id === Number(e.target.value)) ?? null); setError(""); }}>
                <option value="">Select a product…</option>
                {uniqueLocations.map((g) => g.items.length > 0 ? (
                  <optgroup key={g.locationId} label={`${g.code} — ${g.name}`}>
                    {g.items.map((r) => (
                      <option key={r.stock_id} value={r.stock_id}>
                        {r.product_code} · {r.product_name} ({r.quantity_on_hand} in stock)
                      </option>
                    ))}
                  </optgroup>
                ) : null)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
          </div>

          {selectedStock && (
            <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
              className="flex items-center justify-between bg-stone-50 border border-stone-100 rounded-xl px-4 py-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">Current stock</p>
                <p className="text-[22px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] leading-none mt-0.5">{selectedStock.quantity_on_hand}</p>
              </div>
              <div className="text-right">
                <span className="[font-family:var(--font-jetbrains)] text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">{selectedStock.location_code}</span>
                <p className="text-[11px] text-stone-400 mt-1.5 [font-family:var(--font-dmsans)]">Threshold: {selectedStock.reorder_threshold}</p>
              </div>
            </motion.div>
          )}

          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 mb-1.5 [font-family:var(--font-dmsans)]">Type</p>
            <div className="grid grid-cols-4 gap-1.5">
              {MOVEMENT_TYPES.map((t) => (
                <button key={t} onClick={() => setType(t)}
                  className={`py-2 rounded-xl text-[12px] font-medium border transition-all [font-family:var(--font-dmsans)] ${
                    type === t ? "bg-green-700 text-white border-green-700" : "bg-white text-stone-600 border-stone-200 hover:border-green-300"
                  }`}>
                  {MOV_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 mb-1.5 [font-family:var(--font-dmsans)]">Quantity</p>
              <input type="number" min="1" value={qty}
                onChange={(e) => { setQty(e.target.value); setError(""); }}
                placeholder="e.g. 10"
                className="w-full px-3 py-2.5 text-[14px] [font-family:var(--font-jetbrains)] border border-stone-200 rounded-xl bg-white text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 transition-all" />
            </div>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 mb-1.5 [font-family:var(--font-dmsans)]">Notes</p>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Order ref, reason…"
                className="w-full px-3 py-2.5 text-[13px] [font-family:var(--font-dmsans)] border border-stone-200 rounded-xl bg-white text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 transition-all" />
            </div>
          </div>

          {error && <p className="text-[11.5px] text-red-500 [font-family:var(--font-dmsans)]">{error}</p>}

          {selectedStock && qtyNum > 0 && projected !== null && projStatus && (
            <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                projStatus === "out" ? "bg-red-50 border-red-100" :
                projStatus === "low" ? "bg-amber-50 border-amber-100" : "bg-green-50 border-green-100"
              }`}>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">After movement</p>
                <p className={`text-[20px] font-semibold [font-family:var(--font-dmsans)] leading-none mt-0.5 ${
                  projStatus === "out" ? "text-red-700" : projStatus === "low" ? "text-amber-700" : "text-green-700"
                }`}>{Math.max(0, projected)}</p>
              </div>
              <span className={`text-[13px] font-bold [font-family:var(--font-jetbrains)] ${isNeg ? "text-red-600" : "text-green-600"}`}>
                {isNeg ? `−${qtyNum}` : `+${qtyNum}`}
              </span>
            </motion.div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-stone-100 bg-stone-50">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-stone-600 border border-stone-200 rounded-xl hover:bg-white transition-colors [font-family:var(--font-dmsans)]">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors [font-family:var(--font-dmsans)]">
            {saving ? (
              <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>Saving…</>
            ) : (
              <><ArrowLeftRight size={13} /> Save Movement</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KPI Card — matches existing stat card style exactly
// ─────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, iconBg, badgeCls, trendUp, loading,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; iconBg: string; badgeCls: string;
  trendUp?: boolean; loading?: boolean;
}) {
  if (loading) {
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
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start hover:shadow-sm transition-shadow">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">{label}</p>
        <p className="text-[24px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] leading-none my-1">{value}</p>
        {sub && (
          <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full [font-family:var(--font-dmsans)] ${badgeCls}`}>
            {trendUp && <ArrowUpRight size={11} className="mr-0.5" />}{sub}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Greeting helpers
// ─────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user }   = useUser();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Tab state
  const [activeTab,   setActiveTab]   = useState<"sales" | "inventory">("sales");
  const [dateRange,   setDateRange]   = useState<DateRange>("this-month");
  const [exporting,   setExporting]   = useState(false);
  const [showMovModal, setShowMovModal] = useState(false);
  const [localMovements, setLocalMovements] = useState<MovementRow[]>([]);

  // ── Inventory data (for existing Inventory tab) ──
  const { data: stockResponse = { stock: [], pagination: { total: 0 } } } = useAllStock();
  const stock = stockResponse.stock;
  const { data: summaries   = [] } = useLocationSummaries();
  // eslint-disable-next-line
  const { data: allMovements = { items: [], pagination: { total: 0 } } as any } = useAllMovements();
  const qc = useQueryClient();

  // ── Sales data ──
  const { data: salesData, isLoading: salesLoading } = useSalesDashboard(dateRange);

  const displayMovements = localMovements.length > 0
    ? localMovements
    : (allMovements.items || []).slice(0, 5);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const inventoryStats = useMemo(() => ({
    totalProducts: summaries.reduce((a, s) => a + s.total_products, 0) || stockResponse.pagination.total,
    totalUnits:    summaries.reduce((a, s) => a + Number(s.total_units), 0),
    lowCount:      summaries.reduce((a, s) => a + Number(s.low_count), 0),
    outCount:      summaries.reduce((a, s) => a + Number(s.out_count), 0),
  }), [summaries, stockResponse.pagination.total]);

  const handleMovSaved = (mov: MovementRow) => {
    setLocalMovements((prev) => [mov, ...prev].slice(0, 5));
    qc.invalidateQueries({ queryKey: ["stock"] });
    qc.invalidateQueries({ queryKey: ["movements"] });
  };

  const handleExport = async () => {
    if (!salesData) return;
    setExporting(true);
    try {
      await exportDashboardReport(salesData, dateRange);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium text-stone-400 uppercase tracking-[0.12em] [font-family:var(--font-dmsans)] mb-1">
            {mounted ? today : "Loading…"}
          </p>
          <h1 className="text-[26px] font-semibold text-stone-900 tracking-tight [font-family:var(--font-dmsans)] leading-tight">
            {mounted ? greeting() : "Welcome"}, {mounted && user?.firstName ? user.firstName : "Admin"} 👋
          </h1>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            Here&apos;s what&apos;s happening across your business today.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {activeTab === "sales" && (
            <>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="px-3 py-2 text-[12px] border border-stone-200 rounded-xl bg-white text-stone-700 focus:outline-none focus:border-green-400 [font-family:var(--font-dmsans)]">
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="this-quarter">This Quarter</option>
                <option value="this-year">This Year</option>
              </select>
              <button onClick={handleExport} disabled={exporting || !salesData}
                className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-stone-600 border border-stone-200 rounded-xl hover:bg-stone-50 disabled:opacity-50 transition-colors [font-family:var(--font-dmsans)]">
                {exporting
                  ? <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>Exporting…</>
                  : <><Download size={13} />Export Report</>
                }
              </button>
            </>
          )}
          {activeTab === "inventory" && (
            <button onClick={() => setShowMovModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-[13px] font-semibold rounded-xl transition-colors [font-family:var(--font-dmsans)]">
              <ArrowLeftRight size={14} /> Record Movement
            </button>
          )}
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit">
        {(["sales", "inventory"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-all [font-family:var(--font-dmsans)] ${
              activeTab === t
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}>
            {t === "sales" ? "Sales & Revenue" : "Inventory"}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          SALES TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === "sales" && (
        <div className="space-y-5">

          {/* KPI row — 5 cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard loading={salesLoading} label="Total Sales"
              value={salesData?.kpis ? formatLKR(salesData.kpis.totalSales) : "—"}
              sub={salesData?.kpis ? `↑ ${salesData.kpis.salesGrowth ?? 0}% vs last period` : undefined}
              icon={<DollarSign size={18} className="text-blue-700" />}
              iconBg="bg-blue-50 border-blue-100" badgeCls="bg-blue-50 text-blue-800" trendUp />
            <KpiCard loading={salesLoading} label="Collections"
              value={salesData?.kpis ? formatLKR(salesData.kpis.collections) : "—"}
              sub="Cash received"
              icon={<TrendingUp size={18} className="text-green-700" />}
              iconBg="bg-green-50 border-green-100" badgeCls="bg-green-50 text-green-700" trendUp />
            <KpiCard loading={salesLoading} label="Outstanding"
              value={salesData?.kpis ? formatLKR(salesData.kpis.totalOutstanding) : "—"}
              sub={salesData?.kpis ? `${salesData.kpis.overdueCustomers} overdue` : undefined}
              icon={<Clock size={18} className="text-amber-700" />}
              iconBg="bg-amber-50 border-amber-100" badgeCls="bg-amber-50 text-amber-800" />
            <KpiCard loading={salesLoading} label="Active Customers"
              value={salesData?.kpis.activeCustomers ?? "—"}
              sub={salesData?.kpis ? `+${salesData.kpis.newCustomers ?? 0} new` : undefined}
              icon={<Users size={18} className="text-violet-700" />}
              iconBg="bg-violet-50 border-violet-100" badgeCls="bg-violet-50 text-violet-700" trendUp />
            <KpiCard loading={salesLoading} label="Overdue Customers"
              value={salesData?.kpis.overdueCustomers ?? "—"}
              sub="Need follow-up"
              icon={<AlertTriangle size={18} className="text-red-600" />}
              iconBg="bg-red-50 border-red-100" badgeCls="bg-red-50 text-red-700" />
          </div>

          {/* Row 2: trend + segments */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
              <SalesTrendChart data={salesData?.salesTrend ?? []} loading={salesLoading} />
            </div>
            <div className="lg:col-span-2">
              <CustomerSegmentsChart data={salesData?.customerSegments} loading={salesLoading} />
            </div>
          </div>

          {/* Row 3: rep performance + top customers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RepPerformance data={salesData?.salesByRep ?? []} loading={salesLoading} />
            <TopCustomers  data={salesData?.topCustomers ?? []} loading={salesLoading} />
          </div>

          {/* Row 4: top products + overdue */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
              <TopProducts dateRange={dateRange} />
            </div>
            <div className="lg:col-span-2">
              <OverdueBalances data={salesData?.overdueCustomers ?? []} loading={salesLoading} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          INVENTORY TAB — original dashboard content
      ══════════════════════════════════════════════════════ */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Products", value: inventoryStats.totalProducts,              sub: "Across 4 locations", icon: <Package size={18} className="text-green-700" />,   iconBg: "bg-green-50 border-green-100",  badgeCls: "bg-green-50 text-green-700"  },
              { label: "Total Units",    value: inventoryStats.totalUnits.toLocaleString(), sub: "+155 this week",     icon: <TrendingUp size={18} className="text-blue-700" />, iconBg: "bg-blue-50 border-blue-100",    badgeCls: "bg-blue-50 text-blue-800",   trendUp: true },
              { label: "Low Stock",      value: inventoryStats.lowCount,                    sub: `${inventoryStats.lowCount} below threshold`, icon: <AlertTriangle size={18} className="text-amber-700" />, iconBg: "bg-amber-50 border-amber-100", badgeCls: "bg-amber-50 text-amber-800" },
              { label: "Out of Stock",   value: inventoryStats.outCount,                    sub: `${inventoryStats.outCount} need restocking`, icon: <XCircle size={18} className="text-red-600" />,         iconBg: "bg-red-50 border-red-100",     badgeCls: "bg-red-50 text-red-700"    },
            ].map((s) => (
              <KpiCard key={s.label} {...s} />
            ))}
          </div>

          {/* Recent movements + quick actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Activity size={15} className="text-stone-400" />
                  <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">Recent Movements</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowMovModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11.5px] font-medium text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 rounded-lg transition-colors [font-family:var(--font-dmsans)]">
                    <Plus size={11} /> Record
                  </button>
                  <Link href="/inventory?tab=movements" className="flex items-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)]">
                    View all <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-stone-50">
                    {["Type","Product","Location","Recorded Qty","Stock Delta","Time","By"].map((h, i) => (
                      <th key={h} className={`px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-stone-400 text-left [font-family:var(--font-dmsans)] ${i===3 || i===4 ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {displayMovements.map((m: MovementRow) => {
                      const isNeg = m.qty_delta < 0;
                      return (
                        <motion.tr key={m.movement_id}
                          initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.2 }}
                          className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium [font-family:var(--font-dmsans)] ${MOV_BADGE[m.movement_type as MovementType]}`}>
                              {MOV_LABELS[m.movement_type as MovementType]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[12.5px] font-medium text-stone-700 max-w-[140px] truncate [font-family:var(--font-dmsans)]">{m.product_name}</td>
                          <td className="px-4 py-3">
                            <span className="[font-family:var(--font-jetbrains)] text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">{m.location_code}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-[14px] text-stone-700 [font-family:var(--font-jetbrains)]">
                            {m.movement_qty}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-[14px] [font-family:var(--font-jetbrains)]"
                            style={{ color: isNeg ? "#991b1b" : "#166534" }}>
                            {isNeg ? `−${Math.abs(m.qty_delta)}` : `+${m.qty_delta}`}
                          </td>
                          <td className="px-4 py-3 text-[12px] text-stone-400 whitespace-nowrap [font-family:var(--font-dmsans)]">
                            <span className="flex items-center gap-1"><Clock size={11} />{new Date(m.movement_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</span>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">{m.created_by_name}</td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-stone-100">
                <Plus size={15} className="text-stone-400" />
                <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">Quick Actions</span>
              </div>
              <div className="p-3 space-y-1">
                <button onClick={() => setShowMovModal(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors group text-left">
                  <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 bg-green-50 text-green-700 border-green-100">
                    <ArrowLeftRight size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] group-hover:text-blue-800 transition-colors">Record Movement</p>
                    <p className="text-[11.5px] text-stone-400 [font-family:var(--font-dmsans)]">Issue, return or adjust stock</p>
                  </div>
                  <ChevronRight size={14} className="text-stone-300 group-hover:text-blue-400 shrink-0" />
                </button>
                {QUICK_ACTIONS.map((a) => (
                  <Link key={a.href} href={a.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors group">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${a.accent}`}>{a.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] group-hover:text-blue-800 transition-colors">{a.label}</p>
                      <p className="text-[11.5px] text-stone-400 [font-family:var(--font-dmsans)]">{a.description}</p>
                    </div>
                    <ChevronRight size={14} className="text-stone-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Location health */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-stone-400" />
                <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">Location Health</span>
              </div>
              <Link href="/inventory" className="flex items-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)]">
                Manage <ChevronRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-100">
              {summaries.map((loc) => {
                const maxUnits = Math.max(...summaries.map((s) => s.total_units), 1);
                const pct      = Math.round((loc.total_units / maxUnits) * 100);
                const bar      = pct >= 75 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
                const stTxt    = pct >= 75 ? "Healthy" : pct >= 40 ? "Moderate" : "Critical";
                const stCls    = pct >= 75 ? "text-green-700 bg-green-50" : pct >= 40 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50";
                return (
                  <Link key={loc.location_id} href={`/inventory/${loc.location_id}`}
                    className="block p-4 hover:bg-stone-50/60 transition-colors group">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-jetbrains)] mb-0.5">{loc.code}</p>
                        <p className="text-[13.5px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] group-hover:text-blue-800 transition-colors">{loc.name}</p>
                      </div>
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full [font-family:var(--font-dmsans)] ${stCls}`}>{stTxt}</span>
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between text-[11px] text-stone-400 mb-1 [font-family:var(--font-dmsans)]">
                        <span>Stock level</span>
                        <span className="font-semibold text-stone-600">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex gap-3 text-[11.5px] [font-family:var(--font-dmsans)]">
                      <div><p className="font-bold text-stone-700 [font-family:var(--font-jetbrains)] text-[13px]">{loc.total_products}</p><p className="text-stone-400">Products</p></div>
                      <div><p className="font-bold text-stone-700 [font-family:var(--font-jetbrains)] text-[13px]">{loc.total_units.toLocaleString()}</p><p className="text-stone-400">Units</p></div>
                      {loc.low_count > 0 && <div><p className="font-bold text-amber-700 [font-family:var(--font-jetbrains)] text-[13px]">{loc.low_count}</p><p className="text-amber-500">Low</p></div>}
                      {loc.out_count > 0 && <div><p className="font-bold text-red-700 [font-family:var(--font-jetbrains)] text-[13px]">{loc.out_count}</p><p className="text-red-500">Out</p></div>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showMovModal && (
          <RecordMovementModal
            stock={stock}
            onClose={() => setShowMovModal(false)}
            onSaved={handleMovSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
