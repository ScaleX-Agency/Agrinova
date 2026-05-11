"use client";
// src/components/RecordMovementModal.tsx
// Modal for recording ISSUE / RETURN / ADJUSTMENT on a stock row.

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  StockOverviewRow,
  MovementRow,
  MovementType,
} from "../types/inventory";

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
  const { user } = useUser();
  const [movementType, setMovementType] = useState<MovementType>("ISSUE");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const qty = parseInt(quantity) || 0;
  const resultingQty =
    movementType === "ISSUE"
      ? row.quantity_on_hand - qty
      : movementType === "RETURN"
        ? row.quantity_on_hand + qty
        : qty;
  // eslint-disable-next-line
  const delta = resultingQty - row.quantity_on_hand;

  const validate = () => {
    if (!Number.isFinite(qty) || qty < 0) return "Enter a valid quantity";
    if (movementType !== "ADJUSTMENT" && qty === 0)
      return "Enter a valid quantity";
    if (movementType === "ISSUE" && qty > row.quantity_on_hand)
      return `Insufficient stock. Available: ${row.quantity_on_hand}`;
    return "";
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/inventory/${row.location_id}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock_id: row.stock_id,
          movement_type: movementType,
          quantity: qty,
          resulting_quantity:
            movementType === "ADJUSTMENT" ? resultingQty : undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }

      const { updatedStock, movement_id } = await res.json();
      const resolvedDelta = updatedStock.quantity_on_hand - row.quantity_on_hand;

      const updatedRow: StockOverviewRow = {
        ...row,
        quantity_on_hand: updatedStock.quantity_on_hand,
        status:
          updatedStock.quantity_on_hand <= 0
            ? "out"
            : updatedStock.quantity_on_hand < row.reorder_threshold
              ? "low"
              : "ok",
      };

      const newMovement: MovementRow = {
        movement_id,
        movement_type: movementType,
         
        movement_date: new Date().toISOString().split("T")[0],
        notes: notes || null,
        product_name: row.product_name,
        product_code: row.product_code,
        location_code: row.location_code,
        created_by_name: user?.firstName || "Admin",
        movement_qty: qty,
        qty_delta: resolvedDelta,
      };

      onSaved(updatedRow, newMovement);
   
      onClose();
  // eslint-disable-next-line
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 min-h-[600px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-[560px] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
          <p className="text-[16px] font-semibold text-stone-900">
            Record Stock Movement
          </p>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 flex-1 overflow-y-auto">
          {/* Product summary */}
          <div
            className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex gap-6 mb-5"
          >
            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1">
                Product
              </div>
              <div className="text-stone-900 font-medium">
                {row.product_name}
              </div>
              <div className="text-[11px] text-stone-500 [font-family:var(--font-jetbrains)] mt-0.5">
                {row.product_code}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                Location
              </div>
              <span
                className="badge issue"
                style={{ marginTop: 6, display: "inline-flex" }}
              >
                {row.location_code}
              </span>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1">
                Current Stock
              </div>
              <div className="text-[20px] font-bold text-stone-900 [font-family:var(--font-dmsans)]">
                {row.quantity_on_hand}
              </div>
            </div>
          </div>

          {/* Movement type */}
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
              Movement Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 p-1 bg-stone-50 border border-stone-200 rounded-xl">
              {MOVEMENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    movementType === t.value
                      ? "bg-green-700 text-white border border-green-700"
                      : "bg-transparent text-stone-500 hover:text-stone-800"
                  }`}
                  onClick={() => setMovementType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {movementType === "RETURN" && (
              <span className="block text-[12px] text-amber-500/90 mt-2">
                ⚠ Returns require manager / chairman approval before processing.
              </span>
            )}
          </div>

          {/* Qty + preview */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                {movementType === "ADJUSTMENT" ? "Resulting Quantity" : "Quantity"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full bg-white border border-stone-200 text-stone-900 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50"
                type="number"
                min="0"
                placeholder="0"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setError("");
                }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                Resulting stock
              </label>
              <div className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-center h-[38px] flex items-center justify-center">
                <span
                  className={`text-[15px] font-bold ${
                    resultingQty < 0
                      ? "text-red-400"
                      : resultingQty < row.reorder_threshold
                        ? "text-amber-400"
                        : "text-green-400"
                  }`}
                >
                  {qty > 0 ? resultingQty : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
              Notes / Reference
            </label>
            <textarea
              className="w-full bg-white border border-stone-200 text-stone-900 placeholder:text-stone-500 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 min-h-[80px]"
              placeholder="e.g. Invoice number, reason for return, approval reference…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-lg p-3 text-[12px]">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-end gap-2 shrink-0">
          <button
            className="px-4 py-2 text-[13px] font-medium text-stone-500 hover:bg-stone-100 rounded-xl transition-colors [font-family:var(--font-dmsans)]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors [font-family:var(--font-dmsans)]"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Record Movement"}
          </button>
        </div>
      </div>
    </div>
  );
}
