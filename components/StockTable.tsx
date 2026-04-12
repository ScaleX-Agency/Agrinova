"use client";

import { Search, ArrowLeftRight, Pencil, Download } from "lucide-react";
import { StockOverviewRow, StockFilter, StockStatus } from "@/types/inventory";

const LOCATIONS = [
  { location_id: 1, code: "IGRN1", name: "Head Office" },
  { location_id: 2, code: "IGRN2", name: "Kuliyapitiya" },
  { location_id: 3, code: "IGRN3", name: "Nuwara Eliya" },
  { location_id: 4, code: "IGRN4", name: "Peradeniya" },
];

const STATUS_CONFIG: Record<StockStatus, { label: string; dot: string; badge: string }> = {
  ok:  { label: "In Stock",     dot: "bg-green-500",  badge: "bg-green-50  text-green-700"  },
  low: { label: "Low Stock",    dot: "bg-amber-500",  badge: "bg-amber-50  text-amber-800"  },
  out: { label: "Out of Stock", dot: "bg-red-500",    badge: "bg-red-50    text-red-700"    },
};

const BAR_COLOR: Record<StockStatus, string> = {
  ok:  "bg-green-500",
  low: "bg-amber-500",
  out: "bg-red-500",
};

interface Props {
  rows: StockOverviewRow[];
  filter: StockFilter;
  onFilterChange: (f: StockFilter) => void;
  onRecordMovement: (row: StockOverviewRow) => void;
  onNewStockEntry: () => void;
}

export default function StockTable({
  rows, filter, onFilterChange, onRecordMovement,
}: Props) {
  const set = (k: keyof StockFilter, v: StockFilter[keyof StockFilter]) =>
    onFilterChange({ ...filter, [k]: v });

  return (
    <>
      {/* Filter bar */}
      <div className="flex gap-2 items-center mb-3 flex-wrap">
        <div className="relative flex-1 max-w-[260px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-blue-400 placeholder:text-stone-400"
            placeholder="Search by name or code…"
            value={filter.search}
            onChange={(e) => set("search", e.target.value)}
          />
        </div>

        <select
          className="text-[13px] border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-blue-400 text-stone-700"
          value={filter.location_id ?? ""}
          onChange={(e) => set("location_id", e.target.value ? +e.target.value : null)}
        >
          <option value="">All Locations</option>
          {LOCATIONS.map((l) => (
            <option key={l.location_id} value={l.location_id}>{l.code} — {l.name}</option>
          ))}
        </select>

        <select
          className="text-[13px] border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-blue-400 text-stone-700"
          value={filter.status}
          onChange={(e) => set("status", e.target.value as StockFilter["status"])}
        >
          <option value="all">All Status</option>
          <option value="ok">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>

        <button className="ml-auto flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
          <Download size={12} /> Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <span className="text-[13px] font-semibold text-stone-700">Inventory</span>
          <span className="text-[11px] text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full">
            {rows.length} items
          </span>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-stone-100">
              {["Code", "Product", "Location", "Qty on Hand", "Threshold", "Level", "Status", "Actions"].map((h, i) => (
                <th
                  key={h}
                  className={`px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-stone-400 bg-white ${i >= 3 && i <= 6 ? "text-right" : "text-left"} ${i === 7 ? "text-left" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <div className="text-stone-300 text-4xl mb-2">📦</div>
                  <p className="text-[14px] font-medium text-stone-500">No products found</p>
                  <p className="text-[12px] text-stone-400 mt-1">Adjust filters to see results</p>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const s = row.status;
                const cfg = STATUS_CONFIG[s];
                const pct = Math.min(100, Math.round((row.quantity_on_hand / (row.reorder_threshold * 3)) * 100));
                const locObj = LOCATIONS.find((l) => l.location_id === row.location_id);

                return (
                  <tr key={row.stock_id} className="border-b border-stone-50 hover:bg-stone-50/70 transition-colors">
                    <td className="px-3.5 py-3 font-mono text-[11.5px] font-medium text-blue-800">
                      {row.product_code}
                    </td>
                    <td className="px-3.5 py-3">
                      <p className="text-[13px] font-medium text-stone-800">{row.product_name}</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">{row.category_name} · {row.pack_size}</p>
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800">
                        {locObj?.code}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono text-[15px] font-bold text-stone-800">
                      {row.quantity_on_hand}
                    </td>
                    <td className="px-3.5 py-3 text-right text-[13px] text-stone-400">
                      {row.reorder_threshold}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="w-[72px] h-1.5 bg-stone-100 rounded-full overflow-hidden ml-auto">
                        <div className={`h-full rounded-full ${BAR_COLOR[s]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex gap-1.5">
                        <button
                          title="Record movement"
                          onClick={() => onRecordMovement(row)}
                          className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-200 hover:bg-stone-100 text-stone-500 transition-colors"
                        >
                          <ArrowLeftRight size={12} />
                        </button>
                        <button
                          title="Edit"
                          className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-200 hover:bg-stone-100 text-stone-500 transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
