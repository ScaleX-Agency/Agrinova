"use client";
// src/components/ProductsPage.tsx
// Product catalogue page — list, search, add, edit, delete.

import { useState, useMemo } from "react";
import AddProductModal from "./AddProductModal";

interface Product {
  product_id: number;
  product_code: string;
  product_name: string;
  pack_size: string;
  selling_price: number;
  category: { name: string; tag: string };
}

// In real app: fetched from /api/products
const INITIAL_PRODUCTS: Product[] = [
  { product_id:1, product_code:"FERT-0001", product_name:"AgriGold Fertilizer",  pack_size:"25kg",  selling_price:2500, category:{ name:"Fertilizer",  tag:"FERT" } },
  { product_id:2, product_code:"FUNG-0001", product_name:"BioShield Fungicide",   pack_size:"500ml", selling_price:1800, category:{ name:"Fungicide",   tag:"FUNG" } },
  { product_id:3, product_code:"SUPP-0001", product_name:"RootBoost Supplement",  pack_size:"1L",    selling_price:1200, category:{ name:"Supplement",  tag:"SUPP" } },
  { product_id:4, product_code:"INSC-0001", product_name:"PestOff Insecticide",   pack_size:"250ml", selling_price:950,  category:{ name:"Insecticide", tag:"INSC" } },
  { product_id:5, product_code:"HERB-0001", product_name:"GreenMax Herbicide",    pack_size:"1L",    selling_price:1600, category:{ name:"Herbicide",   tag:"HERB" } },
  { product_id:6, product_code:"SOIL-0001", product_name:"SoilPro Conditioner",   pack_size:"10kg",  selling_price:3200, category:{ name:"Soil",        tag:"SOIL" } },
  { product_id:7, product_code:"SUPP-0002", product_name:"NutriSpray Foliar",     pack_size:"500ml", selling_price:1100, category:{ name:"Supplement",  tag:"SUPP" } },
  { product_id:8, product_code:"NEMA-0001", product_name:"CropSafe Nematicide",   pack_size:"1L",    selling_price:4500, category:{ name:"Nematicide",  tag:"NEMA" } },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const categories = ["ALL", ...Array.from(new Set(products.map((p) => p.category.name)))];

  const filtered = useMemo(() =>
    products.filter((p) => {
      const matchSearch =
        !search ||
        p.product_name.toLowerCase().includes(search.toLowerCase()) ||
        p.product_code.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === "ALL" || p.category.name === catFilter;
      return matchSearch && matchCat;
    }),
    [products, search, catFilter]
  );

  const handleDelete = async (product: Product) => {
    // Real: DELETE /api/products/[productId]
    setProducts((prev) => prev.filter((p) => p.product_id !== product.product_id));
    setDeleteTarget(null);
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="filter-bar">
        <div style={{ position: "relative" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)" }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="form-input"
            style={{ paddingLeft: 34, minWidth: 220 }}
            placeholder="Search by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div style={{ marginLeft: "auto" }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
            <PlusIcon /> New Product
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="table-toolbar">
          <span className="table-title">Product Catalogue</span>
          <span className="table-count">{filtered.length} products</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Product Name</th>
              <th>Pack Size</th>
              <th>Category</th>
              <th className="r">Selling Price (LKR)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.product_id}>
                <td className="mono">{p.product_code}</td>
                <td style={{ fontWeight: 500 }}>{p.product_name}</td>
                <td>{p.pack_size}</td>
                <td><span className="badge issue">{p.category.name}</span></td>
                <td className="r">
                  {p.selling_price.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Edit"><EditIcon /></button>
                    <button
                      className="btn btn-danger btn-sm btn-icon"
                      title="Delete"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showAdd && (
        <AddProductModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            // In real app: refetch or mutate
            setShowAdd(false);
          }}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <span className="modal-title">Delete Product</span>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6 }}>
                Are you sure you want to delete <strong style={{ color: "var(--text)" }}>{deleteTarget.product_name}</strong>?
                This cannot be undone. Products with existing stock cannot be deleted.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteTarget)}>
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);
