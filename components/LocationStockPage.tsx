"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, Package, Search, TrendingUp, XCircle } from "lucide-react";
import Pagination from "rc-pagination";
import "rc-pagination/assets/index.css";
import BackNavigationLink from "@/components/ui/BackNavigationLink";

type StockStatus = "ok" | "low" | "out";

interface StockRow {
  stock_id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  category_name: string;
  pack_size: string;
  quantity_on_hand: number;
  reorder_threshold: number;
  status: StockStatus;
}

interface Props {
  locationId: number;
  locationCode: string;
  locationName: string;
  initialStock?: { stock?: StockRow[]; items?: StockRow[]; pagination?: { total?: number } };
}

const STATUS_CFG: Record<StockStatus, { label: string; dot: string; badge: string }> = {
  ok: {
    label: "In Stock",
    dot: "bg-green-500",
    badge: "bg-green-50 text-green-700 border-green-200",
  },
  low: {
    label: "Low Stock",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
  },
  out: {
    label: "Out of Stock",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
};

const BAR_COLOR: Record<StockStatus, string> = {
  ok: "bg-green-500",
  low: "bg-amber-500",
  out: "bg-red-400",
};

export default function LocationStockPage({
  locationId,
  locationCode,
  locationName,
  initialStock = { items: [], pagination: { total: 0 } },
}: Props) {
  const initStockItems = initialStock.items || initialStock.stock || [];
  const initStockTotal = initialStock.pagination?.total ?? initStockItems.length;

  const [stock, setStock] = useState<StockRow[]>(initStockItems);
  const [stockPage, setStockPage] = useState(1);
  const stockPageSize = 20;
  const [stockTotal, setStockTotal] = useState(initStockTotal);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "low" | "out">("all");

  useEffect(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(stockPage));
    sp.set("pageSize", String(stockPageSize));
    if (search) sp.set("search", search);
    if (statusFilter !== "all") sp.set("status", statusFilter);

    fetch(`/api/inventory/${locationId}?${sp.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.stock) {
          setStock(data.stock);
          if (data.pagination) setStockTotal(data.pagination.total);
        }
      })
      .catch(console.error);
  }, [locationId, search, statusFilter, stockPage]);

  const stats = useMemo(
    () => ({
      totalProducts: stockTotal,
      totalUnits: stock.reduce((a, b) => a + b.quantity_on_hand, 0),
      low: stock.filter((r) => r.status === "low").length,
      out: stock.filter((r) => r.status === "out").length,
    }),
    [stock, stockTotal],
  );

  return (
    <div className="space-y-5">
      <div>
        <BackNavigationLink
          href="/inventory"
          label="Back to Stock Overview"
          iconSize={13}
          className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] text-stone-400 transition-colors hover:text-stone-700 [font-family:var(--font-dmsans)]"
        />
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="[font-family:var(--font-jetbrains)] text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                {locationCode}
              </span>
              <span className="text-[11px] text-stone-300">.</span>
              <span className="text-[11.5px] text-stone-400 [font-family:var(--font-dmsans)]">
                Location Detail
              </span>
            </div>
            <h1 className="text-[26px] font-semibold text-stone-900 [font-family:var(--font-dmsans)] leading-tight">
              {locationName}
            </h1>
            <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
              Stock levels for this location
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Products",
            value: stats.totalProducts,
            icon: <Package size={16} className="text-green-700" />,
            accent: "bg-green-50 border-green-100",
          },
          {
            label: "Total Units",
            value: stats.totalUnits.toLocaleString(),
            icon: <TrendingUp size={16} className="text-blue-700" />,
            accent: "bg-blue-50 border-blue-100",
          },
          {
            label: "Low Stock",
            value: stats.low,
            icon: <AlertTriangle size={16} className="text-amber-700" />,
            accent: "bg-amber-50 border-amber-100",
          },
          {
            label: "Out of Stock",
            value: stats.out,
            icon: <XCircle size={16} className="text-red-600" />,
            accent: "bg-red-50 border-red-100",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-stone-200 rounded-2xl p-4 flex items-start gap-3 hover:shadow-sm transition-shadow"
          >
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${s.accent}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">
                {s.label}
              </p>
              <p className="text-[24px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] leading-none mt-0.5">
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative w-[220px]">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              className="w-full pl-9 pr-3 py-2 text-[13px] border border-stone-200 rounded-xl bg-white placeholder:text-stone-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all [font-family:var(--font-dmsans)]"
              placeholder="Search product..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setStockPage(1);
              }}
            />
          </div>
          {(["all", "ok", "low", "out"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setStockPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all [font-family:var(--font-dmsans)] ${
                statusFilter === s
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white text-stone-500 border-stone-200 hover:border-blue-300"
              }`}
            >
              {s === "all" ? "All" : s === "ok" ? "In Stock" : s === "low" ? "Low" : "Out"}
            </button>
          ))}
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-stone-500 border border-stone-200 rounded-xl bg-white hover:bg-stone-50 transition-colors [font-family:var(--font-dmsans)]">
          <Download size={12} /> Export
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
            Inventory
          </span>
          <span className="text-[11px] text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full [font-family:var(--font-dmsans)]">
            {stockTotal} items
          </span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-stone-100">
              {["Code", "Product", "Qty on Hand", "Threshold", "Level", "Status"].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-stone-400 bg-white [font-family:var(--font-dmsans)] ${i >= 2 && i <= 4 ? "text-right" : "text-left"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stock.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="text-3xl mb-2">[]</div>
                  <p className="text-[14px] font-medium text-stone-500 [font-family:var(--font-dmsans)]">
                    No products found
                  </p>
                  <p className="text-[12px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
                    Adjust filters to see results
                  </p>
                </td>
              </tr>
            ) : (
              stock.map((row) => {
                const cfg = STATUS_CFG[row.status];
                const pct = Math.min(100, Math.round((row.quantity_on_hand / (row.reorder_threshold * 3)) * 100));
                return (
                  <tr
                    key={row.stock_id}
                    className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/60 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="[font-family:var(--font-jetbrains)] text-[11.5px] font-medium text-blue-700">
                        {row.product_code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
                        {row.product_name}
                      </p>
                      <p className="text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">
                        {row.category_name} . {row.pack_size}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right [font-family:var(--font-jetbrains)] text-[15px] font-bold text-stone-800">
                      {row.quantity_on_hand}
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] text-stone-400 [font-family:var(--font-dmsans)]">
                      {row.reorder_threshold}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-[64px] h-1.5 bg-stone-100 rounded-full overflow-hidden ml-auto">
                        <div className={`h-full rounded-full ${BAR_COLOR[row.status]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border [font-family:var(--font-dmsans)] ${cfg.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {stockTotal > stockPageSize && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-stone-100 bg-stone-50">
            <span className="text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">
              Showing {(stockPage - 1) * stockPageSize + 1} to {Math.min(stockPage * stockPageSize, stockTotal)} of{" "}
              {stockTotal} entries
            </span>
            <Pagination
              current={stockPage}
              total={stockTotal}
              pageSize={stockPageSize}
              onChange={(p) => setStockPage(p)}
              className="text-[12px] [font-family:var(--font-dmsans)]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
