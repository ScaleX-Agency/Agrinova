"use client";
// src/components/StockTable.tsx
// Main stock overview table with filters and actions.

import { StockOverviewRow, StockFilter, StockStatus } from "../types/inventory";

const LOCATIONS = [
  { location_id: 1, code: "IGRN1", name: "Head Office" },
  { location_id: 2, code: "IGRN2", name: "Kuliyapitiya" },
  { location_id: 3, code: "IGRN3", name: "Nuwara Eliya" },
  { location_id: 4, code: "IGRN4", name: "Peradeniya" },
];

const STATUS_LABELS: Record<StockStatus, string> = {
  ok: "In Stock",
  low: "Low Stock",
  out: "Out of Stock",
};

interface Props {
  rows: StockOverviewRow[];
  filter: StockFilter;
  onFilterChange: (f: StockFilter) => void;
  onRecordMovement: (row: StockOverviewRow) => void;
  onNewStockEntry: () => void;
}

export default function StockTable({
  rows,
  filter,
  onFilterChange,
  onRecordMovement,
  onNewStockEntry,
}: Props) {
  const set = (k: keyof StockFilter, v: any) =>
    onFilterChange({ ...filter, [k]: v });

  return (
    <>
      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)" }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="form-input"
            style={{ paddingLeft: 34, minWidth: 220 }}
            placeholder="Search by name or code…"
            value={filter.search}
            onChange={(e) => set("search", e.target.value)}
          />
        </div>

        <select
          className="form-select"
          value={filter.location_id ?? ""}
          onChange={(e) => set("location_id", e.target.value ? +e.target.value : null)}
        >
          <option value="">All Locations</option>
          {LOCATIONS.map((l) => (
            <option key={l.location_id} value={l.location_id}>
              {l.code} — {l.name}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          value={filter.status}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="ok">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onNewStockEntry}>
            <PlusIcon /> New Stock Entry
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="table-toolbar">
          <span className="table-title">Stock Inventory</span>
          <span className="table-count">{rows.length} items</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Product</th>
              <th>Pack Size</th>
              <th>Category</th>
              <th>Location</th>
              <th className="r">Qty on Hand</th>
              <th className="r">Threshold</th>
              <th>Level</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10}>
                  <div className="empty-state">
                    <div className="empty-icon">
                      <BoxIcon />
                    </div>
                    <div className="empty-title">No products found</div>
                    <div className="empty-sub">Try adjusting your filters</div>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const pct = Math.min(
                100,
                Math.round((row.quantity_on_hand / (row.reorder_threshold * 3)) * 100)
              );
              return (
                <tr key={row.stock_id}>
                  <td className="mono">{row.product_code}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{row.product_name}</div>
                  </td>
                  <td>{row.pack_size}</td>
                  <td>
                    <span className="badge issue">{row.category_name}</span>
                  </td>
                  <td>
                    <span className="badge issue">{row.location_code}</span>
                    <span style={{ marginLeft: 6, fontSize: 12, color: "var(--text2)" }}>
                      {row.location_name}
                    </span>
                  </td>
                  <td className="r">
                    <span style={{ fontWeight: 600, fontSize: 15, fontFamily: "'Playfair Display',serif" }}>
                      {row.quantity_on_hand}
                    </span>
                  </td>
                  <td className="r" style={{ color: "var(--text2)" }}>
                    {row.reorder_threshold}
                  </td>
                  <td>
                    <div className="stock-bar">
                      <div className={`stock-bar-fill ${row.status}`} style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${row.status}`}>
                      <span className="badge-dot" />
                      {STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Record Movement"
                        onClick={() => onRecordMovement(row)}
                      >
                        <MoveIcon />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit">
                        <EditIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Inline micro-icons ────────────────────────────────────────
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const BoxIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
  </svg>
);
const MoveIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" />
    <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" />
  </svg>
);
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
