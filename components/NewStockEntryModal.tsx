"use client";

  // eslint-disable-next-line
import { useEffect, useMemo, useState } from "react";
import { X, Plus } from "lucide-react";
import { StockOverviewRow, MovementRow } from "@/types/inventory";
import type { CreateStockEntryDto } from "@/types/inventory";

interface Props {
  onClose: () => void;
  onSaved: (
    updatedRows: StockOverviewRow[],
    newMovements: MovementRow[],
  ) => void;
}

type EntryItem = {
  id: number;
  productId: string;
  qty: string;
};

type ProductOption = {
  product_id: number;
  product_code: string;
  product_name: string;
  pack_size: string;
};

type LocationOption = {
  location_id: number;
  code: string;
  name: string;
};

type ProductsApiResponse = {
  products?: ProductOption[];
  error?: string;
};

type LocationsApiResponse = {
  locations?: LocationOption[];
  error?: string;
};

const createItem = (): EntryItem => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  productId: "",
  qty: "",
});

export default function NewStockEntryModal({ onClose, onSaved }: Props) {
  const [entryType, setEntryType] = useState<"LOCAL_PURCHASE" | "FOREIGN_IMPORT">(
    "LOCAL_PURCHASE",
  );
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [items, setItems] = useState<EntryItem[]>([createItem()]);

  useEffect(() => {
    let isCancelled = false;

    const loadOptions = async () => {
      setLoadingOptions(true);
      setError("");

      try {
        const [productsResponse, locationsResponse] = await Promise.all([
          fetch("/api/products?page=1&pageSize=500"),
          fetch("/api/locations"),
        ]);

        const productsResult = (await productsResponse.json()) as ProductsApiResponse;
        const locationsResult = (await locationsResponse.json()) as LocationsApiResponse;

        if (!productsResponse.ok) {
          throw new Error(productsResult.error ?? "Failed to load products.");
        }
        if (!locationsResponse.ok) {
          throw new Error(locationsResult.error ?? "Failed to load inventory locations.");
        }

        const nextProducts = Array.isArray(productsResult.products)
          ? productsResult.products
          : [];
        const nextLocations = Array.isArray(locationsResult.locations)
          ? locationsResult.locations
          : [];

        if (isCancelled) return;

        setProducts(nextProducts);
        setLocations(nextLocations);
        setLocation((current) => {
          if (current && nextLocations.some((entry) => String(entry.location_id) === current)) {
            return current;
          }
          return nextLocations[0] ? String(nextLocations[0].location_id) : "";
        });
      } catch (loadError) {
        if (isCancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load stock entry options.",
        );
      } finally {
        if (!isCancelled) {
          setLoadingOptions(false);
        }
      }
    };

    void loadOptions();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Unit price no longer used - removed from form
  // const totalAmount = useMemo(() => ..., [items]);

  const handleAddItem = () => {
    setItems((prev) => [...prev, createItem()]);
  };

  const handleRemoveItem = (id: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const handleItemChange = (id: number, field: keyof EntryItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const validate = () => {
    if (!date) return "Date is required.";
    if (!location) return "Location is required.";
    if (products.length === 0) return "No products found. Add products before creating stock.";
    if (items.length === 0) return "At least one product must be added.";

    for (const item of items) {
      if (!item.productId) return "All rows must have a product selected.";
      if (!item.qty || Number(item.qty) <= 0) return "Quantity must be greater than 0.";
    }

    return "";
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    const payload: CreateStockEntryDto = {
      entry_type: entryType,
      date,
      location_id: Number(location),
      reference_no: reference.trim() || null,
      notes: notes.trim() || null,
      items: items.map((item) => ({
        product_id: Number(item.productId),
        quantity: Number(item.qty),
        unit_price: 0, // Unit price not collected from form
      })),
    };

    try {
      const response = await fetch("/api/inventory/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save stock entry.");
      }

      onSaved([], []);
      onClose();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save stock entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 min-h-[600px]"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-[640px] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between shrink-0">
          <p className="text-[16px] font-semibold text-stone-900">New Stock Entry</p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-6 py-5 flex-1 overflow-y-auto">
          <div className="flex gap-2 p-1 bg-stone-100 border border-stone-200 rounded-xl mb-4">
            <button
              onClick={() => setEntryType("LOCAL_PURCHASE")}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                entryType === "LOCAL_PURCHASE"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              Local Purchase
            </button>
            <button
              onClick={() => setEntryType("FOREIGN_IMPORT")}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                entryType === "FOREIGN_IMPORT"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              Foreign Import
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 uppercase tracking-wide mb-1.5">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full bg-white border border-stone-200 text-stone-900 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 uppercase tracking-wide mb-1.5">
                Reference No.
              </label>
              <input
                type="text"
                placeholder="Optional"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className="w-full bg-white border border-stone-200 text-stone-900 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-200 placeholder:text-stone-400"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-stone-600 uppercase tracking-wide mb-1.5">
              Inventory Location *
            </label>
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              disabled={loadingOptions || locations.length === 0}
              className="w-full bg-white border border-stone-200 text-stone-900 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-200 disabled:opacity-60"
            >
              {locations.map((entry) => (
                <option key={entry.location_id} value={String(entry.location_id)}>
                  {entry.code} — {entry.name}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-stone-200 my-5" />

          <p className="text-[11px] font-semibold text-stone-600 uppercase tracking-wide mb-2">
            Products Received
          </p>
          <div className="border border-stone-200 rounded-xl overflow-hidden mb-3">
            <table className="w-full text-left border-collapse">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-3 py-2 text-[10px] uppercase font-medium text-stone-600 w-[65%]">
                    Product
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase font-medium text-stone-600 w-[20%]">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase font-medium text-stone-600 w-[15%] text-center">
                    ×
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-stone-200 last:border-0 hover:bg-stone-50 transition-colors">
                    <td className="px-2 py-2.5">
                      <select
                        value={item.productId}
                        onChange={(event) =>
                          handleItemChange(item.id, "productId", event.target.value)
                        }
                        disabled={loadingOptions || products.length === 0}
                        className="w-full bg-white border border-stone-200 text-stone-900 rounded-md px-2 py-1.5 text-[12px] focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-200 disabled:opacity-60"
                      >
                        <option value="">Select product...</option>
                        {products.map((product) => (
                          <option
                            key={product.product_id}
                            value={String(product.product_id)}
                          >
                            {product.product_code} - {product.product_name} [{product.pack_size}]
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2.5">
                      <input
                        type="number"
                        min="1"
                        placeholder="0"
                        value={item.qty}
                        onChange={(event) =>
                          handleItemChange(item.id, "qty", event.target.value)
                        }
                        className="w-full bg-white border border-stone-200 text-stone-900 rounded-md px-2 py-1.5 text-[12px] focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-200 placeholder:text-stone-400"
                      />
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {items.length > 1 && (
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-5">
            <button
              onClick={handleAddItem}
              className="flex items-center gap-1 text-[12px] font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              <Plus size={12} /> Add Row
            </button>
          </div>

          <div className="mb-2">
            <label className="block text-[11px] font-semibold text-stone-600 uppercase tracking-wide mb-1.5">
              Notes
            </label>
            <textarea
              placeholder="Supplier, delivery reference, customs info..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full bg-white border border-stone-200 text-stone-900 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-200 min-h-[60px] placeholder:text-stone-400"
            />
          </div>

          {loadingOptions && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 text-[12px] mt-4">
              Loading products and locations...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-[12px] mt-4">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loadingOptions}
            className="px-4 py-2 text-[13px] font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {saving ? "Saving..." : "Save Stock Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
