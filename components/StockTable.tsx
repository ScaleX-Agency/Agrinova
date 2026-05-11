"use client";

import { Search, ArrowLeftRight, Download } from "lucide-react";
import { StockOverviewRow, StockFilter, StockStatus } from "@/types/inventory";
import { useLocations } from "@/hooks/useInventory";
import Pagination from "rc-pagination";
import "rc-pagination/assets/index.css";

const STATUS_CONFIG: Record<
  StockStatus,
  { label: string; dot: string; badge: string }
> = {
  ok: {
    label: "In Stock",
    dot: "bg-green-500",
    badge: "bg-green-50  text-green-700",
  },
  low: {
    label: "Low Stock",
    dot: "bg-amber-500",
    badge: "bg-amber-50  text-amber-800",
  },
  out: {
    label: "Out of Stock",
    dot: "bg-red-500",
    badge: "bg-red-50    text-red-700",
  },
};

interface Props {
  rows: StockOverviewRow[];
  filter: StockFilter;
  onFilterChange: (f: StockFilter) => void;
  onRecordMovement: (row: StockOverviewRow) => void;
  onNewStockEntry: () => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    setPage: (p: number) => void;
  };
}

export default function StockTable({
  rows,
  filter,
  onFilterChange,
  onRecordMovement,
  pagination,
}: Props) {
  const set = (k: keyof StockFilter, v: StockFilter[keyof StockFilter]) => {
    onFilterChange({ ...filter, [k]: v });
    if (pagination) {
      pagination.setPage(1);
    }
  };

  const { data: LOCATIONS = [] } = useLocations();

  return (
    <>
      {/* Filter bar */}
      <div className="flex gap-2 items-center mb-3 flex-wrap">
        <div className="relative flex-1 max-w-[260px]">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
          />
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
          onChange={(e) =>
            set("location_id", e.target.value ? +e.target.value : null)
          }
        >
          <option value="">All Locations</option>
          {LOCATIONS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>

        <select
          className="text-[13px] border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-blue-400 text-stone-700"
          value={filter.status}
          onChange={(e) =>
            set("status", e.target.value as StockFilter["status"])
          }
        >
          <option value="all">All Status</option>
          <option value="ok">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>

        <button
          onClick={() => {
            import("@/lib/exportCsv").then(({ exportToCsv }) => {
              const headers = [
                "Product Code",
                "Product Name",
                "Pack Size",
                "Category",
                "Location",
                "Qty on Hand",
                "Status",
              ];
              const exportRows = rows.map((r) => [
                r.product_code,
                r.product_name,
                r.pack_size,
                r.category_name,
                r.is_aggregate
                  ? r.location_code
                  : LOCATIONS.find((l) => l.id === r.location_id)?.code || r.location_code || "",
                String(r.quantity_on_hand),
                r.status,
              ]);
              exportToCsv(
                `agrinova-stock-${new Date().toISOString().split("T")[0]}.csv`,
                headers,
                exportRows,
              );
              if (typeof window !== "undefined") {
                const event = new CustomEvent("toast", {
                  detail: {
                    msg: `Exported ${exportRows.length} rows to CSV`,
                    type: "success",
                  },
                });
                window.dispatchEvent(event);
              }
            });
          }}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
        >
          <Download size={12} /> Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <span className="text-[13px] font-semibold text-stone-700">
            Inventory
          </span>
          <span className="text-[11px] text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full">
            {pagination?.total ?? rows.length} items
          </span>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-stone-100">
              {[
                "Code",
                "Product",
                "Location",
                "Qty on Hand",
                "Status",
                "Actions",
              ].map((h, i) => (
                <th
                  key={h}
                  className={`px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-stone-400 bg-white ${i === 3 || i === 4 ? "text-right" : "text-left"} ${i === 5 ? "text-left" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="text-stone-300 text-4xl mb-2">📦</div>
                  <p className="text-[14px] font-medium text-stone-500">
                    No products found
                  </p>
                  <p className="text-[12px] text-stone-400 mt-1">
                    Adjust filters to see results
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const s = row.status;
                const cfg = STATUS_CONFIG[s];
                const locObj = LOCATIONS.find(
                  (l) => l.id === row.location_id,
                );
                const locationLabel = row.is_aggregate
                  ? "All Locations"
                  : locObj?.code || row.location_code;

                return (
                  <tr
                    key={row.stock_id}
                    className="border-b border-stone-50 hover:bg-stone-50/70 transition-colors"
                  >
                    <td className="px-3.5 py-3 [font-family:var(--font-jetbrains)] text-[11.5px] font-medium text-blue-800">
                      {row.product_code}
                    </td>
                    <td className="px-3.5 py-3">
                      <p className="text-[13px] font-medium text-stone-800">
                        {row.product_name}
                      </p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {row.category_name} · {row.pack_size}
                      </p>
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800">
                        {locationLabel}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right [font-family:var(--font-jetbrains)] text-[15px] font-bold text-stone-800">
                      {row.quantity_on_hand}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.badge}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                        />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-left">
                      <div className="flex gap-1.5">
                        {!row.is_aggregate ? (
                          <button
                            title="Record movement"
                            onClick={() => onRecordMovement(row)}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-200 hover:bg-stone-100 text-stone-500 transition-colors"
                          >
                            <ArrowLeftRight size={12} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {pagination && pagination.total > pagination.pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 bg-stone-50">
            <span className="text-[12px] text-stone-500">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} entries
            </span>
            <Pagination
              current={pagination.page}
              total={pagination.total}
              pageSize={pagination.pageSize}
              onChange={(p) => pagination.setPage(p)}
              className="text-[12px]"
            />
          </div>
        )}
      </div>
    </>
  );
}
