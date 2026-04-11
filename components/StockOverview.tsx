"use client";
// src/components/StockOverview.tsx
// Main Inventory page — orchestrates all sub-components.
// In Next.js: used at app/(dashboard)/inventory/page.tsx

import { useState, useEffect, useMemo } from "react";
import LocationCards from "./LocationCards";
import StockTable from "./StockTable";
import MovementsLog from "./MovementsLog";
import RecordMovementModal from "./RecordMovementModal";
import NewStockEntryModal from "./NewStockEntryModal";
import { StockOverviewRow, LocationSummary, MovementRow, StockFilter } from "../types/inventory";

// ── In a real Next.js app, replace these fetches with your API calls ──
// import { getAllStock, getLocationSummaries, getAllMovements } from "../lib/inventoryService";

interface StockOverviewProps {
  /** Injected by the page — from server component or SWR/React Query */
  initialStock?: StockOverviewRow[];
  initialSummaries?: LocationSummary[];
  initialMovements?: MovementRow[];
}

export default function StockOverview({
  initialStock = [],
  initialSummaries = [],
  initialMovements = [],
}: StockOverviewProps) {
  const [stock, setStock] = useState<StockOverviewRow[]>(initialStock);
  const [summaries, setSummaries] = useState<LocationSummary[]>(initialSummaries);
  const [movements, setMovements] = useState<MovementRow[]>(initialMovements);
  const [activeTab, setActiveTab] = useState<"overview" | "movements">("overview");

  // Filter state
  const [filter, setFilter] = useState<StockFilter>({
    location_id: null,
    search: "",
    status: "all",
  });

  // Modal state
  const [movementTarget, setMovementTarget] = useState<StockOverviewRow | null>(null);
  const [showNewStock, setShowNewStock] = useState(false);

  // Derived filtered rows
  const filteredStock = useMemo(() => {
    return stock.filter((row) => {
      const matchLoc =
        filter.location_id == null || row.location_id === filter.location_id;
      const matchSearch =
        !filter.search ||
        row.product_name.toLowerCase().includes(filter.search.toLowerCase()) ||
        row.product_code.toLowerCase().includes(filter.search.toLowerCase());
      const matchStatus =
        filter.status === "all" || row.status === filter.status;
      return matchLoc && matchSearch && matchStatus;
    });
  }, [stock, filter]);

  // Summary stats for the top stat cards
  const stats = useMemo(() => ({
    totalProducts: stock.length,
    totalUnits: stock.reduce((a, b) => a + b.quantity_on_hand, 0),
    lowCount: stock.filter((r) => r.status === "low").length,
    outCount: stock.filter((r) => r.status === "out").length,
  }), [stock]);

  // Called after a movement is recorded — refreshes the affected stock row
  const handleMovementSaved = (
    updatedRow: StockOverviewRow,
    newMovement: MovementRow
  ) => {
    setStock((prev) =>
      prev.map((r) => (r.stock_id === updatedRow.stock_id ? updatedRow : r))
    );
    setMovements((prev) => [newMovement, ...prev]);
    // In real app: revalidate from server — router.refresh() or mutate()
  };

  // Called after a new stock entry (purchase/import)
  const handleStockEntrySaved = (
    updatedRows: StockOverviewRow[],
    newMovements: MovementRow[]
  ) => {
    setStock((prev) => {
      const updated = [...prev];
      for (const row of updatedRows) {
        const idx = updated.findIndex((r) => r.stock_id === row.stock_id);
        if (idx >= 0) updated[idx] = row;
        else updated.push(row);
      }
      return updated;
    });
    setMovements((prev) => [...newMovements, ...prev]);
  };

  return (
    <div>
      {/* ── Stat Cards ── */}
      <div className="stats-row">
        <StatCard label="Total Products" value={stats.totalProducts} sub="across 4 locations" />
        <StatCard label="Total Units" value={stats.totalUnits.toLocaleString()} sub="+155 this week" subClass="ok" />
        <StatCard label="Low Stock" value={stats.lowCount} sub="items below threshold" subClass={stats.lowCount > 0 ? "warn" : "ok"} />
        <StatCard label="Out of Stock" value={stats.outCount} sub="need restocking" subClass={stats.outCount > 0 ? "danger" : "ok"} />
      </div>

      {/* ── Location Cards ── */}
      <LocationCards
        summaries={summaries}
        selectedId={filter.location_id}
        onSelect={(id) =>
          setFilter((f) => ({ ...f, location_id: f.location_id === id ? null : id }))
        }
      />

      {/* ── Tabs ── */}
      <div className="tabs">
        {(["overview", "movements"] as const).map((t) => (
          <div
            key={t}
            className={`tab ${activeTab === t ? "active" : ""}`}
            onClick={() => setActiveTab(t)}
          >
            {t === "overview" ? "Stock Overview" : "Movements Log"}
          </div>
        ))}
      </div>

      {/* ── Tab content ── */}
      {activeTab === "overview" && (
        <StockTable
          rows={filteredStock}
          filter={filter}
          onFilterChange={setFilter}
          onRecordMovement={setMovementTarget}
          onNewStockEntry={() => setShowNewStock(true)}
        />
      )}

      {activeTab === "movements" && (
        <MovementsLog movements={movements} />
      )}

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
    </div>
  );
}

// ── Inline StatCard ───────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  subClass,
}: {
  label: string;
  value: string | number;
  sub?: string;
  subClass?: "ok" | "warn" | "danger";
}) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className={`stat-sub ${subClass ?? ""}`}>{sub}</span>}
    </div>
  );
}
