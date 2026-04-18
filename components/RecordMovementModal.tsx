"use client";
// src/components/RecordMovementModal.tsx
// Modal for recording ISSUE / RETURN / ADJUSTMENT on a stock row.

import { useState } from "react";
import { StockOverviewRow, MovementRow, MovementType } from "../types/inventory";

interface Props {
  row: StockOverviewRow;
  onClose: () => void;
  onSaved: (updatedRow: StockOverviewRow, newMovement: MovementRow) => void;
}

const MOVEMENT_TYPES: { value: MovementType; label: string }[] = [
  { value: "ISSUE", label: "Issue" },
  { value: "RETURN", label: "Return" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

export default function RecordMovementModal({ row, onClose, onSaved }: Props) {
  const [movementType, setMovementType] = useState<MovementType>("ISSUE");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const qty = parseInt(quantity) || 0;
  const delta =
    movementType === "ISSUE" ? -qty
    : movementType === "RETURN" ? qty
    : qty; // ADJUSTMENT — can be signed in notes
  const resultingQty = row.quantity_on_hand + delta;

  const validate = () => {
    if (!qty || qty <= 0) return "Enter a valid quantity";
    if (movementType === "ISSUE" && qty > row.quantity_on_hand)
      return `Insufficient stock. Available: ${row.quantity_on_hand}`;
    return "";
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError("");

    try {
      // ── Real API call ──
      // const res = await fetch(`/api/inventory/${row.location_id}/movements`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     stock_id: row.stock_id,
      //     product_id: row.product_id,
      //     movement_type: movementType,
      //     quantity: qty,
      //     notes,
      //   }),
      // });
      // if (!res.ok) { const d = await res.json(); throw new Error(d.error); }

      // ── Mock (remove when connecting to API) ──
      await new Promise((r) => setTimeout(r, 500));

      const updatedRow: StockOverviewRow = {
        ...row,
        quantity_on_hand: resultingQty,
        status:
          resultingQty === 0 ? "out"
          : resultingQty < row.reorder_threshold ? "low"
          : "ok",
      };

      const newMovement: MovementRow = {
        movement_id: Date.now(),
        stock_id: row.stock_id,
        product_id: row.product_id,
        created_by: 1,
        movement_type: movementType,
        quantity: qty,
        movement_date: new Date().toISOString().split("T")[0],
        notes,
        product_name: row.product_name,
        location_code: row.location_code,
        created_by_name: "Admin",
        qty_delta: delta,
      };

      onSaved(updatedRow, newMovement);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Record Stock Movement</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Product summary */}
          <div style={{ background: "var(--surface2)", borderRadius: "var(--r-md)", padding: "12px 16px", marginBottom: 20, display: "flex", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 1 }}>Product</div>
              <div style={{ fontWeight: 500, marginTop: 3 }}>{row.product_name}</div>
              <div style={{ fontSize: 11, color: "var(--text2)", fontFamily: "monospace" }}>{row.product_code}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 1 }}>Location</div>
              <span className="badge issue" style={{ marginTop: 6, display: "inline-flex" }}>{row.location_code}</span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 1 }}>Current Stock</div>
              <div style={{ fontWeight: 600, fontSize: 18, fontFamily: "'Playfair Display',serif", marginTop: 2 }}>{row.quantity_on_hand}</div>
            </div>
          </div>

          {/* Movement type */}
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Movement Type <span style={{ color: "var(--danger)" }}>*</span></label>
            <div className="toggle-group">
              {MOVEMENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  className={`toggle-btn ${movementType === t.value ? "active" : ""}`}
                  style={{ flex: 1 }}
                  onClick={() => setMovementType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {movementType === "RETURN" && (
              <span className="form-hint" style={{ color: "var(--warn)", marginTop: 6, display: "block" }}>
                ⚠ Returns require manager / admin approval before processing.
              </span>
            )}
          </div>

          {/* Qty + preview */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Quantity <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                className="form-input"
                type="number"
                min="1"
                placeholder="0"
                value={quantity}
                onChange={(e) => { setQuantity(e.target.value); setError(""); }}
              />
            </div>
            <div className="form-group" style={{ justifyContent: "flex-end" }}>
              <div style={{ background: "var(--surface2)", borderRadius: "var(--r-md)", padding: "10px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--text2)" }}>Resulting stock</div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    fontFamily: "'Playfair Display',serif",
                    color:
                      resultingQty < 0 ? "var(--danger)"
                      : resultingQty < row.reorder_threshold ? "var(--warn)"
                      : "var(--success)",
                  }}
                >
                  {qty > 0 ? resultingQty : "—"}
                </div>
              </div>
            </div>

            <div className="form-group span2">
              <label className="form-label">Notes / Reference</label>
              <textarea
                className="form-textarea"
                placeholder="e.g. Invoice number, reason for return, approval reference…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ minHeight: 72 }}
              />
            </div>
          </div>

          {error && (
            <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: "var(--r-md)", padding: "10px 14px", fontSize: 13, marginTop: 12 }}>
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Record Movement"}
          </button>
        </div>
      </div>
    </div>
  );
}
