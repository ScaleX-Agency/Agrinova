"use client";
// src/components/LocationStockPage.tsx

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Search,
  ArrowLeftRight,
  Pencil,
  Download,
  Plus,
  ChevronDown,
  X,
  Info,
  CheckCircle2,
  Clock,
} from "lucide-react";

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
}

interface MovementRow {
  movement_id: number;
  movement_date: string;
  movement_type: MovementType;
  product_name: string;
  qty_delta: number;
  notes: string | null;
  created_by_name: string;
}

interface Props {
  locationId: number;
  locationCode: string;
  locationName: string;
  initialStock?: { stock: StockRow[], pagination: any };
  initialMovements?: { items: MovementRow[], pagination: any };
}

// ── Style maps ────────────────────────────────────────────────

const STATUS_CFG: Record<
  StockStatus,
  { label: string; dot: string; badge: string }
> = {
  ok: {
    label: "In Stock",
    dot: "bg-green-500",
    badge: "bg-green-50 text-green-700 border-green-200",
  },
  low: {
    label: "Low Stock",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
  },
  out: {
    label: "Out of Stock",
    dot: "bg-red-500",
    badge: "bg-red-50   text-red-700   border-red-200",
  },
};

const BAR_COLOR: Record<StockStatus, string> = {
  ok: "bg-green-500",
  low: "bg-amber-500",
  out: "bg-red-400",
};

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

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Record Movement Modal ─────────────────────────────────────

interface RecordMovementModalProps {
  row: StockRow;
  onClose: () => void;
  onSaved: (updated: StockRow, newMov: MovementRow) => void;
}

const MOV_TYPES: MovementType[] = ["ISSUE", "RETURN", "PURCHASE", "ADJUSTMENT"];

function RecordMovementModal({
  row,
  onClose,
  onSaved,
}: RecordMovementModalProps) {
  const [type, setType] = useState<MovementType>("ISSUE");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const qtyNum = parseInt(qty) || 0;
  const isNeg = type === "ISSUE" || type === "ADJUSTMENT";
  const projected = isNeg
    ? row.quantity_on_hand - qtyNum
    : row.quantity_on_hand + qtyNum;
  const projStatus: StockStatus =
    projected <= 0 ? "out" : projected < row.reorder_threshold ? "low" : "ok";

  const handleSave = async () => {
    if (!qty || qtyNum <= 0) {
      setError("Enter a valid quantity");
      return;
    }
    if (isNeg && qtyNum > row.quantity_on_hand) {
      setError("Cannot issue more than current stock");
      return;
    }
    setSaving(true);
    // Real: POST /api/stock-movements
    await new Promise((r) => setTimeout(r, 600));
    const delta = isNeg ? -qtyNum : +qtyNum;
    const updated: StockRow = {
      ...row,
      quantity_on_hand: row.quantity_on_hand + delta,
      status: projStatus,
    };
    const newMov: MovementRow = {
      movement_id: Date.now(),
      movement_date: new Date().toISOString(),
      movement_type: type,
      product_name: row.product_name,
      qty_delta: delta,
      notes: notes || null,
      created_by_name: "Admin",
    };
    onSaved(updated, newMov);
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
        className="bg-white border border-stone-200 rounded-2xl shadow-xl w-full max-w-[440px] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <ArrowLeftRight size={14} className="text-blue-700" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-stone-900 [font-family:var(--font-playfair)] leading-none">
                Record Movement
              </p>
              <p className="text-[11.5px] text-stone-400 mt-0.5 [font-family:var(--font-dmsans)] truncate max-w-[220px]">
                {row.product_name}
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
          {/* Current stock pill */}
          <div className="flex items-center justify-between bg-stone-50 border border-stone-100 rounded-xl px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">
                Current stock
              </p>
              <p className="text-[22px] font-semibold text-stone-800 [font-family:var(--font-playfair)] leading-none mt-0.5">
                {row.quantity_on_hand}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border [font-family:var(--font-dmsans)] ${STATUS_CFG[row.status].badge}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[row.status].dot}`}
              />
              {STATUS_CFG[row.status].label}
            </span>
          </div>

          {/* Movement type */}
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 mb-2 [font-family:var(--font-dmsans)]">
              Movement Type
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {MOV_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-2 rounded-xl text-[12px] font-medium border transition-all [font-family:var(--font-dmsans)] ${
                    type === t
                      ? "bg-blue-700 text-white border-blue-700"
                      : "bg-white text-stone-600 border-stone-200 hover:border-blue-300"
                  }`}
                >
                  {MOV_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Qty */}
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
              className="w-full px-3 py-2.5 text-[14px] [font-family:var(--font-jetbrains)] border border-stone-200 rounded-xl bg-white text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all"
            />
            {error && (
              <p className="text-[11px] text-red-500 mt-1 [font-family:var(--font-dmsans)]">
                {error}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 mb-1.5 [font-family:var(--font-dmsans)]">
              Notes{" "}
              <span className="normal-case font-normal text-stone-300">
                (optional)
              </span>
            </p>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sales order #1042"
              className="w-full px-3 py-2 text-[13px] [font-family:var(--font-dmsans)] border border-stone-200 rounded-xl bg-white text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all resize-none"
            />
          </div>

          {/* Projected result */}
          {qtyNum > 0 && (
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
                  After this movement
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
              <span
                className={`text-[12px] font-semibold [font-family:var(--font-dmsans)] ${
                  isNeg ? "text-red-600" : "text-green-600"
                }`}
              >
                {isNeg ? `−${qtyNum}` : `+${qtyNum}`}
              </span>
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
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-xl transition-colors [font-family:var(--font-dmsans)]"
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
              "Save Movement"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────

import Pagination from "rc-pagination";
import "rc-pagination/assets/index.css";

export default function LocationStockPage({
  locationId,
  locationCode,
  locationName,
  initialStock = { items: [], pagination: { total: 0 } } as any,
  initialMovements = { items: [], pagination: { total: 0 } },
}: Props) {
  const isPaginated = !Array.isArray(initialStock) && ("items" in initialStock || "stock" in initialStock);
  const initStockItems = isPaginated ? ((initialStock as any).items || (initialStock as any).stock) : (initialStock as any);
  const initStockTotal = isPaginated ? initialStock.pagination?.total : initStockItems?.length;

  const [stock, setStock] = useState<StockRow[]>(initStockItems || []);
  const [stockPage, setStockPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(20);
  const [stockTotal, setStockTotal] = useState(initStockTotal || 0);

  const [movements, setMovements] = useState<MovementRow[]>(initialMovements.items);
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsPageSize, setMovementsPageSize] = useState(20);
  const [movementsTotal, setMovementsTotal] = useState(initialMovements.pagination?.total || 0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "ok" | "low" | "out"
  >("all");
  const [activeTab, setActiveTab] = useState<"stock" | "movements">("stock");

  // Fetch stock when page changes
  useEffect(() => {
    if (activeTab === "stock") {
      const sp = new URLSearchParams();
      sp.set("page", String(stockPage));
      sp.set("pageSize", String(stockPageSize));
      if (search) sp.set("search", search);
      if (statusFilter !== "all") sp.set("status", statusFilter);

      fetch(`/api/inventory/${locationId}?${sp.toString()}`)
        .then(res => res.json())
        .then(data => {
          if (data.stock) {
            setStock(data.stock);
            if (data.pagination) setStockTotal(data.pagination.total);
          }
        })
        .catch(console.error);
    }
  }, [locationId, activeTab, stockPage, stockPageSize, search, statusFilter]);

  // Fetch movements when page changes
  useEffect(() => {
    if (activeTab === "movements") {
      fetch(`/api/inventory/${locationId}/movements?page=${movementsPage}&pageSize=${movementsPageSize}`)
        .then(res => res.json())
        .then(data => {
          if (data.items) {
            setMovements(data.items);
            if (data.pagination) setMovementsTotal(data.pagination.total);
          }
        })
        .catch(console.error);
    }
  }, [locationId, activeTab, movementsPage, movementsPageSize]);

  const [movTarget, setMovTarget] = useState<StockRow | null>(null);

  const filtered = stock; // Filtering is handled server-side now via the useEffect

  const stats = useMemo(
    () => ({
      totalProducts: stockTotal,
      totalUnits: stock.reduce((a, b) => a + b.quantity_on_hand, 0), // Approximation for current page
      low: stock.filter((r) => r.status === "low").length,
      out: stock.filter((r) => r.status === "out").length,
    }),
    [stock, stockTotal],
  );

  const handleMovSaved = (updated: StockRow, newMov: MovementRow) => {
    setStock((prev) =>
      prev.map((r) => (r.stock_id === updated.stock_id ? updated : r)),
    );
    setMovements((prev) => [newMov, ...prev]);
  };

  return (
    <div className="space-y-5">
      {/* ── Back + Header ── */}
      <div>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-stone-400 hover:text-stone-700 transition-colors mb-3 [font-family:var(--font-dmsans)]"
        >
          <ArrowLeft size={13} /> Back to Stock Overview
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="[font-family:var(--font-jetbrains)] text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                {locationCode}
              </span>
              <span className="text-[11px] text-stone-300">·</span>
              <span className="text-[11.5px] text-stone-400 [font-family:var(--font-dmsans)]">
                Location Detail
              </span>
            </div>
            <h1 className="text-[26px] font-semibold text-stone-900 [font-family:var(--font-playfair)] leading-tight">
              {locationName}
            </h1>
            <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
              Stock levels and movement history for this location
            </p>
          </div>
          <button
            onClick={() => stock.length && setMovTarget(stock[0])}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-[13px] font-semibold rounded-xl transition-colors [font-family:var(--font-dmsans)]"
          >
            <ArrowLeftRight size={14} /> Record Movement
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Products",
            value: stats.totalProducts,
            icon: <Package size={16} className="text-green-700" />,
            accent: "bg-green-50 border-green-100",
          },
          {
            label: "Total Units",
            value: stats.totalUnits.toLocaleString(),
            icon: <TrendingUp size={16} className="text-blue-700" />,
            accent: "bg-blue-50 border-blue-100",
          },
          {
            label: "Low Stock",
            value: stats.low,
            icon: <AlertTriangle size={16} className="text-amber-700" />,
            accent: "bg-amber-50 border-amber-100",
          },
          {
            label: "Out of Stock",
            value: stats.out,
            icon: <XCircle size={16} className="text-red-600" />,
            accent: "bg-red-50 border-red-100",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-stone-200 rounded-2xl p-4 flex items-start gap-3 hover:shadow-sm transition-shadow"
          >
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${s.accent}`}
            >
              {s.icon}
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">
                {s.label}
              </p>
              <p className="text-[24px] font-semibold text-stone-800 [font-family:var(--font-playfair)] leading-none mt-0.5">
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5 bg-stone-100 rounded-lg p-1 w-fit">
          {(["stock", "movements"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-all [font-family:var(--font-dmsans)] ${
                activeTab === t
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {t === "stock" ? "Stock" : "Movements Log"}
            </button>
          ))}
        </div>

        {activeTab === "stock" && (
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-stone-500 border border-stone-200 rounded-xl bg-white hover:bg-stone-50 transition-colors [font-family:var(--font-dmsans)]">
            <Download size={12} /> Export
          </button>
        )}
      </div>

      {/* ── Stock Tab ── */}
      {activeTab === "stock" && (
        <>
          {/* Filter bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative w-[220px]">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
              />
              <input
                className="w-full pl-9 pr-3 py-2 text-[13px] border border-stone-200 rounded-xl bg-white placeholder:text-stone-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all [font-family:var(--font-dmsans)]"
                placeholder="Search product…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setMovementsPage(1); setStockPage(1); }}
              />
            </div>
            {(["all", "ok", "low", "out"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all [font-family:var(--font-dmsans)] ${
                  statusFilter === s
                    ? "bg-blue-700 text-white border-blue-700"
                    : "bg-white text-stone-500 border-stone-200 hover:border-blue-300"
                }`}
              >
                {s === "all"
                  ? "All"
                  : s === "ok"
                    ? "In Stock"
                    : s === "low"
                      ? "Low"
                      : "Out"}
              </button>
            ))}
          </div>

          {/* Stock table */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
              <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
                Inventory
              </span>
              <span className="text-[11px] text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full [font-family:var(--font-dmsans)]">
                {filtered.length} items
              </span>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-stone-100">
                  {[
                    "Code",
                    "Product",
                    "Qty on Hand",
                    "Threshold",
                    "Level",
                    "Status",
                    "",
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={`px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-stone-400 bg-white [font-family:var(--font-dmsans)] ${i >= 2 && i <= 5 ? "text-right" : "text-left"} ${i === 6 ? "text-left" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="text-3xl mb-2">📦</div>
                      <p className="text-[14px] font-medium text-stone-500 [font-family:var(--font-dmsans)]">
                        No products found
                      </p>
                      <p className="text-[12px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
                        Adjust filters to see results
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const cfg = STATUS_CFG[row.status];
                    const pct = Math.min(
                      100,
                      Math.round(
                        (row.quantity_on_hand / (row.reorder_threshold * 3)) *
                          100,
                      ),
                    );
                    return (
                      <tr
                        key={row.stock_id}
                        className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/60 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="[font-family:var(--font-jetbrains)] text-[11.5px] font-medium text-blue-700">
                            {row.product_code}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
                            {row.product_name}
                          </p>
                          <p className="text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">
                            {row.category_name} · {row.pack_size}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right [font-family:var(--font-jetbrains)] text-[15px] font-bold text-stone-800">
                          {row.quantity_on_hand}
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] text-stone-400 [font-family:var(--font-dmsans)]">
                          {row.reorder_threshold}
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-[64px] h-1.5 bg-stone-100 rounded-full overflow-hidden ml-auto">
                            <div
                              className={`h-full rounded-full ${BAR_COLOR[row.status]}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border [font-family:var(--font-dmsans)] ${cfg.badge}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                            />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            title="Record movement"
                            onClick={() => setMovTarget(row)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors [font-family:var(--font-dmsans)]"
                          >
                            <ArrowLeftRight size={11} /> Move
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {stockTotal > stockPageSize && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-stone-100 bg-stone-50">
                <span className="text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">
                  Showing {(stockPage - 1) * stockPageSize + 1} to {Math.min(stockPage * stockPageSize, stockTotal)} of {stockTotal} entries
                </span>
                <Pagination
                  current={stockPage}
                  total={stockTotal}
                  pageSize={stockPageSize}
                  onChange={(p) => setStockPage(p)}
                  className="text-[12px] [font-family:var(--font-dmsans)]"
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Movements Tab ── */}
      {activeTab === "movements" && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
            <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
              Movements Log
            </span>
            <span className="text-[11px] text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full [font-family:var(--font-dmsans)]">
              {movements.length} records
            </span>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-stone-100">
                {["Date", "Type", "Product", "Qty Change", "Notes", "By"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-stone-400 bg-white [font-family:var(--font-dmsans)] ${i === 3 ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="text-[14px] font-medium text-stone-400 [font-family:var(--font-dmsans)]">
                      No movements recorded
                    </p>
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isNeg = m.qty_delta < 0;
                  return (
                    <tr
                      key={m.movement_id}
                      className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 text-[12px] text-stone-400 whitespace-nowrap [font-family:var(--font-dmsans)]">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {fmtDate(m.movement_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium [font-family:var(--font-dmsans)] ${MOV_BADGE[m.movement_type]}`}
                        >
                          {MOV_LABELS[m.movement_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                        {m.product_name}
                      </td>
                      <td
                        className="px-4 py-3 text-right [font-family:var(--font-jetbrains)] text-[14px] font-bold"
                        style={{ color: isNeg ? "#991b1b" : "#166534" }}
                      >
                        {isNeg
                          ? `−${Math.abs(m.qty_delta)}`
                          : `+${m.qty_delta}`}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-stone-400 max-w-[180px] truncate [font-family:var(--font-dmsans)]">
                        {m.notes ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">
                        {m.created_by_name}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          {movementsTotal > movementsPageSize && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-stone-100 bg-stone-50">
              <span className="text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">
                Showing {(movementsPage - 1) * movementsPageSize + 1} to {Math.min(movementsPage * movementsPageSize, movementsTotal)} of {movementsTotal} entries
              </span>
              <Pagination
                current={movementsPage}
                total={movementsTotal}
                pageSize={movementsPageSize}
                onChange={(p) => setMovementsPage(p)}
                className="text-[12px] [font-family:var(--font-dmsans)]"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Record Movement Modal ── */}
      <AnimatePresence>
        {movTarget && (
          <RecordMovementModal
            row={movTarget}
            onClose={() => setMovTarget(null)}
            onSaved={handleMovSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
