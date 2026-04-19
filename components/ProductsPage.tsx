"use client";
// src/components/ProductsPage.tsx

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Pagination from "rc-pagination";
import "rc-pagination/assets/index.css";
import {
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  AlertTriangle,
  Package,
  Layers,
  TrendingUp,
  Tag,
  ChevronDown,
} from "lucide-react";
import AddProductModal from "./AddProductModal";
import AddCategoryModal from "./AddCategoryModal";

// ── Types ─────────────────────────────────────────────────────

interface Product {
  product_id: number;
  product_code: string;
  product_name: string;
  pack_size: string;
  selling_price: number;
  category_id: number;
  category: { category_id: number; name: string; tag: string };
}

// ── Category badge colours ────────────────────────────────────

const CAT_STYLE: Record<string, string> = {
  Fertilizer: "bg-green-50  text-green-700  border-green-200",
  Fungicide: "bg-blue-50   text-blue-700   border-blue-200",
  Supplement: "bg-violet-50 text-violet-700 border-violet-200",
  Insecticide: "bg-orange-50 text-orange-700 border-orange-200",
  Herbicide: "bg-teal-50   text-teal-700   border-teal-200",
  Soil: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Nematicide: "bg-pink-50   text-pink-700   border-pink-200",
};

const defaultCat = "bg-stone-100 text-stone-600 border-stone-200";

// ── Sub-components ────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-start gap-3">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${accent}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-[22px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] leading-none">
          {value}
        </p>
        <p className="text-[11px] text-stone-400 uppercase tracking-wide mt-1 [font-family:var(--font-dmsans)]">
          {label}
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export default function ProductsPage({ initialProducts }: { initialProducts: { items: Product[], pagination: any, stats: any } | Product[] }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<number | "ALL">("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const isPaginated = !Array.isArray(initialProducts) && "items" in initialProducts;
  const initialItems = isPaginated ? (initialProducts as any).items : (initialProducts as Product[]);
  const initialTotal = isPaginated ? (initialProducts as any).pagination.total : initialItems.length;

  const [products, setProducts] = useState<Product[]>(initialItems);
  const [totalProducts, setTotalProducts] = useState(initialTotal);

  const [categories, setCategories] = useState<{id: number | "ALL", name: string}[]>([{ id: "ALL", name: "All" }]);

  const loadCategories = () => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.categories) {
          setCategories([
            { id: "ALL", name: "All" },
            ...data.categories.map((c: any) => ({
              id: c.category_id,
              name: c.name,
            })),
          ]);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const initialStats = isPaginated ? (initialProducts as any).stats : { avgPrice: 0, maxPrice: 0 };
  const [globalStats, setGlobalStats] = useState(initialStats);

  useEffect(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    if (search) sp.set("search", search);
    if (catFilter !== "ALL") sp.set("category_id", String(catFilter));
    
    fetch(`/api/products?${sp.toString()}`)
      .then(res => res.json())
      .then(data => {
         if (data.products) setProducts(data.products);
         if (data.pagination) setTotalProducts(data.pagination.total);
         if (data.stats) setGlobalStats(data.stats);
      })
      .catch(console.error);
  }, [page, pageSize, search, catFilter]);

  const filtered = products;

  // Stats
  const avgPrice = globalStats.avgPrice ? Math.round(globalStats.avgPrice) : 0;
  const maxPrice = globalStats.maxPrice ? Math.round(globalStats.maxPrice) : 0;
  const uniqueCats = categories.length > 1 ? categories.length - 1 : 0;

  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/products/${deleteTarget.product_id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete product");
      }

      setProducts((prev) =>
        prev.filter((p) => p.product_id !== deleteTarget.product_id),
      );
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Cannot delete — this product has existing stock. Remove all stock entries first.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Package size={16} className="text-green-700" />}
          value={String(totalProducts)}
          label="Total Products"
          accent="bg-green-50 border-green-100"
        />
        <StatCard
          icon={<Layers size={16} className="text-blue-700" />}
          value={String(uniqueCats)}
          label="Categories"
          accent="bg-blue-50 border-blue-100"
        />
        <StatCard
          icon={<TrendingUp size={16} className="text-violet-700" />}
          value={`Rs. ${avgPrice.toLocaleString()}`}
          label="Avg. Price"
          accent="bg-violet-50 border-violet-100"
        />
        <StatCard
          icon={<Tag size={16} className="text-amber-700" />}
          value={`Rs. ${maxPrice.toLocaleString()}`}
          label="Highest Price"
          accent="bg-amber-50 border-amber-100"
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Search */}
        <div className="relative w-[240px]">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
          />
          <input
            className="w-full pl-9 pr-3 py-2 text-[13px] border border-stone-200 rounded-xl bg-white text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 transition-all [font-family:var(--font-dmsans)]"
            placeholder="Search by name or code…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => { setCatFilter(c.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all [font-family:var(--font-dmsans)] whitespace-nowrap ${
                catFilter === c.id
                  ? "bg-green-700 text-white border-green-700"
                  : "bg-white text-stone-500 border-stone-200 hover:border-green-300 hover:text-green-700"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-stone-600 border border-stone-200 rounded-xl bg-white hover:bg-stone-50 transition-colors [font-family:var(--font-dmsans)]"
          >
            <Plus size={12} /> New Category
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-white bg-green-700 border border-transparent rounded-xl hover:bg-green-800 transition-colors [font-family:var(--font-dmsans)]"
          >
            <Plus size={12} /> New Product
          </button>
          
        <button
          onClick={() => {
            import("@/lib/exportCsv").then(({ exportToCsv }) => {
              const headers = [
                "Product Code",
                "Product Name",
                "Pack Size",
                "Category",
                "Selling Price (LKR)",
              ];
              const exportRows = filtered.map((p) => [
                p.product_code,
                p.product_name,
                p.pack_size,
                p.category.name,
                String(p.selling_price),
              ]);
              exportToCsv(
                `agrinova-products-${new Date().toISOString().split("T")[0]}.csv`,
                headers,
                exportRows,
              );
              if (typeof window !== "undefined") {
                const event = new CustomEvent("toast", {
                  detail: {
                    msg: `Exported ${exportRows.length} products to CSV`,
                    type: "success",
                  },
                });
                window.dispatchEvent(event);
              }
            });
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-stone-500 border border-stone-200 rounded-xl bg-white hover:bg-stone-50 transition-colors [font-family:var(--font-dmsans)]"
        >
          <Download size={12} /> Export
        </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
            Product Catalogue
          </span>
          <span className="text-[11px] text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full [font-family:var(--font-dmsans)]">
            {filtered.length} products
          </span>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-stone-100">
              {[
                "Code",
                "Product",
                "Category",
                "Pack Size",
                "Price (LKR)",
                "Actions",
              ].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-stone-400 bg-white [font-family:var(--font-dmsans)] ${
                    i === 4 ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <div className="text-3xl mb-3">📦</div>
                    <p className="text-[14px] font-medium text-stone-500 [font-family:var(--font-dmsans)]">
                      No products found
                    </p>
                    <p className="text-[12px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
                      Try a different search or category filter
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <motion.tr
                    key={p.product_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/60 transition-colors"
                  >
                    {/* Code */}
                    <td className="px-4 py-3">
                      <span className="[font-family:var(--font-jetbrains)] text-[11.5px] font-medium text-blue-700">
                        {p.product_code}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
                        {p.product_name}
                      </p>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border [font-family:var(--font-dmsans)] ${CAT_STYLE[p.category.name] ?? defaultCat}`}
                      >
                        {p.category.name}
                      </span>
                    </td>

                    {/* Pack size */}
                    <td className="px-4 py-3 text-[12.5px] text-stone-500 [font-family:var(--font-dmsans)]">
                      {p.pack_size}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-right">
                      <p className="text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">
                        LKR
                      </p>
                      <p className="text-[14px] font-semibold text-stone-800 [font-family:var(--font-jetbrains)] leading-none">
                        {p.selling_price.toLocaleString("en-LK", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          title="Edit product"
                          onClick={() => setEditTarget(p)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          title="Delete product"
                          onClick={() => setDeleteTarget(p)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 hover:bg-red-50 hover:border-red-200 text-stone-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {totalProducts > pageSize && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-stone-100 bg-stone-50">
            <span className="text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalProducts)} of {totalProducts} entries
            </span>
            <Pagination
              current={page}
              total={totalProducts}
              pageSize={pageSize}
              onChange={(p) => setPage(p)}
              className="text-[12px] [font-family:var(--font-dmsans)]"
            />
          </div>
        )}
      </div>

      {/* ── Add Product Modal ── */}
      <AnimatePresence>
        {showAdd && (
          <AddProductModal
            mode="add"
            onClose={() => setShowAdd(false)}
            onSaved={() => {
              setShowAdd(false);
              window.location.reload();
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Add Category Modal ── */}
      <AnimatePresence>
        {showAddCategory && (
          <AddCategoryModal
            onClose={() => setShowAddCategory(false)}
            onSaved={() => {
              setShowAddCategory(false);
              loadCategories();
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Edit Product Modal ── */}
      <AnimatePresence>
        {editTarget && (
          <AddProductModal
            mode="edit"
            initialValues={{
              ...editTarget,
              product_id: editTarget.product_id,
              category_id: editTarget.category_id,
            }}
            onClose={() => setEditTarget(null)}
            onSaved={() => {
              setEditTarget(null);
              window.location.reload();
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4"
            onClick={(e) =>
              e.target === e.currentTarget && setDeleteTarget(null)
            }
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.18 }}
              className="bg-white border border-stone-200 rounded-2xl shadow-xl w-full max-w-[400px] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
                  <AlertTriangle size={15} className="text-red-600" />
                </div>
                <p className="text-[15px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
                  Delete Product
                </p>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-3">
                <p className="text-[13.5px] text-stone-600 leading-relaxed [font-family:var(--font-dmsans)]">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-stone-800">
                    {deleteTarget.product_name}
                  </span>
                  ? This action cannot be undone.
                </p>
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-3">
                  <AlertTriangle
                    size={13}
                    className="text-amber-600 mt-0.5 shrink-0"
                  />
                  <p className="text-[12px] text-amber-800 [font-family:var(--font-dmsans)] leading-snug">
                    Products with existing stock entries cannot be deleted.
                    Remove all stock first.
                  </p>
                </div>

                {deleteError && (
                  <div className="bg-[#2a0d0d] border border-[#4a1a1a] text-[#f87171] rounded-lg p-3 text-[12px]">
                    {deleteError}
                  </div>
                )}

                {/* Product code pill */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">
                    Deleting:
                  </span>
                  <span className="[font-family:var(--font-jetbrains)] text-[12px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                    {deleteTarget.product_code}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-stone-50 border-t border-stone-100">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-[13px] font-medium text-[#8b91a8] border border-stone-200 rounded-xl hover:bg-[#242840] transition-colors [font-family:var(--font-dmsans)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-[#f87171] bg-[#2a0d0d] border border-[#4a1a1a] hover:bg-[#3a1010] disabled:opacity-60 rounded-xl transition-colors [font-family:var(--font-dmsans)]"
                >
                  {deleting ? (
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
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} /> Delete Product
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
