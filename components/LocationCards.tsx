"use client";
// src/components/LocationCards.tsx
// Four clickable location summary cards (IGRN 1–4).

import { LocationSummary } from "../types/inventory";

interface Props {
  summaries: LocationSummary[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function LocationCards({ summaries, selectedId, onSelect }: Props) {
  return (
    <div className="loc-cards">
      {summaries.map((loc) => (
        <div
          key={loc.location_id}
          className={`loc-card ${selectedId === loc.location_id ? "selected" : ""}`}
          onClick={() => onSelect(loc.location_id)}
        >
          <div className="loc-card-code">{loc.code}</div>
          <div className="loc-card-name">{loc.name}</div>
          <div className="loc-card-stats">
            <div className="loc-stat">
              <strong>{loc.total_products}</strong> Products
            </div>
            <div className="loc-stat">
              <strong>{loc.total_units}</strong> Units
            </div>
            {loc.low_count > 0 && (
              <div className="loc-stat" style={{ color: "var(--warn)" }}>
                <strong>{loc.low_count}</strong> Low
              </div>
            )}
            {loc.out_count > 0 && (
              <div className="loc-stat" style={{ color: "var(--danger)" }}>
                <strong>{loc.out_count}</strong> Out
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
