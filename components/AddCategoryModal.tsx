"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface Category {
  category_id: number;
  name: string;
  tag: string;
}

interface Props {
  onClose: () => void;
  onSaved: (category: Category) => void;
}

const inputCls = (hasError?: boolean) =>
  `w-full px-3 py-2 text-[13px] [font-family:var(--font-dmsans)] rounded-[9px] border bg-white text-stone-800 placeholder:text-stone-300 outline-none transition-all focus:ring-2 ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-50"
      : "border-stone-200 focus:border-green-500 focus:ring-green-50"
  }`;

const tagPattern = /^[A-Z0-9]{2,10}$/;

export default function AddCategoryModal({ onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; tag?: string; _global?: string }>({});

  const suggestedTag = useMemo(() => {
    const normalized = name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .trim();

    if (!normalized) return "";

    const words = normalized.split(/\s+/).filter(Boolean);
    const fromInitials = words.map((w) => w[0]).join("").slice(0, 4);

    if (fromInitials.length >= 2) {
      return fromInitials;
    }

    return normalized.replace(/\s+/g, "").slice(0, 4);
  }, [name]);

  const validate = () => {
    const next: typeof errors = {};

    if (!name.trim()) {
      next.name = "Category name is required";
    }

    if (!tag.trim()) {
      next.tag = "Category tag is required";
    } else if (!tagPattern.test(tag.trim().toUpperCase())) {
      next.tag = "Use 2-10 uppercase letters or numbers";
    }

    return next;
  };

  const handleSave = async () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tag: tag.trim().toUpperCase(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      await queryClient.invalidateQueries({ queryKey: ["categories"] });

      onSaved(data.category as Category);
      onClose();
    } catch (err) {
      setErrors({
        _global: err instanceof Error ? err.message : "Failed to create category",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-[480px] overflow-hidden flex flex-col"
      >
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <p className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-dmsans)] leading-none">
            Add New Category
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 [font-family:var(--font-dmsans)]">
              Category Name
            </label>
            <input
              className={inputCls(!!errors.name) + " mt-1.5"}
              placeholder="e.g. Plant Nutrition"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: undefined, _global: undefined }));
              }}
            />
            <AnimatePresence>
              {errors.name && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[11px] text-red-500 mt-1 [font-family:var(--font-dmsans)]"
                >
                  {errors.name}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-stone-500 [font-family:var(--font-dmsans)]">
              Category Tag
            </label>
            <input
              className={inputCls(!!errors.tag) + " mt-1.5 [font-family:var(--font-jetbrains)]"}
              placeholder="e.g. PN"
              value={tag}
              onChange={(e) => {
                const normalized = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                setTag(normalized);
                setErrors((prev) => ({ ...prev, tag: undefined, _global: undefined }));
              }}
            />
            <p className="text-[11px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
              2-10 uppercase letters or numbers. Used for product code prefixes.
            </p>
            {!tag && suggestedTag && (
              <button
                type="button"
                onClick={() => setTag(suggestedTag)}
                className="mt-2 inline-flex items-center px-2.5 py-1 text-[11px] rounded-full border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors [font-family:var(--font-dmsans)]"
              >
                Use suggested tag: {suggestedTag}
              </button>
            )}
            <AnimatePresence>
              {errors.tag && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[11px] text-red-500 mt-1 [font-family:var(--font-dmsans)]"
                >
                  {errors.tag}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

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

        <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-[13px] font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors"
          >
            {saving ? "Saving..." : "Create Category"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
