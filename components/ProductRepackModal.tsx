"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SearchableSelect, { type SearchableSelectOption } from "@/components/SearchableSelect";
import { useLocations } from "@/hooks/useInventory";
import type { StockOverviewRow } from "@/types/inventory";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

interface ProductDto {
  product_id: number;
  product_code: string;
  product_name: string;
  pack_size: string;
}

const todayInput = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function ProductRepackModal({ onClose, onSaved }: Props) {
  const qc = useQueryClient();
  const { data: locations = [] } = useLocations();

  const [repackDate, setRepackDate] = useState(todayInput);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [sourceProductId, setSourceProductId] = useState<number | null>(null);
  const [sourceQuantity, setSourceQuantity] = useState<string>("");
  const [targetProductId, setTargetProductId] = useState<number | null>(null);
  const [targetQuantity, setTargetQuantity] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const effectiveLocationId = locationId ?? locations[0]?.id ?? null;

  // 1. Fetch available stock at the selected location (for source product dropdown)
  const sourceStockQuery = useQuery<StockOverviewRow[], Error>({
    queryKey: ["repack-source-stock", effectiveLocationId],
    queryFn: async () => {
      const response = await fetch(`/api/inventory/${effectiveLocationId}?all=true`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load source stock.");
      }
      const rows = Array.isArray(payload.stock) ? (payload.stock as StockOverviewRow[]) : [];
      return rows.filter((row) => row.quantity_on_hand > 0);
    },
    enabled: Boolean(effectiveLocationId),
  });

  const sourceStock = useMemo(() => sourceStockQuery.data ?? [], [sourceStockQuery.data]);

  // 2. Fetch all products in the system (for target product dropdown)
  const productsQuery = useQuery<ProductDto[], Error>({
    queryKey: ["repack-target-products"],
    queryFn: async () => {
      const response = await fetch("/api/products?pageSize=1000");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load target products.");
      }
      return Array.isArray(payload.products) ? (payload.products as ProductDto[]) : [];
    },
    staleTime: 60_000,
  });

  const allProducts = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  // 3. Mutation to create repack document
  const createMutation = useMutation({
    mutationFn: async (dto: {
      repack_date: string;
      location_id: number;
      source_product_id: number;
      source_quantity: number;
      target_product_id: number;
      target_quantity: number;
      notes: string | null;
    }) => {
      const response = await fetch("/api/repacking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save repack document.");
      }
      return result;
    },
    onSuccess: () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: { msg: "Product repacked successfully.", type: "success" },
          }),
        );
      }
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["summaries"] });
      qc.invalidateQueries({ queryKey: ["repacks"] });
      onSaved();
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to create repack.");
    },
  });

  // Location dropdown options
  const locationOptions = useMemo<SearchableSelectOption[]>(
    () =>
      locations.map((loc) => ({
        id: loc.id,
        label: loc.label,
        searchText: `${loc.code} ${loc.label}`,
      })),
    [locations],
  );

  // Source product options (products in stock at the location)
  const sourceProductOptions = useMemo<SearchableSelectOption[]>(
    () =>
      sourceStock.map((row) => ({
        id: row.product_id,
        label: `${row.product_code} - ${row.product_name}`,
        description: `${row.pack_size} | Available: ${row.quantity_on_hand}`,
        searchText: `${row.product_code} ${row.product_name} ${row.pack_size}`,
      })),
    [sourceStock],
  );

  // Target product options (all products except currently selected source product)
  const targetProductOptions = useMemo<SearchableSelectOption[]>(
    () =>
      allProducts
        .filter((p) => p.product_id !== sourceProductId)
        .map((p) => ({
          id: p.product_id,
          label: `${p.product_code} - ${p.product_name}`,
          description: p.pack_size,
          searchText: `${p.product_code} ${p.product_name} ${p.pack_size}`,
        })),
    [allProducts, sourceProductId],
  );

  const selectedSourceProduct = useMemo(
    () => sourceStock.find((row) => row.product_id === sourceProductId),
    [sourceStock, sourceProductId],
  );

  const validate = () => {
    if (!effectiveLocationId) return "Select an inventory location.";
    if (!repackDate) return "Select a repack date.";
    if (!sourceProductId) return "Select a source product.";
    
    const srcQtyNum = Number(sourceQuantity);
    if (!Number.isInteger(srcQtyNum) || srcQtyNum <= 0) {
      return "Source quantity must be a positive integer.";
    }

    if (selectedSourceProduct && srcQtyNum > selectedSourceProduct.quantity_on_hand) {
      return `Source quantity exceeds available stock (${selectedSourceProduct.quantity_on_hand}).`;
    }

    if (!targetProductId) return "Select a target product.";
    if (sourceProductId === targetProductId) {
      return "Source and target products must be different.";
    }

    const tgtQtyNum = Number(targetQuantity);
    if (!Number.isInteger(tgtQtyNum) || tgtQtyNum <= 0) {
      return "Target quantity must be a positive integer.";
    }

    return "";
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");

    createMutation.mutate({
      repack_date: repackDate,
      location_id: effectiveLocationId!,
      source_product_id: sourceProductId!,
      source_quantity: Number(sourceQuantity),
      target_product_id: targetProductId!,
      target_quantity: Number(targetQuantity),
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <header className="px-5 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
          <p className="text-[16px] font-semibold text-stone-900">Repack Product</p>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-50 hover:text-stone-700 transition-colors"
          >
            ×
          </button>
        </header>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Location and Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
                Location *
              </label>
              <SearchableSelect
                options={locationOptions}
                value={effectiveLocationId}
                onChange={(id: number) => {
                  setLocationId(id);
                  setSourceProductId(null);
                  setError("");
                }}
                placeholder="Select Location"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
                Repack Date *
              </label>
              <input
                type="date"
                value={repackDate}
                onChange={(e) => {
                  setRepackDate(e.target.value);
                  setError("");
                }}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13.5px] text-stone-800 outline-none focus:border-[#1a5c2e]"
              />
            </div>
          </div>

          <hr className="border-t border-stone-100 my-1" />

          {/* Source Product Details */}
          <div className="space-y-3.5 rounded-xl border border-stone-200/80 bg-stone-50/50 p-4">
            <h4 className="text-[12px] font-bold text-[#2b2d7e] uppercase tracking-wider">
              Source (From)
            </h4>
            
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
                Product *
              </label>
              <SearchableSelect
                options={sourceProductOptions}
                value={sourceProductId}
                onChange={(id: number) => {
                  setSourceProductId(id);
                  setError("");
                  if (id === targetProductId) {
                    setTargetProductId(null);
                  }
                }}
                placeholder={
                  sourceStockQuery.isLoading
                    ? "Loading available stock..."
                    : "Search product to repack (must have stock)"
                }
              />
              {sourceStockQuery.error && (
                <p className="text-[11px] text-red-600">Failed to load stock list.</p>
              )}
            </div>

            {selectedSourceProduct && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
                    Quantity to Repack *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Enter quantity"
                    value={sourceQuantity}
                    onChange={(e) => {
                      setSourceQuantity(e.target.value);
                      setError("");
                    }}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13.5px] text-stone-800 outline-none focus:border-[#1a5c2e]"
                  />
                  <p className="text-[11px] text-stone-400">
                    Max available: {selectedSourceProduct.quantity_on_hand} {selectedSourceProduct.pack_size}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Target Product Details */}
          <div className="space-y-3.5 rounded-xl border border-stone-200/80 bg-stone-50/50 p-4">
            <h4 className="text-[12px] font-bold text-[#1a5c2e] uppercase tracking-wider">
              Target (To)
            </h4>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
                Product *
              </label>
              <SearchableSelect
                options={targetProductOptions}
                value={targetProductId}
                onChange={(id: number) => {
                  setTargetProductId(id);
                  setError("");
                }}
                placeholder={
                  productsQuery.isLoading
                    ? "Loading products list..."
                    : "Search destination product"
                }
                disabled={!sourceProductId}
              />
              {!sourceProductId && (
                <p className="text-[11px] text-stone-400">Select a source product first.</p>
              )}
              {productsQuery.error && (
                <p className="text-[11px] text-red-600">Failed to load product list.</p>
              )}
            </div>

            {targetProductId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
                    Produced Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Enter quantity"
                    value={targetQuantity}
                    onChange={(e) => {
                      setTargetQuantity(e.target.value);
                      setError("");
                    }}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13.5px] text-stone-800 outline-none focus:border-[#1a5c2e]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide">
              Notes
            </label>
            <textarea
              rows={2}
              placeholder="Provide reason or notes for repacking..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13.5px] text-stone-800 outline-none focus:border-[#1a5c2e] resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <footer className="px-5 py-4 border-t border-stone-100 flex justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-[13px] font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={createMutation.isPending}
            onClick={handleSubmit}
            className="rounded-xl bg-[#1a5c2e] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2d7a42] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? "Saving..." : "Save Repack"}
          </button>
        </footer>
      </div>
    </div>
  );
}
