"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeftRight,
  Package,
  Plus,
  TrendingUp,
  Upload,
  XCircle,
} from "lucide-react";
import LocationCards from "./LocationCards";
import StockTable from "./StockTable";
import MovementsLog from "./MovementsLog";
import StockTransfersTable from "./StockTransfersTable";
import RecordMovementModal from "./RecordMovementModal";
import ImportStockModal from "./ImportStockModal";
import StockTransferModal from "./StockTransferModal";
import { useAllMovements, useAllStock, useLocationSummaries, useStockTransfers } from "@/hooks/useInventory";
import type {
  LocationSummary,
  MovementRow,
  StockFilter,
  StockOverviewRow,
} from "@/types/inventory";

interface StockOverviewProps {
  initialStock?: { stock: StockOverviewRow[]; pagination: any };
  initialSummaries?: LocationSummary[];
  initialMovements?: { items: MovementRow[]; pagination: any };
}

export default function StockOverview({
  initialStock = { stock: [], pagination: { total: 0 } },
  initialSummaries = [],
  initialMovements = { items: [], pagination: { total: 0 } },
}: StockOverviewProps) {
  const qc = useQueryClient();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"overview" | "movements" | "transfers">(
    "overview",
  );
  const [showTransferModal, setShowTransferModal] = useState(false);
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

  const [movementsPage, setMovementsPage] = useState(1);
  const movementsPageSize = 20;
  const [movTypeFilter, setMovTypeFilter] = useState<any>("ALL");
  const { data: movements = { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } } } =
    useAllMovements(
      {
        page: movementsPage,
        pageSize: movementsPageSize,
        movement_type: movTypeFilter !== "ALL" ? movTypeFilter : undefined,
      },
      initialMovements,
    );

  const [transferPage, setTransferPage] = useState(1);
  const transferPageSize = 20;
  const { data: transfers = { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } } } =
    useStockTransfers({
      page: transferPage,
      pageSize: transferPageSize,
    });

  const [movementTarget, setMovementTarget] = useState<StockOverviewRow | null>(null);
  const [showImport, setShowImport] = useState(false);

  const filteredStock = useMemo(() => {
    const searchTerm = filter.search.trim().toLowerCase();
    return stock.filter((row) => {
      const matchesSearch =
        !searchTerm ||
        row.product_name.toLowerCase().includes(searchTerm) ||
        row.product_code.toLowerCase().includes(searchTerm);
      const matchesLocation =
        filter.location_id == null || row.location_id === filter.location_id;
      const matchesStatus = filter.status === "all" || row.status === filter.status;
      return matchesSearch && matchesLocation && matchesStatus;
    });
  }, [stock, filter.search, filter.location_id, filter.status]);

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

  const handleMovementSaved = () => {
    qc.invalidateQueries({ queryKey: ["stock"] });
    qc.invalidateQueries({ queryKey: ["movements"] });
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
          delta={
            movements.pagination.total > 0
              ? `${movements.pagination.total} stock movements recorded`
              : "No stock movements recorded"
          }
          deltaVariant={movements.pagination.total > 0 ? "up" : "neutral"}
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

      <div className="flex items-center justify-between">
        <div className="flex gap-0.5 bg-stone-100 rounded-lg p-1 w-fit">
          {(["overview", "movements", "transfers"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {tab === "overview"
                ? "Stock Overview"
                : tab === "movements"
                  ? "Movements Log"
                  : "Transfer Records"}
            </button>
          ))}
        </div>

        {(activeTab === "overview" || activeTab === "transfers") && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowTransferModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors"
            >
              <ArrowLeftRight size={13} /> Transfer Stock
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
            >
              <Upload size={13} /> Import Stock
            </button>
            <button
              onClick={() => router.push("/stock-entries/new")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors"
            >
              <Plus size={13} /> New Stock Entry
            </button>
          </div>
        )}
      </div>

      {activeTab === "overview" && (
        <StockTable
          rows={paginatedStock}
          filter={filter}
          onFilterChange={(f) => {
            setFilter(f);
            setPage(1);
          }}
          onRecordMovement={setMovementTarget}
          onNewStockEntry={() => router.push("/stock-entries/new")}
          pagination={{
            page,
            pageSize,
            total: filteredStock.length,
            setPage,
          }}
        />
      )}

      {activeTab === "movements" && (
        <MovementsLog
          movements={movements.items}
          filterType={movTypeFilter}
          onFilterChange={(t) => {
            setMovTypeFilter(t);
            setMovementsPage(1);
          }}
          pagination={{
            page: movementsPage,
            pageSize: movementsPageSize,
            total: movements.pagination.total,
            setPage: setMovementsPage,
          }}
        />
      )}

      {activeTab === "transfers" && (
        <StockTransfersTable
          rows={transfers.items}
          onCreateTransfer={() => setShowTransferModal(true)}
          pagination={{
            page: transferPage,
            pageSize: transferPageSize,
            total: transfers.pagination.total,
            setPage: setTransferPage,
          }}
        />
      )}

      {movementTarget && (
        <RecordMovementModal
          row={movementTarget}
          onClose={() => setMovementTarget(null)}
          onSaved={handleMovementSaved}
        />
      )}

      {showImport && (
        <ImportStockModal
          onClose={() => setShowImport(false)}
          onSaved={() => {
            setShowImport(false);
            qc.invalidateQueries({ queryKey: ["stock"] });
          }}
        />
      )}

      {showTransferModal && (
        <StockTransferModal
          onClose={() => setShowTransferModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["stock"] });
            qc.invalidateQueries({ queryKey: ["movements"] });
            qc.invalidateQueries({ queryKey: ["stock-transfers"] });
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
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 mb-1">{label}</p>
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
