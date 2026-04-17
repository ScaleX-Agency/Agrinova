"use client";
// src/components/NewStockEntryModal.tsx
// Modal for recording a new stock entry — Local Purchase or Foreign Import.
// Supports multiple product rows in one entry.

import { useState, useEffect } from "react";
import { StockOverviewRow, MovementRow } from "../types/inventory";

// In real app: import from API or pass as prop
const MOCK_LOCATIONS = [
  { location_id: 1, code: "IGRN1", name: "Head Office" },
  { location_id: 2, code: "IGRN2", name: "Kuliyapitiya" },
  { location_id: 3, code: "IGRN3", name: "Nuwara Eliya" },
  { location_id: 4, code: "IGRN4", name: "Peradeniya" },
];

interface LineItem {
  id: number;
  product_id: string;
  quantity: string;
  unit_price: string;
}

interface Product {
  product_id: number;
  product_code: string;
  product_name: string;
  pack_size: string;
}

interface Props {
  onClose: () => void;
  onSaved: (updatedRows: StockOverviewRow[], newMovements: MovementRow[]) => void;
}

let lineCounter = 0;

export default function NewStockEntryModal({ onClose, onSaved }: Props) {
  const [entryType, setEntryType] = useState<"LOCAL_PURCHASE" | "FOREIGN_IMPORT">("LOCAL_PURCHASE");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [referenceNo, setReferenceNo] = useState("");
  const [locationId, setLocationId] = useState(1);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ id: ++lineCounter, product_id: "", quantity: "", unit_price: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // In real app: fetch from /api/products
  const [products] = useState<Product[]>([
    { product_id: 1, product_code: "FERT-0001", product_name: "AgriGold Fertilizer",  pack_size: "25kg"  },
    { product_id: 2, product_code: "FUNG-0001", product_name: "BioShield Fungicide",   pack_size: "500ml" },
    { product_id: 3, product_code: "SUPP-0001", product_name: "RootBoost Supplement",  pack_size: "1L"    },
    { product_id: 4, product_code: "INSC-0001", product_name: "PestOff Insecticide",   pack_size: "250ml" },
    { product_id: 5, product_code: "HERB-0001", product_name: "GreenMax Herbicide",    pack_size: "1L"    },
    { product_id: 6, product_code: "SOIL-0001", product_name: "SoilPro Conditioner",   pack_size: "10kg"  },
    { product_id: 7, product_code: "SUPP-0002", product_name: "NutriSpray Foliar",     pack_size: "500ml" },
    { product_id: 8, product_code: "NEMA-0001", product_name: "CropSafe Nematicide",   pack_size: "1L"    },
  ]);

  const addRow = () =>
    setItems((prev) => [...prev, { id: ++lineCounter, product_id: "", quantity: "", unit_price: "" }]);

  const removeRow = (id: number) =>
    setItems((prev) => prev.filter((r) => r.id !== id));

  const updateRow = (id: number, k: keyof Omit<LineItem, "id">, v: string) =>
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, [k]: v } : r)));

  const total = items.reduce(
    (a, b) => a + (parseFloat(b.quantity) || 0) * (parseFloat(b.unit_price) || 0),
    0
  );

  const handleSave = async () => {
    const validItems = items.filter((i) => i.product_id && parseFloat(i.quantity) > 0);
    if (!validItems.length) {
      setError("Add at least one product with a quantity greater than 0.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      // ── Real API call ──
      // const res = await fetch("/api/stock", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     entry_type: entryType,
      //     location_id: locationId,
      //     date,
      //     reference_no: referenceNo,
      //     notes,
      //     items: validItems.map((i) => ({
      //       product_id: parseInt(i.product_id),
      //       quantity: parseInt(i.quantity),
      //       unit_price: parseFloat(i.unit_price) || 0,
      //     })),
      //   }),
      // });
      // if (!res.ok) { const d = await res.json(); throw new Error(d.error); }

      // ── Mock ──
      await new Promise((r) => setTimeout(r, 700));

      // Build mock updated rows + movements for optimistic UI update
      const updatedRows: StockOverviewRow[] = [];
      const newMovements: MovementRow[] = [];

      for (const item of validItems) {
        const product = products.find((p) => p.product_id === parseInt(item.product_id))!;
        const location = MOCK_LOCATIONS.find((l) => l.location_id === locationId)!;
        const qty = parseInt(item.quantity);

        newMovements.push({
          movement_id: Date.now() + Math.random(),
          stock_id: -1,
          product_id: parseInt(item.product_id),
          created_by: 1,
          movement_type: "PURCHASE",
          quantity: qty,
          movement_date: date,
          notes: [
            entryType === "LOCAL_PURCHASE" ? "Local Purchase" : "Foreign Import",
            referenceNo,
          ].filter(Boolean).join(" — "),
          product_name: product.product_name,
          location_code: location.code,
          created_by_name: "Admin",
          qty_delta: qty,
        });
      }

      onSaved(updatedRows, newMovements);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <span className="modal-title">New Stock Entry</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Entry type */}
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Entry Type</label>
            <div className="toggle-group">
              <button
                className={`toggle-btn ${entryType === "LOCAL_PURCHASE" ? "active" : ""}`}
                style={{ flex: 1 }}
                onClick={() => setEntryType("LOCAL_PURCHASE")}
              >
                Local Purchase
              </button>
              <button
                className={`toggle-btn ${entryType === "FOREIGN_IMPORT" ? "active" : ""}`}
                style={{ flex: 1 }}
                onClick={() => setEntryType("FOREIGN_IMPORT")}
              >
                Foreign Import
              </button>
            </div>
          </div>

          {/* Header fields */}
          <div className="form-grid" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">Date <span style={{ color: "var(--danger)" }}>*</span></label>
              <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Reference No.</label>
              <input className="form-input" placeholder="e.g. PO-2026-042" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
            </div>
            <div className="form-group span2">
              <label className="form-label">Inventory Location <span style={{ color: "var(--danger)" }}>*</span></label>
              <select className="form-select" value={locationId} onChange={(e) => setLocationId(+e.target.value)}>
                {MOCK_LOCATIONS.map((l) => (
                  <option key={l.location_id} value={l.location_id}>{l.code} — {l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Products received table */}
          <label className="form-label" style={{ display: "block", marginBottom: 6 }}>
            Products Received <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: "45%" }}>Product</th>
                <th style={{ width: "20%" }}>Qty</th>
                <th style={{ width: "25%" }}>Unit Price (LKR)</th>
                <th style={{ width: "10%" }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <select
                      value={item.product_id}
                      onChange={(e) => updateRow(item.id, "product_id", e.target.value)}
                    >
                      <option value="">Select product…</option>
                      {products.map((p) => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.product_code} — {p.product_name} ({p.pack_size})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      placeholder="0"
                      value={item.quantity}
                      onChange={(e) => updateRow(item.id, "quantity", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={item.unit_price}
                      onChange={(e) => updateRow(item.id, "unit_price", e.target.value)}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {items.length > 1 && (
                      <button
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}
                        onClick={() => removeRow(item.id)}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 16 }}>
            <button className="btn btn-ghost btn-sm" onClick={addRow}>
              <PlusIcon /> Add Row
            </button>
            {total > 0 && (
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--navy)" }}>
                Total: LKR {total.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              placeholder="Supplier name, delivery notes, customs reference…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ minHeight: 60 }}
            />
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
            {saving ? "Saving…" : "Record Stock Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);
