"use client";
// src/components/AddProductModal.tsx
// Modal to create a new product and optionally set initial stock.

import { useState } from "react";
import { CreateProductDto } from "../types/inventory";

const MOCK_CATEGORIES = [
  { category_id: 1, name: "Fertilizer",  tag: "FERT" },
  { category_id: 2, name: "Fungicide",   tag: "FUNG" },
  { category_id: 3, name: "Herbicide",   tag: "HERB" },
  { category_id: 4, name: "Insecticide", tag: "INSC" },
  { category_id: 5, name: "Nematicide",  tag: "NEMA" },
  { category_id: 6, name: "Supplement",  tag: "SUPP" },
  { category_id: 7, name: "Soil",        tag: "SOIL" },
];

const MOCK_LOCATIONS = [
  { location_id: 1, code: "IGRN1", name: "Head Office" },
  { location_id: 2, code: "IGRN2", name: "Kuliyapitiya" },
  { location_id: 3, code: "IGRN3", name: "Nuwara Eliya" },
  { location_id: 4, code: "IGRN4", name: "Peradeniya" },
];

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function AddProductModal({ onClose, onSaved }: Props) {
  const [form, setForm] = useState<{
    product_name: string;
    pack_size: string;
    category_id: string;
    selling_price: string;
    location_id: string;
    initial_qty: string;
  }>({
    product_name: "",
    pack_size: "",
    category_id: "",
    selling_price: "",
    location_id: "1",
    initial_qty: "0",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.product_name.trim()) e.product_name = "Required";
    if (!form.pack_size.trim()) e.pack_size = "Required";
    if (!form.category_id) e.category_id = "Required";
    if (!form.selling_price || parseFloat(form.selling_price) <= 0) e.selling_price = "Enter a valid price";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);

    try {
      // ── Real API call ──
      // const res = await fetch("/api/products", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     product_name: form.product_name,
      //     pack_size: form.pack_size,
      //     category_id: parseInt(form.category_id),
      //     selling_price: parseFloat(form.selling_price),
      //   } as CreateProductDto),
      // });
      // if (!res.ok) throw new Error((await res.json()).error);
      //
      // If initial_qty > 0, create stock entry:
      // await fetch("/api/stock", { method: "POST", ... });

      await new Promise((r) => setTimeout(r, 600));
      onSaved();
      onClose();
    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      setErrors({ _global: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Add New Product</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group span2">
              <label className="form-label">Product Name <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                className="form-input"
                placeholder="e.g. AgriGold Fertilizer"
                value={form.product_name}
                onChange={(e) => set("product_name", e.target.value)}
              />
              {errors.product_name && <span style={{ fontSize: 11, color: "var(--danger)" }}>{errors.product_name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Pack Size <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                className="form-input"
                placeholder="e.g. 25kg, 500ml, 1L"
                value={form.pack_size}
                onChange={(e) => set("pack_size", e.target.value)}
              />
              {errors.pack_size && <span style={{ fontSize: 11, color: "var(--danger)" }}>{errors.pack_size}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Selling Price (LKR) <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.selling_price}
                onChange={(e) => set("selling_price", e.target.value)}
              />
              {errors.selling_price && <span style={{ fontSize: 11, color: "var(--danger)" }}>{errors.selling_price}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Category <span style={{ color: "var(--danger)" }}>*</span></label>
              <select className="form-select" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">Select category…</option>
                {MOCK_CATEGORIES.map((c) => (
                  <option key={c.category_id} value={c.category_id}>{c.name}</option>
                ))}
              </select>
              {errors.category_id && <span style={{ fontSize: 11, color: "var(--danger)" }}>{errors.category_id}</span>}
              <span className="form-hint">Product code will be auto-generated (e.g. FERT-0009)</span>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Location</label>
              <select className="form-select" value={form.location_id} onChange={(e) => set("location_id", e.target.value)}>
                {MOCK_LOCATIONS.map((l) => (
                  <option key={l.location_id} value={l.location_id}>{l.code} — {l.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Stock Count</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.initial_qty}
                onChange={(e) => set("initial_qty", e.target.value)}
              />
              <span className="form-hint">Leave as 0 and add stock via New Stock Entry</span>
            </div>
          </div>

          {errors._global && (
            <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: "var(--r-md)", padding: "10px 14px", fontSize: 13, marginTop: 12 }}>
              {errors._global}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
