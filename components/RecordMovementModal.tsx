"use client";

// Modal for recording stock quantity adjustments on a stock row.

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { MovementRow, StockOverviewRow } from "../types/inventory";

interface Props {
  row: StockOverviewRow;
  onClose: () => void;
  onSaved: (updatedRow: StockOverviewRow, newMovement: MovementRow) => void;
}

export default function RecordMovementModal({ row, onClose, onSaved }: Props) {
  const { user } = useUser();
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resultingQty = Number.parseInt(quantity, 10);
  const hasQuantity = Number.isInteger(resultingQty);

  const validate = () => {
    if (!hasQuantity || resultingQty < 0) return "Enter a valid quantity";
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
          movement_type: "ADJUSTMENT",
          quantity: resultingQty,
          resulting_quantity: resultingQty,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
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
        movement_type: "ADJUSTMENT",
        movement_date: new Date().toISOString().split("T")[0],
        notes: notes || null,
        product_name: row.product_name,
        product_code: row.product_code,
        location_code: row.location_code,
        created_by_name: user?.firstName || "Admin",
        movement_qty: resultingQty,
        qty_delta: resolvedDelta,
      };

      onSaved(updatedRow, newMovement);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record adjustment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-[600px] items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-6 py-4">
          <p className="text-[16px] font-semibold text-stone-900">
            Record Stock Adjustment
          </p>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100"
            onClick={onClose}
          >
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-5 flex gap-6 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Product
              </div>
              <div className="font-medium text-stone-900">{row.product_name}</div>
              <div className="mt-0.5 text-[11px] text-stone-500 [font-family:var(--font-jetbrains)]">
                {row.product_code}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Location
              </div>
              <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                {row.location_code}
              </span>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Current Stock
              </div>
              <div className="text-[20px] font-bold text-stone-900 [font-family:var(--font-dmsans)]">
                {row.quantity_on_hand}
              </div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Resulting Quantity <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-50"
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
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Stock Change
              </label>
              <div className="flex h-[38px] items-center justify-center rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-center">
                <span
                  className={`text-[15px] font-bold ${
                    hasQuantity && resultingQty - row.quantity_on_hand < 0
                      ? "text-red-500"
                      : "text-green-600"
                  }`}
                >
                  {hasQuantity
                    ? `${resultingQty - row.quantity_on_hand >= 0 ? "+" : ""}${
                        resultingQty - row.quantity_on_hand
                      }`
                    : "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              Notes / Reference
            </label>
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-900 placeholder:text-stone-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-50"
              placeholder="e.g. Stock count correction, audit reference"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-[12px] text-red-600">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-stone-100 px-6 py-4">
          <button
            className="rounded-xl px-4 py-2 text-[13px] font-medium text-stone-500 transition-colors hover:bg-stone-100 [font-family:var(--font-dmsans)]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex items-center gap-1.5 rounded-xl bg-green-700 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-60 [font-family:var(--font-dmsans)]"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Record Adjustment"}
          </button>
        </div>
      </div>
    </div>
  );
}

