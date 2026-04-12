// app/(dashboard)/inventory/movements/page.tsx
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Plus,
  Download,
  Search,
  Clock,
  X,
  ChevronDown,
  ArrowLeftRight,
} from "lucide-react";

type MovementType = "ISSUE" | "RETURN" | "PURCHASE" | "ADJUSTMENT";
type FilterType = MovementType | "ALL";

interface MovementRow {
  movement_id: number;
  movement_date: string;
  movement_type: MovementType;
  product_name: string;
  product_code: string;
  location_code: string;
  qty_delta: number;
  notes: string | null;
  created_by_name: string;
}

const MOCK: MovementRow[] = [
  {
    movement_id: 1,
    movement_date: "2026-04-12T08:30:00Z",
    movement_type: "PURCHASE",
    product_name: "AgriGold Fertilizer",
    product_code: "FERT-0001",
    location_code: "IGRN1",
    qty_delta: +48,
    notes: "Restock from supplier",
    created_by_name: "Admin",
  },
  {
    movement_id: 2,
    movement_date: "2026-04-11T14:10:00Z",
    movement_type: "ISSUE",
    product_name: "BioShield Fungicide",
    product_code: "FUNG-0001",
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
    product_code: "INSC-0001",
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
    product_code: "SOIL-0001",
    location_code: "IGRN4",
    qty_delta: -3,
    notes: "Damaged units removed",
    created_by_name: "Admin",
  },
  {
    movement_id: 5,
    movement_date: "2026-04-10T07:30:00Z",
    movement_type: "ISSUE",
    product_name: "NutriSpray Foliar",
    product_code: "SUPP-0002",
    location_code: "IGRN2",
    qty_delta: -20,
    notes: "Sales order #1040",
    created_by_name: "Kamal P.",
  },
  {
    movement_id: 6,
    movement_date: "2026-04-09T13:00:00Z",
    movement_type: "PURCHASE",
    product_name: "CropSafe Nematicide",
    product_code: "NEMA-0001",
    location_code: "IGRN1",
    qty_delta: +30,
    notes: "Monthly restock",
    created_by_name: "Admin",
  },
  {
    movement_id: 7,
    movement_date: "2026-04-09T10:20:00Z",
    movement_type: "ISSUE",
    product_name: "GreenMax Herbicide",
    product_code: "HERB-0001",
    location_code: "IGRN3",
    qty_delta: -8,
    notes: "Sales order #1038",
    created_by_name: "Nimal S.",
  },
  {
    movement_id: 8,
    movement_date: "2026-04-08T16:00:00Z",
    movement_type: "RETURN",
    product_name: "AgriGold Fertilizer",
    product_code: "FERT-0001",
    location_code: "IGRN1",
    qty_delta: +10,
    notes: "Excess returned",
    created_by_name: "Admin",
  },
];

const TYPE_BADGE: Record<MovementType, string> = {
  ISSUE: "bg-blue-50   text-blue-800",
  RETURN: "bg-teal-50   text-teal-700",
  PURCHASE: "bg-green-50  text-green-700",
  ADJUSTMENT: "bg-amber-50  text-amber-800",
};
const TYPE_LABELS: Record<FilterType, string> = {
  ALL: "All",
  ISSUE: "Issue",
  RETURN: "Return",
  PURCHASE: "Purchase",
  ADJUSTMENT: "Adjustment",
};
const TYPES: FilterType[] = [
  "ALL",
  "ISSUE",
  "RETURN",
  "PURCHASE",
  "ADJUSTMENT",
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MovementsPage() {
  const [movements, setMovements] = useState<MovementRow[]>(MOCK);
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      movements.filter((m) => {
        const matchType =
          typeFilter === "ALL" || m.movement_type === typeFilter;
        const q = search.toLowerCase();
        const matchSearch =
          !search ||
          m.product_name.toLowerCase().includes(q) ||
          m.product_code.toLowerCase().includes(q);
        return matchType && matchSearch;
      }),
    [movements, typeFilter, search],
  );

  const stats = useMemo(
    () => ({
      total: movements.length,
      issues: movements.filter((m) => m.movement_type === "ISSUE").length,
      purchases: movements.filter((m) => m.movement_type === "PURCHASE").length,
      returns: movements.filter((m) => m.movement_type === "RETURN").length,
    }),
    [movements],
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)] mb-1">
            Inventory
          </p>
          <h1 className="text-[26px] font-semibold text-stone-900 [font-family:var(--font-playfair)] leading-tight">
            Movements Log
          </h1>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            Full history of stock issues, returns, purchases and adjustments
          </p>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Records",
            value: stats.total,
            accent: "bg-stone-50 border-stone-200",
            text: "text-stone-700",
          },
          {
            label: "Issues",
            value: stats.issues,
            accent: "bg-blue-50 border-blue-100",
            text: "text-blue-800",
          },
          {
            label: "Purchases",
            value: stats.purchases,
            accent: "bg-green-50 border-green-100",
            text: "text-green-700",
          },
          {
            label: "Returns",
            value: stats.returns,
            accent: "bg-teal-50 border-teal-100",
            text: "text-teal-700",
          },
        ].map((s) => (
          <div key={s.label} className={`border rounded-2xl p-4 ${s.accent}`}>
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">
              {s.label}
            </p>
            <p
              className={`text-[28px] font-semibold [font-family:var(--font-playfair)] leading-none mt-1 ${s.text}`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative w-[220px]">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
          />
          <input
            className="w-full pl-9 pr-3 py-2 text-[13px] border border-stone-200 rounded-xl bg-white placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 transition-all [font-family:var(--font-dmsans)]"
            placeholder="Search product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex border border-stone-200 rounded-xl overflow-hidden bg-white">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 text-[12px] font-medium border-r border-stone-200 last:border-r-0 transition-colors [font-family:var(--font-dmsans)] ${
                typeFilter === t
                  ? "bg-green-700 text-white"
                  : "text-stone-500 hover:bg-stone-50"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-stone-400 [font-family:var(--font-dmsans)]">
          {filtered.length} records
        </span>
        <button className="ml-auto flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-stone-500 border border-stone-200 rounded-xl bg-white hover:bg-stone-50 [font-family:var(--font-dmsans)]">
          <Download size={12} /> Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-stone-400" />
            <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
              All Movements
            </span>
          </div>
          <span className="text-[11px] text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full [font-family:var(--font-dmsans)]">
            {filtered.length} records
          </span>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-stone-100">
              {[
                "Date",
                "Type",
                "Product",
                "Location",
                "Qty",
                "Notes",
                "By",
              ].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-stone-400 bg-white [font-family:var(--font-dmsans)] ${i === 4 ? "text-right" : "text-left"}`}
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
                  <p className="text-[14px] font-medium text-stone-400 [font-family:var(--font-dmsans)]">
                    No movements found
                  </p>
                  <p className="text-[12px] text-stone-300 mt-1 [font-family:var(--font-dmsans)]">
                    Try a different filter
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((m) => {
                const isNeg = m.qty_delta < 0;
                return (
                  <tr
                    key={m.movement_id}
                    className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/60 transition-colors"
                  >
                    <td className="px-4 py-3 text-[12px] text-stone-400 whitespace-nowrap [font-family:var(--font-dmsans)]">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {fmtDate(m.movement_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium [font-family:var(--font-dmsans)] ${TYPE_BADGE[m.movement_type]}`}
                      >
                        {TYPE_LABELS[m.movement_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                        {m.product_name}
                      </p>
                      <p className="text-[11px] text-stone-400 [font-family:var(--font-jetbrains)]">
                        {m.product_code}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="[font-family:var(--font-jetbrains)] text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                        {m.location_code}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-right [font-family:var(--font-jetbrains)] text-[14px] font-bold"
                      style={{ color: isNeg ? "#991b1b" : "#166534" }}
                    >
                      {isNeg ? `−${Math.abs(m.qty_delta)}` : `+${m.qty_delta}`}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-stone-400 max-w-[160px] truncate [font-family:var(--font-dmsans)]">
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
      </div>
    </div>
  );
}
