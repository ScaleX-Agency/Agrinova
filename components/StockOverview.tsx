"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  Download,
  Loader2,
  Package,
  Plus,
  TrendingUp,
  XCircle,
} from "lucide-react";
import LocationCards from "./LocationCards";
import StockTable from "./StockTable";
import StockTransferModal from "./StockTransferModal";
import ProductRepackModal from "./ProductRepackModal";
import { useAllStock, useLocationSummaries } from "@/hooks/useInventory";
import { exportStockToExcel } from "@/lib/exportStock";
import type {
  LocationSummary,
  StockFilter,
  StockOverviewRow,
} from "@/types/inventory";

interface StockOverviewProps {
  initialStock?: {
    stock: StockOverviewRow[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  };
  initialSummaries?: LocationSummary[];
}

export default function StockOverview({
  initialStock = { stock: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } },
  initialSummaries = [],
}: StockOverviewProps) {
  const qc = useQueryClient();
  const router = useRouter();

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRepackModal, setShowRepackModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [filter, setFilter] = useState<StockFilter>({
    location_id: null,
    search: "",
    status: "all",
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const { data: stockResponse = { stock: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } } } =
    useAllStock({ page: 1, pageSize: 10000 }, initialStock);
  const stock = stockResponse.stock;
  const { data: summaries = [] } = useLocationSummaries(initialSummaries);

  const displayStock = useMemo(() => {
    if (filter.location_id !== null) {
      return stock.filter((row) => row.location_id === filter.location_id);
    }

    const grouped = new Map<number, StockOverviewRow>();
    for (const row of stock) {
      const existing = grouped.get(row.product_id);
      if (!existing) {
        grouped.set(row.product_id, {
          ...row,
          stock_id: -row.product_id,
          location_id: 0,
          location_code: "All Locations",
          location_name: "All Locations",
          is_aggregate: true,
        });
        continue;
      }

      const nextQty = existing.quantity_on_hand + row.quantity_on_hand;
      grouped.set(row.product_id, {
        ...existing,
        quantity_on_hand: nextQty,
        status:
          nextQty <= 0
            ? "out"
            : nextQty < existing.reorder_threshold
              ? "low"
              : "ok",
      });
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.product_name.localeCompare(b.product_name),
    );
  }, [stock, filter.location_id]);

  const filteredStock = useMemo(() => {
    const searchTerm = filter.search.trim().toLowerCase();
    return displayStock.filter((row) => {
      const matchesSearch =
        !searchTerm ||
        row.product_name.toLowerCase().includes(searchTerm) ||
        row.product_code.toLowerCase().includes(searchTerm);
      const matchesStatus = filter.status === "all" || row.status === filter.status;
      return matchesSearch && matchesStatus;
    });
  }, [displayStock, filter.search, filter.status]);

  const paginatedStock = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStock.slice(start, start + pageSize);
  }, [filteredStock, page, pageSize]);

  const stats = useMemo(
    () => ({
      totalProducts:
        summaries.reduce((acc, s) => acc + s.total_products, 0) ||
        stockResponse.pagination.total,
      totalUnits: summaries.reduce((acc, s) => acc + Number(s.total_units), 0),
      lowCount: summaries.reduce((acc, s) => acc + Number(s.low_count), 0),
      outCount: summaries.reduce((acc, s) => acc + Number(s.out_count), 0),
    }),
    [summaries, stockResponse.pagination.total],
  );

  const computeDisplayStock = (
    sourceRows: StockOverviewRow[],
    selectedLocationId: number | null,
  ) => {
    if (selectedLocationId !== null) {
      return sourceRows.filter((row) => row.location_id === selectedLocationId);
    }

    const grouped = new Map<number, StockOverviewRow>();
    for (const row of sourceRows) {
      const existing = grouped.get(row.product_id);
      if (!existing) {
        grouped.set(row.product_id, {
          ...row,
          stock_id: -row.product_id,
          location_id: 0,
          location_code: "All Locations",
          location_name: "All Locations",
          is_aggregate: true,
        });
        continue;
      }

      const nextQty = existing.quantity_on_hand + row.quantity_on_hand;
      grouped.set(row.product_id, {
        ...existing,
        quantity_on_hand: nextQty,
        status: nextQty <= 0 ? "out" : nextQty < existing.reorder_threshold ? "low" : "ok",
      });
    }

    return Array.from(grouped.values()).sort((a, b) => a.product_name.localeCompare(b.product_name));
  };

  const applyFilters = (sourceRows: StockOverviewRow[]) => {
    const searchTerm = filter.search.trim().toLowerCase();
    return sourceRows.filter((row) => {
      const matchesSearch =
        !searchTerm ||
        row.product_name.toLowerCase().includes(searchTerm) ||
        row.product_code.toLowerCase().includes(searchTerm);
      const matchesStatus = filter.status === "all" || row.status === filter.status;
      return matchesSearch && matchesStatus;
    });
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/inventory?page=1&pageSize=10000", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to refresh stock before export");
      }

      const data = (await res.json()) as { stock?: StockOverviewRow[] };
      const freshStock = data.stock ?? [];
      const freshDisplay = computeDisplayStock(freshStock, filter.location_id);
      const freshFiltered = applyFilters(freshDisplay);

      exportStockToExcel({ rows: freshFiltered });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: {
              msg: `Exported ${freshFiltered.length} rows to Excel`,
              type: "success",
            },
          }),
        );
      }

      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["summaries"] });
    } catch (error) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: {
              msg: error instanceof Error ? error.message : "Failed to export Excel",
              type: "error",
            },
          }),
        );
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Total Products"
          value={stats.totalProducts}
          delta={`${summaries.length} locations tracked`}
          deltaVariant="neutral"
          icon={<Package size={18} className="text-green-700" />}
          iconBg="bg-green-50"
        />
        <StatCard
          label="Total Units"
          value={stats.totalUnits.toLocaleString()}
          delta="Across active inventory locations"
          deltaVariant="neutral"
          icon={<TrendingUp size={18} className="text-blue-800" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Low Stock"
          value={stats.lowCount}
          delta={`${stats.lowCount} below threshold`}
          deltaVariant={stats.lowCount > 0 ? "warn" : "up"}
          icon={<AlertTriangle size={18} className="text-amber-800" />}
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Out of Stock"
          value={stats.outCount}
          delta={`${stats.outCount} need restocking`}
          deltaVariant={stats.outCount > 0 ? "danger" : "up"}
          icon={<XCircle size={18} className="text-red-800" />}
          iconBg="bg-red-50"
        />
      </div>

      <LocationCards
        summaries={summaries}
        selectedId={filter.location_id}
        onSelect={(id) => {
          setFilter((f) => ({
            ...f,
            location_id: f.location_id === id ? null : id,
          }));
          setPage(1);
        }}
      />

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={handleExportExcel}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-green-700 transition-colors"
        >
          {isExporting ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Exporting...
            </>
          ) : (
            <>
              <Download size={13} /> Export Excel
            </>
          )}
        </button>
        <button
          onClick={() => setShowRepackModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors"
        >
          <Boxes size={13} /> Repack Product
        </button>
        <button
          onClick={() => setShowTransferModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors"
        >
          <ArrowLeftRight size={13} /> Transfer Stock
        </button>
        <button
          onClick={() => router.push("/stock-entries/new")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors"
        >
          <Plus size={13} /> New Stock Entry
        </button>
      </div>

      <StockTable
        rows={paginatedStock}
        filter={filter}
        onFilterChange={(f) => {
          setFilter(f);
          setPage(1);
        }}
        onNewStockEntry={() => router.push("/stock-entries/new")}
        onAdjusted={() => {
          qc.invalidateQueries({ queryKey: ["stock"] });
          qc.invalidateQueries({ queryKey: ["summaries"] });
        }}
        pagination={{
          page,
          pageSize,
          total: filteredStock.length,
          setPage,
        }}
      />

      {showTransferModal && (
        <StockTransferModal
          onClose={() => setShowTransferModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["stock"] });
            qc.invalidateQueries({ queryKey: ["stock-transfers"] });
            qc.invalidateQueries({ queryKey: ["summaries"] });
          }}
        />
      )}

      {showRepackModal && (
        <ProductRepackModal
          onClose={() => setShowRepackModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["stock"] });
            qc.invalidateQueries({ queryKey: ["repacks"] });
            qc.invalidateQueries({ queryKey: ["summaries"] });
          }}
        />
      )}
    </div>
  );
}

type DeltaVariant = "up" | "warn" | "danger" | "neutral";

const deltaStyles: Record<DeltaVariant, string> = {
  up: "bg-green-50 text-green-700",
  warn: "bg-amber-50 text-amber-800",
  danger: "bg-red-50   text-red-700",
  neutral: "bg-stone-100 text-stone-500",
};

function StatCard({
  label,
  value,
  delta,
  deltaVariant,
  icon,
  iconBg,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaVariant?: DeltaVariant;
  icon: ReactNode;
  iconBg: string;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 flex gap-3 items-start">
      <div className={`${iconBg} w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-900 mb-1">{label}</p>
        <p className="text-2xl font-semibold text-stone-800 leading-none mb-1.5">{value}</p>
        {delta && deltaVariant && (
          <span
            className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${deltaStyles[deltaVariant]}`}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
