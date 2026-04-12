"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { StockOverviewRow, MovementRow, MovementType } from "@/types/inventory";

interface Props {
  onClose: () => void;
  onSaved: (
    updatedRows: StockOverviewRow[],
    newMovements: MovementRow[],
  ) => void;
}

export default function NewStockEntryModal({ onClose, onSaved }: Props) {
  const [entryType, setEntryType] = useState<
    "LOCAL_PURCHASE" | "FOREIGN_IMPORT"
  >("LOCAL_PURCHASE");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [location, setLocation] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [items, setItems] = useState([
    { id: Date.now(), productId: "", qty: "", price: "" },
  ]);

  const totalAmount = items.reduce((sum, item) => {
    const q = Number(item.qty) || 0;
    const p = Number(item.price) || 0;
    return sum + q * p;
  }, 0);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), productId: "", qty: "", price: "" }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id: number, field: string, value: string) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const validate = () => {
    if (!date) return "Date is required";
    if (!location) return "Location is required";
    if (items.length === 0) return "At least one product must be added";
    for (const item of items) {
      if (!item.productId) return "All rows must have a product selected";
      if (!item.qty || Number(item.qty) <= 0)
        return "Quantity must be greater than 0";
    }
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

    // Simulate save
    await new Promise((r) => setTimeout(r, 600));

    setSaving(false);
    onSaved([], []);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 min-h-[600px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#181c27] border border-[#2a2f45] rounded-2xl w-full max-w-[640px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a2f45] flex items-center justify-between shrink-0">
          <p className="text-[16px] font-semibold text-[#e8eaf0]">
            New Stock Entry
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#242840] hover:bg-[#2a2f45] text-stone-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex-1 overflow-y-auto">
          {/* Row 1: Entry Type Toggle */}
          <div className="flex gap-2 p-1 bg-[#181c27] border border-[#2a2f45] rounded-xl mb-4">
            <button
              onClick={() => setEntryType("LOCAL_PURCHASE")}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                entryType === "LOCAL_PURCHASE"
                  ? "bg-[#1f4a2c] text-[#4ade80] border border-[#1a4a2e]"
                  : "bg-transparent text-[#8b91a8] hover:text-[#e8eaf0]"
              }`}
            >
              Local Purchase
            </button>
            <button
              onClick={() => setEntryType("FOREIGN_IMPORT")}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                entryType === "FOREIGN_IMPORT"
                  ? "bg-[#1f4a2c] text-[#4ade80] border border-[#1a4a2e]"
                  : "bg-transparent text-[#8b91a8] hover:text-[#e8eaf0]"
              }`}
            >
              Foreign Import
            </button>
          </div>

          {/* Row 2: Date and Ref */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#555c78] uppercase tracking-wide mb-1.5">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#242840] border border-[#2a2f45] text-[#e8eaf0] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#1a3050]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#555c78] uppercase tracking-wide mb-1.5">
                Reference No.
              </label>
              <input
                type="text"
                placeholder="Optional"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full bg-[#242840] border border-[#2a2f45] text-[#e8eaf0] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#1a3050]"
              />
            </div>
          </div>

          {/* Row 3: Location */}
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-[#555c78] uppercase tracking-wide mb-1.5">
              Inventory Location *
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-[#242840] border border-[#2a2f45] text-[#e8eaf0] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#1a3050]"
            >
              <option value="1">IGRN1 — Head Office</option>
              <option value="2">IGRN2 — Kuliyapitiya</option>
              <option value="3">IGRN3 — Nuwara Eliya</option>
              <option value="4">IGRN4 — Peradeniya</option>
            </select>
          </div>

          <div className="border-t border-[#2a2f45] my-5"></div>

          {/* Products Received Table */}
          <p className="text-[11px] font-semibold text-[#555c78] uppercase tracking-wide mb-2">
            Products Received
          </p>
          <div className="border border-[#2a2f45] rounded-xl overflow-hidden mb-3">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#1e2335]">
                <tr>
                  <th className="px-3 py-2 text-[10px] uppercase font-medium text-[#555c78] w-[45%]">
                    Product
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase font-medium text-[#555c78] w-[20%]">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase font-medium text-[#555c78] w-[25%]">
                    Unit Price LKR
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase font-medium text-[#555c78] w-[10%] text-center">
                    ×
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#181c27]">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#2a2f45] last:border-0"
                  >
                    <td className="px-2 py-2.5">
                      <select
                        value={item.productId}
                        onChange={(e) =>
                          handleItemChange(item.id, "productId", e.target.value)
                        }
                        className="w-full bg-[#242840] border border-[#2a2f45] text-[#e8eaf0] rounded-md px-2 py-1.5 text-[12px] focus:outline-none focus:border-[#1a3050]"
                      >
                        <option value="">Select product...</option>
                        <option value="1">
                          FERT-0001 - AgriGold Fertilizer
                        </option>
                        <option value="2">
                          FUNG-0001 - BioShield Fungicide
                        </option>
                        <option value="3">
                          SUPP-0001 - RootBoost Supplement
                        </option>
                      </select>
                    </td>
                    <td className="px-2 py-2.5">
                      <input
                        type="number"
                        min="1"
                        placeholder="0"
                        value={item.qty}
                        onChange={(e) =>
                          handleItemChange(item.id, "qty", e.target.value)
                        }
                        className="w-full bg-[#242840] border border-[#2a2f45] text-[#e8eaf0] rounded-md px-2 py-1.5 text-[12px] focus:outline-none focus:border-[#1a3050]"
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={item.price}
                        onChange={(e) =>
                          handleItemChange(item.id, "price", e.target.value)
                        }
                        className="w-full bg-[#242840] border border-[#2a2f45] text-[#e8eaf0] rounded-md px-2 py-1.5 text-[12px] focus:outline-none focus:border-[#1a3050]"
                      />
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {items.length > 1 && (
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-[#f87171] hover:text-[#fca5a5] p-1"
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

          {/* Add Row & Total */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={handleAddItem}
              className="flex items-center gap-1 text-[12px] font-medium text-[#8b91a8] hover:text-[#e8eaf0] transition-colors"
            >
              <Plus size={12} /> Add Row
            </button>
            {totalAmount > 0 && (
              <span className="text-[13px] font-semibold font-mono text-[#4ade80]">
                Total: LKR{" "}
                {totalAmount.toLocaleString("en-LK", {
                  minimumFractionDigits: 2,
                })}
              </span>
            )}
          </div>

          {/* Notes */}
          <div className="mb-2">
            <label className="block text-[11px] font-semibold text-[#555c78] uppercase tracking-wide mb-1.5">
              Notes
            </label>
            <textarea
              placeholder="Supplier, delivery reference, customs info…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#242840] border border-[#2a2f45] text-[#e8eaf0] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#1a3050] min-h-[60px]"
            />
          </div>

          {error && (
            <div className="bg-[#2a0d0d] border border-[#4a1a1a] text-[#f87171] rounded-lg p-3 text-[12px] mt-4">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
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
            className="px-4 py-2 text-[13px] font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {saving ? "Saving…" : "Save Stock Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
