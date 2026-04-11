"use client";
// src/components/MovementsLog.tsx
// Stock movements log with type filter and color-coded rows.

import { useState, useMemo } from "react";
import { MovementRow, MovementType } from "../types/inventory";

interface Props {
  movements: MovementRow[];
}

const TYPE_LABELS: Record<MovementType | "ALL", string> = {
  ALL: "All",
  ISSUE: "Issue",
  RETURN: "Return",
  PURCHASE: "Purchase",
  ADJUSTMENT: "Adjustment",
};

const TYPES = ["ALL", "ISSUE", "RETURN", "PURCHASE", "ADJUSTMENT"] as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function MovementsLog({ movements }: Props) {
  const [typeFilter, setTypeFilter] = useState<"ALL" | MovementType>("ALL");

  const filtered = useMemo(() =>
    typeFilter === "ALL"
      ? movements
      : movements.filter((m) => m.movement_type === typeFilter),
    [movements, typeFilter]
  );

  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="toggle-group">
          {TYPES.map((t) => (
            <button
              key={t}
              className={`toggle-btn ${typeFilter === t ? "active" : ""}`}
              onClick={() => setTypeFilter(t)}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text2)" }}>
          {filtered.length} records
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Product</th>
              <th>Location</th>
              <th className="r">Qty Change</th>
              <th>Reference / Notes</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-title">No movements found</div>
                    <div className="empty-sub">Try a different filter</div>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((m) => {
              const isNeg = m.qty_delta < 0;
              const display = isNeg ? `−${Math.abs(m.qty_delta)}` : `+${Math.abs(m.qty_delta)}`;
              const typeClass = m.movement_type.toLowerCase();
              return (
                <tr key={m.movement_id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDate(m.movement_date)}</td>
                  <td>
                    <span className={`badge ${typeClass}`}>
                      {TYPE_LABELS[m.movement_type]}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{m.product_name}</td>
                  <td>
                    <span className="badge issue">{m.location_code}</span>
                  </td>
                  <td className="r">
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        fontFamily: "'Playfair Display',serif",
                        color: isNeg ? "var(--danger)" : "var(--success)",
                      }}
                    >
                      {display}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text2)", maxWidth: 200 }}>
                    {m.notes ?? "—"}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text2)" }}>
                    {m.created_by_name}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
