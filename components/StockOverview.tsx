"use client";

import { useState, useMemo } from "react";
import {
  Package,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Plus,
  Upload,
  RefreshCw,
  Pencil,
  ArrowLeftRight,
  Download,
  Search,
} from "lucide-react";
import LocationCards from "./LocationCards";
import StockTable from "./StockTable";
import MovementsLog from "./MovementsLog";
import RecordMovementModal from "./RecordMovementModal";
import NewStockEntryModal from "./NewStockEntryModal";
import ImportStockModal from "./ImportStockModal";
import {
  StockOverviewRow,
  LocationSummary,
  MovementRow,
  StockFilter,
} from "@/types/inventory";

interface StockOverviewProps {
  initialStock?: StockOverviewRow[];
  initialSummaries?: LocationSummary[];
  initialMovements?: MovementRow[];
}

import { useSearchParams } from "next/navigation";

export default function StockOverview({
  initialStock = [],
  initialSummaries = [],
  initialMovements = [],
}: StockOverviewProps) {
  const searchParams = useSearchParams();
  const defaultTab =
    searchParams.get("tab") === "movements" ? "movements" : "overview";

  const [stock, setStock] = useState<StockOverviewRow[]>(initialStock);
  const [summaries] = useState<LocationSummary[]>(initialSummaries);
  const [movements, setMovements] = useState<MovementRow[]>(initialMovements);
  const [activeTab, setActiveTab] = useState<"overview" | "movements">(
    defaultTab,
  );

  const [filter, setFilter] = useState<StockFilter>({
    location_id: null,
    search: "",
    status: "all",
  });

  const [movementTarget, setMovementTarget] = useState<StockOverviewRow | null>(
    null,
  );
  const [showNewStock, setShowNewStock] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const filteredStock = useMemo(
    () =>
      stock.filter((row) => {
        const matchLoc =
          filter.location_id == null || row.location_id === filter.location_id;
        const matchSearch =
          !filter.search ||
          row.product_name
            .toLowerCase()
            .includes(filter.search.toLowerCase()) ||
          row.product_code.toLowerCase().includes(filter.search.toLowerCase());
        const matchStatus =
          filter.status === "all" || row.status === filter.status;
        return matchLoc && matchSearch && matchStatus;
      }),
    [stock, filter],
  );

  const stats = useMemo(
    () => ({
      totalProducts: stock.length,
      totalUnits: stock.reduce((a, b) => a + b.quantity_on_hand, 0),
      lowCount: stock.filter((r) => r.status === "low").length,
      outCount: stock.filter((r) => r.status === "out").length,
    }),
    [stock],
  );

  const handleMovementSaved = (
    updated: StockOverviewRow,
    newMov: MovementRow,
  ) => {
    setStock((prev) =>
      prev.map((r) => (r.stock_id === updated.stock_id ? updated : r)),
    );
    setMovements((prev) => [newMov, ...prev]);
  };

  const handleStockEntrySaved = (
    updatedRows: StockOverviewRow[],
    newMovements: MovementRow[],
  ) => {
    setStock((prev) => {
      const next = [...prev];
      for (const row of updatedRows) {
        const idx = next.findIndex((r) => r.stock_id === row.stock_id);
        if (idx >= 0) next[idx] = row;
        else next.push(row);
      }
      return next;
    });
    setMovements((prev) => [...newMovements, ...prev]);
  };

  return (
    <div className="space-y-5">
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Total Products"
          value={stats.totalProducts}
          delta="across 4 locations"
          deltaVariant="neutral"
          icon={<Package size={18} className="text-green-700" />}
          iconBg="bg-green-50"
        />
        <StatCard
          label="Total Units"
          value={stats.totalUnits.toLocaleString()}
          delta="+155 this week"
          deltaVariant="up"
          icon={<TrendingUp size={18} className="text-blue-800" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Low Stock"
          value={stats.lowCount}
          delta={`${stats.lowCount} below threshold`}
          deltaVariant={stats.lowCount > 0 ? "warn" : "up"}
          icon={<AlertTriangle size={18} className="text-amber-800" />}
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Out of Stock"
          value={stats.outCount}
          delta={`${stats.outCount} need restocking`}
          deltaVariant={stats.outCount > 0 ? "danger" : "up"}
          icon={<XCircle size={18} className="text-red-800" />}
          iconBg="bg-red-50"
        />
      </div>

      {/* ── Location Cards ── */}
      <LocationCards
        summaries={summaries}
        selectedId={filter.location_id}
        onSelect={(id) =>
          setFilter((f) => ({
            ...f,
            location_id: f.location_id === id ? null : id,
          }))
        }
      />

      {/* ── Tabs + Actions ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5 bg-stone-100 rounded-lg p-1 w-fit">
          {(["overview", "movements"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === t
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {t === "overview" ? "Stock Overview" : "Movements Log"}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
            >
              <Upload size={13} /> Import Stock
            </button>
            <button
              onClick={() => setShowNewStock(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors"
            >
              <Plus size={13} /> New Stock Entry
            </button>
          </div>
        )}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "overview" && (
        <StockTable
          rows={filteredStock}
          filter={filter}
          onFilterChange={setFilter}
          onRecordMovement={setMovementTarget}
          onNewStockEntry={() => setShowNewStock(true)}
        />
      )}

      {activeTab === "movements" && <MovementsLog movements={movements} />}

      {/* ── Modals ── */}
      {movementTarget && (
        <RecordMovementModal
          row={movementTarget}
          onClose={() => setMovementTarget(null)}
          onSaved={handleMovementSaved}
        />
      )}

      {showNewStock && (
        <NewStockEntryModal
          onClose={() => setShowNewStock(false)}
          onSaved={handleStockEntrySaved}
        />
      )}

      {showImport && (
        <ImportStockModal
          onClose={() => setShowImport(false)}
          onSaved={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

// ── StatCard ─────────────────────────────────────────────────
type DeltaVariant = "up" | "warn" | "danger" | "neutral";

const deltaStyles: Record<DeltaVariant, string> = {
  up: "bg-green-50 text-green-700",
  warn: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
  neutral: "bg-stone-100 text-stone-500",
};

function StatCard({
  label,
  value,
  delta,
  deltaVariant,
  icon,
  iconBg,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaVariant?: DeltaVariant;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 flex gap-3 items-start">
      <div
        className={`${iconBg} w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 mb-1">
          {label}
        </p>
        <p className="text-2xl font-semibold text-stone-800 leading-none mb-1.5">
          {value}
        </p>
        {delta && deltaVariant && (
          <span
            className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${deltaStyles[deltaVariant]}`}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
