// app/(dashboard)/dashboard/page.tsx
// Replace your existing dashboard page with this.
// The page is now a client component so the "Record Movement" button
// can open the modal directly without needing a separate route.

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Package,
  TrendingUp,
  AlertTriangle,
  XCircle,
  ArrowLeftRight,
  Plus,
  FileText,
  UserCheck,
  MapPin,
  ChevronRight,
  Activity,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  X,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────

type StockStatus = "ok" | "low" | "out";
type MovementType = "ISSUE" | "RETURN" | "PURCHASE" | "ADJUSTMENT";

interface StockRow {
  stock_id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  category_name: string;
  pack_size: string;
  quantity_on_hand: number;
  reorder_threshold: number;
  status: StockStatus;
  location_id: number;
  location_code: string;
}

interface MovementRow {
  movement_id: number;
  movement_date: string;
  movement_type: MovementType;
  product_name: string;
  location_code: string;
  qty_delta: number;
  notes: string | null;
  created_by_name: string;
}

// ── Mock data ─────────────────────────────────────────────────

const ALL_STOCK: StockRow[] = [
  {
    stock_id: 1,
    product_id: 1,
    product_code: "FERT-0001",
    product_name: "AgriGold Fertilizer",
    category_name: "Fertilizer",
    pack_size: "25 kg",
    quantity_on_hand: 120,
    reorder_threshold: 50,
    status: "ok",
    location_id: 1,
    location_code: "IGRN1",
  },
  {
    stock_id: 2,
    product_id: 2,
    product_code: "FUNG-0001",
    product_name: "BioShield Fungicide",
    category_name: "Fungicide",
    pack_size: "500 ml",
    quantity_on_hand: 18,
    reorder_threshold: 30,
    status: "low",
    location_id: 1,
    location_code: "IGRN1",
  },
  {
    stock_id: 3,
    product_id: 3,
    product_code: "SUPP-0001",
    product_name: "RootBoost Supplement",
    category_name: "Supplement",
    pack_size: "1 L",
    quantity_on_hand: 0,
    reorder_threshold: 20,
    status: "out",
    location_id: 2,
    location_code: "IGRN2",
  },
  {
    stock_id: 4,
    product_id: 4,
    product_code: "INSC-0001",
    product_name: "PestOff Insecticide",
    category_name: "Insecticide",
    pack_size: "250 ml",
    quantity_on_hand: 75,
    reorder_threshold: 25,
    status: "ok",
    location_id: 2,
    location_code: "IGRN2",
  },
  {
    stock_id: 5,
    product_id: 5,
    product_code: "HERB-0001",
    product_name: "GreenMax Herbicide",
    category_name: "Herbicide",
    pack_size: "1 L",
    quantity_on_hand: 8,
    reorder_threshold: 20,
    status: "low",
    location_id: 3,
    location_code: "IGRN3",
  },
  {
    stock_id: 6,
    product_id: 6,
    product_code: "SOIL-0001",
    product_name: "SoilPro Conditioner",
    category_name: "Soil",
    pack_size: "10 kg",
    quantity_on_hand: 44,
    reorder_threshold: 15,
    status: "ok",
    location_id: 3,
    location_code: "IGRN3",
  },
  {
    stock_id: 7,
    product_id: 7,
    product_code: "SUPP-0002",
    product_name: "NutriSpray Foliar",
    category_name: "Supplement",
    pack_size: "500 ml",
    quantity_on_hand: 0,
    reorder_threshold: 10,
    status: "out",
    location_id: 4,
    location_code: "IGRN4",
  },
  {
    stock_id: 8,
    product_id: 8,
    product_code: "NEMA-0001",
    product_name: "CropSafe Nematicide",
    category_name: "Nematicide",
    pack_size: "1 L",
    quantity_on_hand: 62,
    reorder_threshold: 10,
    status: "ok",
    location_id: 4,
    location_code: "IGRN4",
  },
];

const LOCATIONS_DATA = [
  {
    code: "IGRN1",
    name: "Head Office",
    locationId: 1,
    products: 48,
    units: 3200,
    low: 2,
    out: 0,
    pct: 88,
  },
  {
    code: "IGRN2",
    name: "Kuliyapitiya",
    locationId: 2,
    products: 36,
    units: 2100,
    low: 5,
    out: 1,
    pct: 62,
  },
  {
    code: "IGRN3",
    name: "Nuwara Eliya",
    locationId: 3,
    products: 31,
    units: 1800,
    low: 3,
    out: 2,
    pct: 55,
  },
  {
    code: "IGRN4",
    name: "Peradeniya",
    locationId: 4,
    products: 27,
    units: 1330,
    low: 2,
    out: 0,
    pct: 72,
  },
];

const RECENT_MOVEMENTS_INIT: MovementRow[] = [
  {
    movement_id: 1,
    movement_date: "2026-04-12T08:30:00Z",
    movement_type: "PURCHASE",
    product_name: "AgriGold Fertilizer",
    location_code: "IGRN1",
    qty_delta: +48,
    notes: "Restock",
    created_by_name: "Admin",
  },
  {
    movement_id: 2,
    movement_date: "2026-04-11T14:10:00Z",
    movement_type: "ISSUE",
    product_name: "BioShield Fungicide",
    location_code: "IGRN2",
    qty_delta: -12,
    notes: "Sales order #1042",
    created_by_name: "Kamal P.",
  },
  {
    movement_id: 3,
    movement_date: "2026-04-11T11:00:00Z",
    movement_type: "RETURN",
    product_name: "PestOff Insecticide",
    location_code: "IGRN3",
    qty_delta: +5,
    notes: "Customer return",
    created_by_name: "Admin",
  },
  {
    movement_id: 4,
    movement_date: "2026-04-10T09:00:00Z",
    movement_type: "ADJUSTMENT",
    product_name: "SoilPro Conditioner",
    location_code: "IGRN4",
    qty_delta: -3,
    notes: "Damaged units",
    created_by_name: "Admin",
  },
  {
    movement_id: 5,
    movement_date: "2026-04-10T07:30:00Z",
    movement_type: "ISSUE",
    product_name: "Carbofuran 3G",
    location_code: "IGRN2",
    qty_delta: -20,
    notes: "Sales order #1040",
    created_by_name: "Kamal P.",
  },
];

// ── Styles ────────────────────────────────────────────────────

const MOV_BADGE: Record<MovementType, string> = {
  ISSUE: "bg-blue-50   text-blue-800",
  RETURN: "bg-teal-50   text-teal-700",
  PURCHASE: "bg-green-50  text-green-700",
  ADJUSTMENT: "bg-amber-50  text-amber-800",
};
const MOV_LABELS: Record<MovementType, string> = {
  ISSUE: "Issue",
  RETURN: "Return",
  PURCHASE: "Purchase",
  ADJUSTMENT: "Adjustment",
};

const STATUS_CFG: Record<
  StockStatus,
  { dot: string; badge: string; label: string }
> = {
  ok: {
    dot: "bg-green-500",
    badge: "bg-green-50 text-green-700 border-green-200",
    label: "In Stock",
  },
  low: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    label: "Low Stock",
  },
  out: {
    dot: "bg-red-500",
    badge: "bg-red-50   text-red-700   border-red-200",
    label: "Out of Stock",
  },
};

const MOVEMENT_TYPES: MovementType[] = [
  "ISSUE",
  "RETURN",
  "PURCHASE",
  "ADJUSTMENT",
];

// ── Quick Actions data ────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    href: "/inventory",
    icon: <Boxes size={20} />,
    label: "Stock Overview",
    description: "View and manage all inventory",
    accent: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    href: "/inventory/products",
    icon: <Package size={20} />,
    label: "Products",
    description: "View the product catalogue",
    accent: "bg-green-50 text-green-700 border-green-100",
  },
  {
    href: "/invoices",
    icon: <FileText size={20} />,
    label: "New Invoice",
    description: "Create a customer invoice",
    accent: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    href: "/sales-reps",
    icon: <UserCheck size={20} />,
    label: "Sales Reps",
    description: "Rep performance & commission",
    accent: "bg-amber-50 text-amber-700 border-amber-100",
  },
];

// ── Record Movement Modal ─────────────────────────────────────

function RecordMovementModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (mov: MovementRow) => void;
}) {
  const [selectedStock, setSelectedStock] = useState<StockRow | null>(null);
  const [type, setType] = useState<MovementType>("ISSUE");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const qtyNum = parseInt(qty) || 0;
  const isNeg = type === "ISSUE" || type === "ADJUSTMENT";
  const projected = selectedStock
    ? isNeg
      ? selectedStock.quantity_on_hand - qtyNum
      : selectedStock.quantity_on_hand + qtyNum
    : null;
  const projStatus: StockStatus | null =
    projected === null
      ? null
      : projected <= 0
        ? "out"
        : selectedStock && projected < selectedStock.reorder_threshold
          ? "low"
          : "ok";

  const handleSave = async () => {
    if (!selectedStock) {
      setError("Select a product");
      return;
    }
    if (!qty || qtyNum <= 0) {
      setError("Enter a valid quantity");
      return;
    }
    if (isNeg && qtyNum > selectedStock.quantity_on_hand) {
      setError("Cannot issue more than on-hand stock");
      return;
    }
    setSaving(true);
    // Real: POST /api/stock-movements
    await new Promise((r) => setTimeout(r, 600));
    const delta = isNeg ? -qtyNum : +qtyNum;
    onSaved({
      movement_id: Date.now(),
      movement_date: new Date().toISOString(),
      movement_type: type,
      product_name: selectedStock.product_name,
      location_code: selectedStock.location_code,
      qty_delta: delta,
      notes: notes || null,
      created_by_name: "Admin",
    });
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-white border border-stone-200 rounded-2xl shadow-xl w-full max-w-[460px] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center">
              <ArrowLeftRight size={14} className="text-green-700" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-stone-900 [font-family:var(--font-playfair)] leading-none">
                Record Movement
              </p>
              <p className="text-[11.5px] text-stone-400 mt-0.5 [font-family:var(--font-dmsans)]">
                Issue, return, purchase or adjust stock
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:bg-stone-50"
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Product selector */}
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 mb-1.5 [font-family:var(--font-dmsans)]">
              Product
            </p>
            <div className="relative">
              <select
                className="w-full px-3 py-2.5 text-[13px] appearance-none border border-stone-200 rounded-xl bg-white text-stone-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 transition-all [font-family:var(--font-dmsans)]"
                value={selectedStock?.stock_id ?? ""}
                onChange={(e) => {
                  const s =
                    ALL_STOCK.find(
                      (r) => r.stock_id === Number(e.target.value),
                    ) ?? null;
                  setSelectedStock(s);
                  setError("");
                }}
              >
                <option value="">Select a product…</option>
                {LOCATIONS_DATA.map((loc) => (
                  <optgroup key={loc.code} label={`${loc.code} — ${loc.name}`}>
                    {ALL_STOCK.filter(
                      (r) => r.location_id === loc.locationId,
                    ).map((r) => (
                      <option key={r.stock_id} value={r.stock_id}>
                        {r.product_code} · {r.product_name} (
                        {r.quantity_on_hand} in stock)
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Current stock pill — only if product selected */}
          {selectedStock && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between bg-stone-50 border border-stone-100 rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-[11px] uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">
                  Current stock
                </p>
                <p className="text-[22px] font-semibold text-stone-800 [font-family:var(--font-playfair)] leading-none mt-0.5">
                  {selectedStock.quantity_on_hand}
                </p>
              </div>
              <div className="text-right">
                <span className="[font-family:var(--font-jetbrains)] text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                  {selectedStock.location_code}
                </span>
                <p className="text-[11px] text-stone-400 mt-1.5 [font-family:var(--font-dmsans)]">
                  Threshold: {selectedStock.reorder_threshold}
                </p>
              </div>
            </motion.div>
          )}

          {/* Movement type */}
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 mb-1.5 [font-family:var(--font-dmsans)]">
              Type
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {MOVEMENT_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-2 rounded-xl text-[12px] font-medium border transition-all [font-family:var(--font-dmsans)] ${
                    type === t
                      ? "bg-green-700 text-white border-green-700"
                      : "bg-white text-stone-600 border-stone-200 hover:border-green-300"
                  }`}
                >
                  {MOV_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Qty + Notes row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 mb-1.5 [font-family:var(--font-dmsans)]">
                Quantity
              </p>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => {
                  setQty(e.target.value);
                  setError("");
                }}
                placeholder="e.g. 10"
                className="w-full px-3 py-2.5 text-[14px] [font-family:var(--font-jetbrains)] border border-stone-200 rounded-xl bg-white text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 transition-all"
              />
            </div>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 mb-1.5 [font-family:var(--font-dmsans)]">
                Notes
              </p>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Order ref, reason…"
                className="w-full px-3 py-2.5 text-[13px] [font-family:var(--font-dmsans)] border border-stone-200 rounded-xl bg-white text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 transition-all"
              />
            </div>
          </div>

          {error && (
            <p className="text-[11.5px] text-red-500 [font-family:var(--font-dmsans)]">
              {error}
            </p>
          )}

          {/* Projected */}
          {selectedStock && qtyNum > 0 && projected !== null && projStatus && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                projStatus === "out"
                  ? "bg-red-50 border-red-100"
                  : projStatus === "low"
                    ? "bg-amber-50 border-amber-100"
                    : "bg-green-50 border-green-100"
              }`}
            >
              <div>
                <p className="text-[11px] uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
                  After movement
                </p>
                <p
                  className={`text-[20px] font-semibold [font-family:var(--font-playfair)] leading-none mt-0.5 ${
                    projStatus === "out"
                      ? "text-red-700"
                      : projStatus === "low"
                        ? "text-amber-700"
                        : "text-green-700"
                  }`}
                >
                  {Math.max(0, projected)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_CFG[projStatus].badge}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[projStatus].dot}`}
                  />
                  {STATUS_CFG[projStatus].label}
                </span>
                <span
                  className={`text-[13px] font-bold [font-family:var(--font-jetbrains)] ${isNeg ? "text-red-600" : "text-green-600"}`}
                >
                  {isNeg ? `−${qtyNum}` : `+${qtyNum}`}
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-stone-100 bg-stone-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-stone-600 border border-stone-200 rounded-xl hover:bg-white transition-colors [font-family:var(--font-dmsans)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors [font-family:var(--font-dmsans)]"
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <ArrowLeftRight size={13} /> Save Movement
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Dashboard Page ────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const [movements, setMovements] = useState<MovementRow[]>(
    RECENT_MOVEMENTS_INIT,
  );
  const [showMovModal, setShowMovModal] = useState(false);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const stats = useMemo(
    () => ({
      totalProducts: ALL_STOCK.length,
      totalUnits: ALL_STOCK.reduce((a, b) => a + b.quantity_on_hand, 0),
      lowCount: ALL_STOCK.filter((r) => r.status === "low").length,
      outCount: ALL_STOCK.filter((r) => r.status === "out").length,
    }),
    [],
  );

  const handleMovSaved = (mov: MovementRow) => {
    setMovements((prev) => [mov, ...prev]);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium text-stone-400 uppercase tracking-[0.12em] [font-family:var(--font-dmsans)] mb-1">
            {today}
          </p>
          <h1 className="text-[26px] font-semibold text-stone-900 tracking-tight [font-family:var(--font-playfair)] leading-tight">
            {greeting()}, Admin 👋
          </h1>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            Here's what's happening across your inventory today.
          </p>
        </div>

        {/* ✅ Now opens modal instead of navigating */}
        <button
          onClick={() => setShowMovModal(true)}
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-[13px] font-semibold rounded-xl transition-colors [font-family:var(--font-dmsans)]"
        >
          <ArrowLeftRight size={14} /> Record Movement
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Products",
            value: stats.totalProducts,
            sub: "Across 4 locations",
            icon: <Package size={18} className="text-green-700" />,
            iconBg: "bg-green-50 border-green-100",
            badgeCls: "bg-green-50 text-green-700",
          },
          {
            label: "Total Units",
            value: stats.totalUnits.toLocaleString(),
            sub: "+155 this week",
            icon: <TrendingUp size={18} className="text-blue-700" />,
            iconBg: "bg-blue-50 border-blue-100",
            badgeCls: "bg-blue-50 text-blue-800",
            trendUp: true,
          },
          {
            label: "Low Stock",
            value: stats.lowCount,
            sub: `${stats.lowCount} below threshold`,
            icon: <AlertTriangle size={18} className="text-amber-700" />,
            iconBg: "bg-amber-50 border-amber-100",
            badgeCls: "bg-amber-50 text-amber-800",
          },
          {
            label: "Out of Stock",
            value: stats.outCount,
            sub: `${stats.outCount} need restocking`,
            icon: <XCircle size={18} className="text-red-600" />,
            iconBg: "bg-red-50 border-red-100",
            badgeCls: "bg-red-50 text-red-700",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start hover:shadow-sm transition-shadow"
          >
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${s.iconBg}`}
            >
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">
                {s.label}
              </p>
              <p className="text-[26px] font-semibold text-stone-800 [font-family:var(--font-playfair)] leading-none my-1">
                {s.value}
              </p>
              <span
                className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full [font-family:var(--font-dmsans)] ${s.badgeCls}`}
              >
                {s.trendUp && <ArrowUpRight size={11} className="mr-0.5" />}
                {s.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Movements */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-stone-400" />
              <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
                Recent Movements
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMovModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11.5px] font-medium text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 rounded-lg transition-colors [font-family:var(--font-dmsans)]"
              >
                <Plus size={11} /> Record
              </button>
              <Link
                href="/inventory/movements"
                className="flex items-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)]"
              >
                View all <ChevronRight size={12} />
              </Link>
            </div>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-stone-50">
                {["Type", "Product", "Location", "Qty", "Time", "By"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-stone-400 text-left [font-family:var(--font-dmsans)] ${i === 3 ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {movements.slice(0, 5).map((m) => {
                  const isNeg = m.qty_delta < 0;
                  return (
                    <motion.tr
                      key={m.movement_id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/60 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium [font-family:var(--font-dmsans)] ${MOV_BADGE[m.movement_type]}`}
                        >
                          {MOV_LABELS[m.movement_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12.5px] font-medium text-stone-700 max-w-[140px] truncate [font-family:var(--font-dmsans)]">
                        {m.product_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="[font-family:var(--font-jetbrains)] text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                          {m.location_code}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-right font-semibold text-[14px] [font-family:var(--font-jetbrains)]"
                        style={{ color: isNeg ? "#991b1b" : "#166534" }}
                      >
                        {isNeg
                          ? `−${Math.abs(m.qty_delta)}`
                          : `+${m.qty_delta}`}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-stone-400 whitespace-nowrap [font-family:var(--font-dmsans)]">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(m.movement_date).toLocaleDateString(
                            "en-GB",
                            { day: "2-digit", month: "short" },
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">
                        {m.created_by_name}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-stone-100">
            <Plus size={15} className="text-stone-400" />
            <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
              Quick Actions
            </span>
          </div>
          <div className="p-3 space-y-1">
            {/* Record Movement as a button inside quick actions too */}
            <button
              onClick={() => setShowMovModal(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors group text-left"
            >
              <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 bg-green-50 text-green-700 border-green-100">
                <ArrowLeftRight size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] group-hover:text-blue-800 transition-colors">
                  Record Movement
                </p>
                <p className="text-[11.5px] text-stone-400 [font-family:var(--font-dmsans)]">
                  Issue, return or adjust stock
                </p>
              </div>
              <ChevronRight
                size={14}
                className="text-stone-300 group-hover:text-blue-400 shrink-0"
              />
            </button>

            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors group"
              >
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${a.accent}`}
                >
                  {a.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] group-hover:text-blue-800 transition-colors">
                    {a.label}
                  </p>
                  <p className="text-[11.5px] text-stone-400 [font-family:var(--font-dmsans)]">
                    {a.description}
                  </p>
                </div>
                <ChevronRight
                  size={14}
                  className="text-stone-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Location Health ── */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-stone-400" />
            <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
              Location Health
            </span>
          </div>
          <Link
            href="/inventory"
            className="flex items-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)]"
          >
            Manage <ChevronRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-100">
          {LOCATIONS_DATA.map((loc) => {
            const barColor =
              loc.pct >= 75
                ? "bg-green-500"
                : loc.pct >= 50
                  ? "bg-amber-500"
                  : "bg-red-500";
            const statusText =
              loc.pct >= 75
                ? "Healthy"
                : loc.pct >= 50
                  ? "Moderate"
                  : "Critical";
            const statusStyle =
              loc.pct >= 75
                ? "text-green-700 bg-green-50"
                : loc.pct >= 50
                  ? "text-amber-700 bg-amber-50"
                  : "text-red-700 bg-red-50";
            return (
              <Link
                key={loc.code}
                href={`/inventory/${loc.locationId}`}
                className="block p-4 hover:bg-stone-50/60 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-jetbrains)] mb-0.5">
                      {loc.code}
                    </p>
                    <p className="text-[13.5px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] group-hover:text-blue-800 transition-colors">
                      {loc.name}
                    </p>
                  </div>
                  <span
                    className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full [font-family:var(--font-dmsans)] ${statusStyle}`}
                  >
                    {statusText}
                  </span>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-[11px] text-stone-400 mb-1 [font-family:var(--font-dmsans)]">
                    <span>Stock level</span>
                    <span className="font-semibold text-stone-600">
                      {loc.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${loc.pct}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-3 text-[11.5px] [font-family:var(--font-dmsans)]">
                  <div>
                    <p className="font-bold text-stone-700 [font-family:var(--font-jetbrains)] text-[13px]">
                      {loc.products}
                    </p>
                    <p className="text-stone-400">Products</p>
                  </div>
                  <div>
                    <p className="font-bold text-stone-700 [font-family:var(--font-jetbrains)] text-[13px]">
                      {loc.units.toLocaleString()}
                    </p>
                    <p className="text-stone-400">Units</p>
                  </div>
                  {loc.low > 0 && (
                    <div>
                      <p className="font-bold text-amber-700 [font-family:var(--font-jetbrains)] text-[13px]">
                        {loc.low}
                      </p>
                      <p className="text-amber-500">Low</p>
                    </div>
                  )}
                  {loc.out > 0 && (
                    <div>
                      <p className="font-bold text-red-700 [font-family:var(--font-jetbrains)] text-[13px]">
                        {loc.out}
                      </p>
                      <p className="text-red-500">Out</p>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Record Movement Modal ── */}
      <AnimatePresence>
        {showMovModal && (
          <RecordMovementModal
            onClose={() => setShowMovModal(false)}
            onSaved={handleMovSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
