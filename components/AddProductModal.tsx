"use client";
// src/components/AddProductModal.tsx

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Info, ChevronDown } from "lucide-react";
import { CreateProductDto } from "../types/inventory";
import { useCategories, useLocations } from "@/hooks/useInventory";

interface FormState {
  product_name: string;
  pack_size: string;
  category_id: string;
  selling_price: string;
  reorder_threshold: string;
  location_id: string;
  initial_qty: string;
}

interface Props {
  mode?: "add" | "edit";
  initialValues?: Partial<CreateProductDto & { product_code: string; product_id: number; reorder_threshold: number }>;
  onClose: () => void;
  onSaved: () => void;
}

// ── Shared field components ───────────────────────────────────

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 [font-family:var(--font-dmsans)]">
        {label}
      </label>
      {required && (
        <span className="text-[10.5px] font-medium text-red-500 [font-family:var(--font-dmsans)]">
          Required
        </span>
      )}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-[11px] text-red-500 mt-1 [font-family:var(--font-dmsans)]"
        >
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
      {children}
    </p>
  );
}

const inputCls = (hasError?: boolean) =>
  `w-full px-3 py-2 text-[13px] [font-family:var(--font-dmsans)] rounded-[9px] border bg-white text-stone-800 placeholder:text-stone-300 outline-none transition-all focus:ring-2
  ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-50"
      : "border-stone-200 focus:border-green-500 focus:ring-green-50"
  }`;

const selectCls = (hasError?: boolean) =>
  `w-full px-3 py-2 text-[13px] [font-family:var(--font-dmsans)] rounded-[9px] border bg-white text-stone-700 outline-none appearance-none transition-all focus:ring-2
  ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-50"
      : "border-stone-200 focus:border-green-500 focus:ring-green-50"
  }`;

// ── Main modal ────────────────────────────────────────────────

export default function AddProductModal({
  mode = "add",
  initialValues,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>({
    product_name: initialValues?.product_name || "",
    pack_size: initialValues?.pack_size || "",
    category_id: initialValues?.category_id?.toString() || "",
    selling_price: initialValues?.selling_price?.toString() || "",
    reorder_threshold: initialValues?.reorder_threshold?.toString() || "50",
    location_id: "1",
    initial_qty: "0",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();

  // Preview the auto-generated product code
  const categoryTag = categories.find(
    (c) => String(c.category_id) === form.category_id,
  )?.tag;
  const previewCode = categoryTag ? `${categoryTag}-XXXX` : null;

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => {
      const next = { ...e };
      delete next[k];
      return next;
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.product_name.trim()) e.product_name = "Product name is required";
    if (!form.pack_size.trim()) e.pack_size = "Pack size is required";
    if (!form.category_id) e.category_id = "Please select a category";
    if (!form.selling_price || parseFloat(form.selling_price) <= 0)
      e.selling_price = "Enter a valid price";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<CreateProductDto> = {
        product_name: form.product_name,
        pack_size: form.pack_size,
        category_id: parseInt(form.category_id),
        selling_price: parseFloat(form.selling_price),
      };

      if (form.reorder_threshold) {
        payload.reorder_threshold = parseInt(form.reorder_threshold);
      }

      if (mode === "add") {
        if (form.initial_qty && parseInt(form.initial_qty) > 0) {
          payload.initial_qty = parseInt(form.initial_qty);
          if (form.location_id) {
            payload.location_id = parseInt(form.location_id);
          }
        }
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else if (mode === "edit" && initialValues?.product_id) {
        const res = await fetch(`/api/products/${initialValues.product_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setErrors({
        _global: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 min-h-[600px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-[#181c27] border border-[#2a2f45] rounded-2xl w-full max-w-[560px] overflow-hidden flex flex-col"
      >
        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-[#2a2f45] flex items-center justify-between shrink-0">
          <p className="text-[16px] font-semibold text-[#e8eaf0] [font-family:var(--font-dmsans)] leading-none">
            {mode === "edit" ? "Edit Product" : "Add New Product"}
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#242840] hover:bg-[#2a2f45] text-stone-400 transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 flex-1 overflow-y-auto space-y-4">
          {/* Section: Product details */}
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-stone-400 pb-2 border-b border-stone-100 [font-family:var(--font-dmsans)]">
            Product details
          </p>

          {mode === "edit" && initialValues?.product_code && (
            <div className="mb-2">
              <FieldLabel label="Product Code" />
              <p className="text-[13px] text-stone-600 [font-family:var(--font-jetbrains)] bg-stone-50 px-3 py-2 rounded-lg border border-stone-200">
                {initialValues.product_code}
              </p>
            </div>
          )}

          {/* Product name — full width */}
          <div>
            <FieldLabel label="Product Name" required />
            <input
              className={inputCls(!!errors.product_name)}
              placeholder="e.g. Glyphosate 480SL"
              value={form.product_name}
              onChange={(e) => set("product_name", e.target.value)}
            />
            <FieldError msg={errors.product_name} />
          </div>

          {/* Category + Pack size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel label="Category" required />
              <div className="relative">
                <select
                  className={selectCls(!!errors.category_id)}
                  value={form.category_id}
                  onChange={(e) => set("category_id", e.target.value)}
                >
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                />
              </div>
              {previewCode && (
                <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="text-[10.5px] text-blue-500 [font-family:var(--font-dmsans)]">
                    Code →
                  </span>
                  <span className="text-[12px] font-medium text-blue-700 [font-family:var(--font-jetbrains)]">
                    {previewCode}
                  </span>
                </div>
              )}
              <FieldError msg={errors.category_id} />
            </div>

            <div>
              <FieldLabel label="Pack Size" required />
              <input
                className={inputCls(!!errors.pack_size)}
                placeholder="e.g. 25 kg, 500 ml"
                value={form.pack_size}
                onChange={(e) => set("pack_size", e.target.value)}
              />
              <FieldHint>Shown as unit label in stock table</FieldHint>
              <FieldError msg={errors.pack_size} />
            </div>
          </div>

          {/* Price + Threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel label="Selling Price (LKR)" required />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-stone-400 [font-family:var(--font-jetbrains)] pointer-events-none">
                  Rs.
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls(!!errors.selling_price) + " pl-9"}
                  placeholder="0.00"
                  value={form.selling_price}
                  onChange={(e) => set("selling_price", e.target.value)}
                />
              </div>
              <FieldError msg={errors.selling_price} />
            </div>

            <div>
              <FieldLabel label="Reorder Threshold" />
              <input
                type="number"
                min="0"
                className={inputCls()}
                value={form.reorder_threshold}
                onChange={(e) => set("reorder_threshold", e.target.value)}
              />
              <FieldHint>Low-stock alert triggers below this</FieldHint>
            </div>
          </div>

          {/* Section: Initial stock */}
          {mode === "add" && (
            <>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-stone-400 pb-2 border-b border-stone-100 [font-family:var(--font-dmsans)] pt-1">
                Initial stock{" "}
                <span className="normal-case font-normal text-stone-300">
                  (optional)
                </span>
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel label="Location" />
                  <div className="relative">
                    <select
                      className={selectCls()}
                      value={form.location_id}
                      onChange={(e) => set("location_id", e.target.value)}
                    >
                      {locations.map((l) => (
                        <option key={l.location_id} value={l.location_id}>
                          {l.code} — {l.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel label="Initial Qty" />
                  <input
                    type="number"
                    min="0"
                    className={inputCls()}
                    value={form.initial_qty}
                    onChange={(e) => set("initial_qty", e.target.value)}
                  />
                  <FieldHint>Leave 0 to add stock via Stock Entry</FieldHint>
                </div>
              </div>
            </>
          )}

          {/* Global error */}
          <AnimatePresence>
            {errors._global && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-3.5 py-3"
              >
                <Info size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-[12.5px] text-red-600 [font-family:var(--font-dmsans)]">
                  {errors._global}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-[#2a2f45] flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-[#8b91a8] hover:bg-[#242840] hover:text-[#e8eaf0] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors"
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Saving…
              </>
            ) : mode === "edit" ? (
              "Save Changes"
            ) : (
              "Add Product"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
