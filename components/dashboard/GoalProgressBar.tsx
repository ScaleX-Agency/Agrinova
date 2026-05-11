"use client";
// components/dashboard/GoalProgressBar.tsx
// Phase 1 — Monthly Sales Goal Progress
// No API needed — target is stored in localStorage (user-editable).
// Shows current period sales vs a configurable monthly target.
//
// Usage in dashboard/page.tsx (Sales tab):
//   import GoalProgressBar from "@/components/dashboard/GoalProgressBar";
//   <GoalProgressBar currentSales={salesData?.kpis.totalSales} loading={salesLoading} />

import { useState, useEffect } from "react";
import { Target, Pencil, Check, X } from "lucide-react";
import { formatLKR } from "@/lib/formatters";

const STORAGE_KEY = "agrinova_sales_target";
const DEFAULT_TARGET = 1_000_000;

interface Props {
  currentSales?: number;
  loading?: boolean;
  /** Label shown on card e.g. "This Month" */
  periodLabel?: string;
}

export default function GoalProgressBar({
  currentSales = 0,
  loading = false,
  periodLabel = "This Month",
}: Props) {
  const [target, setTarget] = useState<number>(DEFAULT_TARGET);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const n = Number(stored);
      if (!isNaN(n) && n > 0) setTarget(n);
    }
  }, []);

  const pct = target > 0 ? Math.min(100, Math.round((currentSales / target) * 100)) : 0;
  const remaining = Math.max(0, target - currentSales);

  const barColor =
    pct >= 100 ? "bg-green-500"
    : pct >= 75 ? "bg-blue-500"
    : pct >= 40 ? "bg-amber-400"
    :             "bg-red-400";

  const statusLabel =
    pct >= 100 ? "Target reached! 🎉"
    : pct >= 75 ? "Almost there"
    : pct >= 40 ? "In progress"
    :             "Behind target";

  const statusCls =
    pct >= 100 ? "bg-green-50 text-green-700"
    : pct >= 75 ? "bg-blue-50 text-blue-700"
    : pct >= 40 ? "bg-amber-50 text-amber-700"
    :             "bg-red-50 text-red-700";

  const handleSave = () => {
    const n = Number(inputVal.replace(/,/g, ""));
    if (!isNaN(n) && n > 0) {
      setTarget(n);
      localStorage.setItem(STORAGE_KEY, String(n));
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setEditing(false);
  };

  if (!mounted) return null;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Target size={15} className="text-blue-700" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] leading-none">
              Sales Target
            </p>
            <p className="text-[11px] text-stone-400 [font-family:var(--font-dmsans)] mt-0.5">
              {periodLabel}
            </p>
          </div>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full [font-family:var(--font-dmsans)] ${statusCls}`}>
          {statusLabel}
        </span>
      </div>

      {/* Progress bar */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-stone-100 rounded-full" />
          <div className="flex justify-between">
            <div className="h-2 w-16 bg-stone-100 rounded" />
            <div className="h-2 w-16 bg-stone-100 rounded" />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1.5 [font-family:var(--font-dmsans)]">
            <span className="font-semibold text-stone-700">{formatLKR(currentSales)}</span>
            <span className="font-semibold text-stone-400">{pct}%</span>
          </div>
          <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">
            <span>
              {pct < 100
                ? <>{formatLKR(remaining)} remaining</>
                : <>Exceeded by {formatLKR(currentSales - target)}</>
              }
            </span>
            {/* Target editor */}
            {editing ? (
              <span className="flex items-center gap-1">
                <span className="text-stone-400">Target:</span>
                <input
                  autoFocus
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-24 px-2 py-0.5 text-[11px] border border-stone-200 rounded-lg [font-family:var(--font-jetbrains)] text-stone-700 focus:outline-none focus:border-green-500"
                  placeholder="e.g. 500000"
                />
                <button onClick={handleSave} className="text-green-600 hover:text-green-700">
                  <Check size={12} />
                </button>
                <button onClick={() => setEditing(false)} className="text-stone-400 hover:text-stone-600">
                  <X size={12} />
                </button>
              </span>
            ) : (
              <button
                onClick={() => { setInputVal(String(target)); setEditing(true); }}
                className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-600 transition-colors [font-family:var(--font-dmsans)]"
              >
                <Pencil size={10} /> Target: {formatLKR(target)}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
