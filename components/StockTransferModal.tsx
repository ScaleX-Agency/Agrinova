"use client";

import { useEffect, useMemo, useState } from "react";
import SearchableSelect, { type SearchableSelectOption } from "@/components/SearchableSelect";
import { useCreateStockTransfer, useLocations } from "@/hooks/useInventory";
import type { StockOverviewRow } from "@/types/inventory";

type TransferLine = {
  id: number;
  productId: number | null;
  quantity: number;
};

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const todayInput = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function StockTransferModal({ onClose, onSaved }: Props) {
  const { data: locations = [] } = useLocations();
  const createMutation = useCreateStockTransfer();

  const [transferDate, setTransferDate] = useState(todayInput);
  const [fromLocationId, setFromLocationId] = useState<number | null>(null);
  const [toLocationId, setToLocationId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<TransferLine[]>([]);
  const [sourceStock, setSourceStock] = useState<StockOverviewRow[]>([]);
  const [loadingSourceStock, setLoadingSourceStock] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (locations.length > 0 && fromLocationId === null) {
      setFromLocationId(locations[0].id);
    }
  }, [locations, fromLocationId]);

  useEffect(() => {
    if (!fromLocationId) {
      setSourceStock([]);
      return;
    }
    let mounted = true;
    setLoadingSourceStock(true);
    setError("");
    fetch(`/api/inventory/${fromLocationId}?all=true`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load source stock.");
        }
        return Array.isArray(payload.stock) ? (payload.stock as StockOverviewRow[]) : [];
      })
      .then((rows) => {
        if (!mounted) return;
        setSourceStock(rows.filter((row) => row.quantity_on_hand > 0));
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load source stock.");
        setSourceStock([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingSourceStock(false);
      });
    return () => {
      mounted = false;
    };
  }, [fromLocationId]);

  const locationOptions = useMemo<SearchableSelectOption[]>(
    () =>
      locations.map((loc) => ({
        id: loc.id,
        label: loc.label,
        searchText: `${loc.code} ${loc.label}`,
      })),
    [locations],
  );

  const toLocationOptions = useMemo(
    () => locationOptions.filter((option) => option.id !== fromLocationId),
    [locationOptions, fromLocationId],
  );

  const productOptions = useMemo<SearchableSelectOption[]>(
    () =>
      sourceStock.map((row) => ({
        id: row.product_id,
        label: `${row.product_code} - ${row.product_name}`,
        description: `${row.pack_size} | Available: ${row.quantity_on_hand}`,
        searchText: `${row.product_code} ${row.product_name} ${row.pack_size}`,
      })),
    [sourceStock],
  );

  const stockByProductId = useMemo(
    () => new Map(sourceStock.map((row) => [row.product_id, row.quantity_on_hand])),
    [sourceStock],
  );

  const getSelectedProductIds = (excludeLineId?: number) =>
    new Set(
      lines
        .filter((line) => line.id !== excludeLineId && line.productId !== null)
        .map((line) => line.productId as number),
    );

  const getOptionsForLine = (lineId: number, currentProductId: number | null) => {
    const selectedByOthers = getSelectedProductIds(lineId);
    return productOptions.filter(
      (option) =>
        option.id === currentProductId || !selectedByOthers.has(option.id),
    );
  };

  const canAddLine = useMemo(() => {
    const selected = getSelectedProductIds();
    return productOptions.some((option) => !selected.has(option.id));
  }, [lines, productOptions]);

  const addLine = () => {
    const selectedByOthers = getSelectedProductIds();
    const firstAvailableProductId =
      productOptions.find((option) => !selectedByOthers.has(option.id))?.id ?? null;

    setLines((prev) => [
      ...prev,
      {
        id: Date.now() + prev.length,
        productId: firstAvailableProductId,
        quantity: 1,
      },
    ]);
  };

  const removeLine = (lineId: number) => {
    setLines((prev) => prev.filter((line) => line.id !== lineId));
  };

  const updateLine = (lineId: number, next: Partial<TransferLine>) => {
    setLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...next } : line)));
    setError("");
  };

  const validate = () => {
    if (!fromLocationId) return "Select a source location.";
    if (!toLocationId) return "Select a destination location.";
    if (fromLocationId === toLocationId) return "Source and destination must be different.";
    if (!transferDate) return "Select a transfer date.";
    if (lines.length === 0) return "Add at least one transfer item.";

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.productId) return `Line ${i + 1}: select a product.`;
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) return `Line ${i + 1}: quantity must be greater than 0.`;
      const available = stockByProductId.get(line.productId) ?? 0;
      if (line.quantity > available) {
        return `Line ${i + 1}: quantity exceeds available stock (${available}).`;
      }
    }

    const dedupe = new Set<number>();
    for (const line of lines) {
      if (!line.productId) continue;
      if (dedupe.has(line.productId)) {
        return "Each product should appear only once. Adjust the quantity in a single row.";
      }
      dedupe.add(line.productId);
    }

    return "";
  };

  const submit = async () => {
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    try {
      await createMutation.mutateAsync({
        transfer_date: transferDate,
        from_location_id: fromLocationId!,
        to_location_id: toLocationId!,
        notes: notes.trim() || null,
        items: lines.map((line) => ({
          product_id: line.productId!,
          quantity: line.quantity,
        })),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: { msg: "Stock transfer created successfully.", type: "success" },
          }),
        );
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create stock transfer.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-[760px] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <p className="text-[16px] font-semibold text-stone-900">Transfer Stock</p>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
            onClick={onClose}
          >
            x
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">From Location *</label>
              <SearchableSelect
                value={fromLocationId}
                onChange={(value) => {
                  setFromLocationId(value);
                  if (toLocationId === value) setToLocationId(null);
                }}
                options={locationOptions}
                placeholder="Select source location"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">To Location *</label>
              <SearchableSelect
                value={toLocationId}
                onChange={setToLocationId}
                options={toLocationOptions}
                placeholder="Select destination location"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Transfer Date *</label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full bg-white border border-stone-200 text-stone-900 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50"
              />
            </div>
          </div>

          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
              <span className="text-[12px] font-semibold text-stone-700 uppercase tracking-wide">Items</span>
              <button
                onClick={addLine}
                className="px-2.5 py-1 text-[12px] font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                disabled={!canAddLine}
              >
                Add Line
              </button>
            </div>
            <div className="space-y-2 p-3">
              {lines.length > 0 && (
                <div className="grid grid-cols-12 gap-2 px-0.5">
                  <p className="col-span-7 text-[11px] font-semibold text-stone-500 uppercase tracking-wide">Product</p>
                  <p className="col-span-3 text-[11px] font-semibold text-stone-500 uppercase tracking-wide">Qty *</p>
                  <p className="col-span-2 text-[11px] font-semibold text-stone-500 uppercase tracking-wide text-center">Action</p>
                </div>
              )}
              {lines.map((line) => {
                const available = line.productId ? stockByProductId.get(line.productId) ?? 0 : 0;
                const lineOptions = getOptionsForLine(line.id, line.productId);
                return (
                  <div key={line.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-7">
                      <SearchableSelect
                        value={line.productId}
                        onChange={(value) => updateLine(line.id, { productId: value })}
                        options={lineOptions}
                        placeholder={loadingSourceStock ? "Loading source stock..." : "Select product"}
                        disabled={loadingSourceStock || !fromLocationId}
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min={1}
                        max={available > 0 ? available : undefined}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.id, {
                            quantity: Math.max(1, Number.parseInt(e.target.value || "1", 10)),
                          })
                        }
                        className="w-full bg-white border border-stone-200 text-stone-900 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50"
                      />
                    </div>
                    <div className="col-span-2">
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="w-full px-2 py-2 text-[12px] font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
              {lines.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-[13px] font-medium text-stone-500">No transfer items added</p>
                  <p className="text-[12px] text-stone-400 mt-1">Click "Add Line" to begin selecting products.</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              className="w-full bg-white border border-stone-200 text-stone-900 placeholder:text-stone-500 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 min-h-[80px]"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-lg p-3 text-[12px]">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-end gap-2">
          <button
            className="px-4 py-2 text-[13px] font-medium text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-[13px] font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-60 rounded-xl transition-colors"
            onClick={submit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Saving..." : "Save Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}
