"use client";

import { Fragment, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  PackageSearch,
  RotateCcw,
} from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import { exportToCsv } from "@/lib/exportCsv";

type PeriodType = "daily" | "monthly" | "yearly" | "custom";
type ActiveTab = "product" | "location";

type ProductPerformanceRow = {
  productId: number;
  productCode: string;
  productName: string;
  packSize: string;
  categoryName: string;
  grossQty: number;
  returnedQty: number;
  netQty: number;
  grossRevenue: number;
  returnedRevenue: number;
  netRevenue: number;
  invoiceCount: number;
  locationBreakdown: Array<{
    locationId: number;
    locationCode: string;
    locationName: string;
    netRevenue: number;
    netQty: number;
  }>;
};

type LocationPerformanceRow = {
  locationId: number;
  locationCode: string;
  locationName: string;
  grossRevenue: number;
  returnedRevenue: number;
  netRevenue: number;
  grossQty: number;
  returnedQty: number;
  netQty: number;
  invoiceCount: number;
  topProductName: string | null;
};

type ProductPerformanceResponse = {
  period: { startDate: string; endDate: string; label: string };
  totals: {
    grossRevenue: number;
    returnedRevenue: number;
    netRevenue: number;
    grossQty: number;
    returnedQty: number;
    netQty: number;
    invoiceCount: number;
  };
  productPerformance: ProductPerformanceRow[];
  locationPerformance: LocationPerformanceRow[];
};

type LocationOption = { id: number; code: string; label: string };
type ProductOption = { id: number; code: string; name: string };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthISO() {
  return new Date().toISOString().slice(0, 7);
}

function yearISO() {
  return String(new Date().getFullYear());
}

const LOCATION_COLORS = [
  "#1a5c2e",
  "#2b2d7e",
  "#0f766e",
  "#b45309",
  "#b91c1c",
  "#475569",
];

export default function ProductPerformancePage() {
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [date, setDate] = useState(todayISO());
  const [month, setMonth] = useState(monthISO());
  const [year, setYear] = useState(yearISO());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [locationId, setLocationId] = useState<string>("all");
  const [productId, setProductId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<ActiveTab>("product");
  const [expandedProductIds, setExpandedProductIds] = useState<Set<number>>(new Set());

  const filters = useMemo(
    () => ({ periodType, date, month, year, from, to, locationId, productId }),
    [periodType, date, month, year, from, to, locationId, productId],
  );

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("periodType", filters.periodType);
    if (filters.periodType === "daily") sp.set("date", filters.date);
    if (filters.periodType === "monthly") sp.set("month", filters.month);
    if (filters.periodType === "yearly") sp.set("year", filters.year);
    if (filters.periodType === "custom") {
      sp.set("from", filters.from);
      sp.set("to", filters.to);
    }
    sp.set("locationId", filters.locationId);
    sp.set("productId", filters.productId);
    return sp.toString();
  }, [filters]);

  const performanceQuery = useQuery({
    queryKey: ["product-performance", filters],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/product-performance?${queryString}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as ProductPerformanceResponse | { error?: string };
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Failed to load product performance.");
      }
      return data as ProductPerformanceResponse;
    },
  });

  const locationOptionsQuery = useQuery({
    queryKey: ["inventory-locations-filter"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/locations", { cache: "no-store" });
      const data = await res.json();
      const locations = (data?.data ?? []) as Array<{ id: number; code: string; label: string }>;
      return locations.map((l) => ({ id: l.id, code: l.code, label: l.label })) as LocationOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const productOptionsQuery = useQuery({
    queryKey: ["product-options-filter"],
    queryFn: async () => {
      const res = await fetch("/api/products?page=1&pageSize=5000", { cache: "no-store" });
      const data = await res.json();
      const products = (data?.products ?? []) as Array<{
        product_id: number;
        product_code: string;
        product_name: string;
      }>;
      return products.map((p) => ({
        id: p.product_id,
        code: p.product_code,
        name: p.product_name,
      })) as ProductOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const locationOptions = locationOptionsQuery.data ?? [];
  const productOptions = productOptionsQuery.data ?? [];
  const report = performanceQuery.data;

  const locationColumns: ColumnDef<LocationPerformanceRow>[] = [
    {
      accessorKey: "locationName",
      header: "Location",
      cell: ({ row }) => (
        <div>
          <p className="text-stone-800 font-medium">{row.original.locationName}</p>
          <p className="text-[11px] text-stone-500 [font-family:var(--font-jetbrains)]">
            {row.original.locationCode}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "topProductName",
      header: "Top Product",
      cell: ({ row }) => <span className="text-stone-700">{row.original.topProductName ?? "-"}</span>,
    },
    {
      accessorKey: "netQty",
      header: "Net Qty",
      cell: ({ row }) => <span className="text-stone-700">{row.original.netQty}</span>,
      meta: { align: "right" },
    },
    {
      accessorKey: "returnedQty",
      header: "Returned Qty",
      cell: ({ row }) => <span className="text-red-700">{row.original.returnedQty}</span>,
      meta: { align: "right" },
    },
    {
      accessorKey: "netRevenue",
      header: "Net Revenue",
      cell: ({ row }) => (
        <span className={row.original.netRevenue < 0 ? "text-red-700 font-medium" : "text-emerald-700 font-medium"}>
          {formatCurrency(row.original.netRevenue)}
        </span>
      ),
      meta: { align: "right" },
    },
    {
      accessorKey: "invoiceCount",
      header: "Invoices",
      cell: ({ row }) => <span className="text-stone-700">{row.original.invoiceCount}</span>,
      meta: { align: "right" },
    },
  ];

  const topProducts = (report?.productPerformance ?? []).slice(0, 10);
  const chartLocationKeys = Array.from(
    new Set(
      topProducts.flatMap((p) => p.locationBreakdown.map((l) => l.locationCode)),
    ),
  );

  const productRevenueByLocationData = topProducts.map((p) => {
    const row: Record<string, number | string> = { name: p.productCode };
    for (const loc of p.locationBreakdown) {
      row[`loc_${loc.locationCode}`] = loc.netRevenue;
    }
    return row;
  });

  const productCountByLocationData = topProducts.map((p) => {
    const row: Record<string, number | string> = { name: p.productCode };
    for (const loc of p.locationBreakdown) {
      row[`loc_${loc.locationCode}`] = loc.netQty;
    }
    return row;
  });

  const resetFilters = () => {
    setPeriodType("monthly");
    setDate(todayISO());
    setMonth(monthISO());
    setYear(yearISO());
    setFrom(todayISO());
    setTo(todayISO());
    setLocationId("all");
    setProductId("all");
    setExpandedProductIds(new Set());
  };

  const toggleExpandedProduct = (productIdToToggle: number) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productIdToToggle)) {
        next.delete(productIdToToggle);
      } else {
        next.add(productIdToToggle);
      }
      return next;
    });
  };

  const exportCurrentTable = () => {
    if (!report) return;

    if (activeTab === "product") {
      const headers = [
        "Product Code",
        "Product Name",
        "Category",
        "Gross Qty",
        "Returned Qty",
        "Net Qty",
        "Gross Revenue (LKR)",
        "Returned Revenue (LKR)",
        "Net Revenue (LKR)",
        "Invoice Count",
      ];
      const rows = report.productPerformance.map((row) => [
        row.productCode,
        row.productName,
        row.categoryName,
        String(row.grossQty),
        String(row.returnedQty),
        String(row.netQty),
        row.grossRevenue.toFixed(2),
        row.returnedRevenue.toFixed(2),
        row.netRevenue.toFixed(2),
        String(row.invoiceCount),
      ]);
      exportToCsv(`agrinova-product-performance-product-wise-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
      return;
    }

    const headers = [
      "Location Code",
      "Location Name",
      "Top Product",
      "Gross Qty",
      "Returned Qty",
      "Net Qty",
      "Gross Revenue (LKR)",
      "Returned Revenue (LKR)",
      "Net Revenue (LKR)",
      "Invoice Count",
    ];
    const rows = report.locationPerformance.map((row) => [
      row.locationCode,
      row.locationName,
      row.topProductName ?? "",
      String(row.grossQty),
      String(row.returnedQty),
      String(row.netQty),
      row.grossRevenue.toFixed(2),
      row.returnedRevenue.toFixed(2),
      row.netRevenue.toFixed(2),
      String(row.invoiceCount),
    ]);
    exportToCsv(`agrinova-product-performance-location-wise-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.13em] text-stone-400 font-semibold [font-family:var(--font-dmsans)]">
            Sales Reports
          </p>
          <h1 className="text-[28px] leading-tight text-stone-900 font-semibold [font-family:var(--font-dmsans)] mt-1">
            Product Performance
          </h1>
          <p className="text-[13px] text-stone-500 mt-1 [font-family:var(--font-dmsans)]">
            Net sales performance by product and location for the selected period.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50"
          >
            <RotateCcw size={13} />
            Reset Filters
          </button>
          <button
            type="button"
            onClick={exportCurrentTable}
            disabled={!report}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Period Type</span>
            <select
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700"
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          {periodType === "daily" && (
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Date</span>
              <input
                type="date"
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          )}

          {periodType === "monthly" && (
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Month</span>
              <input
                type="month"
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </label>
          )}

          {periodType === "yearly" && (
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Year</span>
              <input
                type="number"
                min="2000"
                max="2100"
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </label>
          )}

          {periodType === "custom" && (
            <>
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">From</span>
                <input
                  type="date"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">To</span>
                <input
                  type="date"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </>
          )}

          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Location</span>
            <select
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="all">All Locations</option>
              {locationOptions.map((loc) => (
                <option key={loc.id} value={String(loc.id)}>
                  {loc.code} - {loc.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Product</span>
            <select
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="all">All Products</option>
              {productOptions.map((prod) => (
                <option key={prod.id} value={String(prod.id)}>
                  {prod.code} - {prod.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
              <Filter size={12} />
              {report?.period.label ?? "Select filters"}
            </div>
          </div>
        </div>
      </section>

      {performanceQuery.isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-[98px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
            ))}
          </div>
          <div className="h-[300px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
          <div className="h-[360px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
        </div>
      ) : performanceQuery.error ? (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] [font-family:var(--font-dmsans)]">
          {(performanceQuery.error as Error).message}
        </div>
      ) : !report ? (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[13px] [font-family:var(--font-dmsans)]">
          No product performance data available.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="Net Sales" value={formatCurrency(report.totals.netRevenue)} icon={<BarChart3 size={16} className="text-emerald-600" />} />
            <KpiCard label="Gross Sales" value={formatCurrency(report.totals.grossRevenue)} icon={<Boxes size={16} className="text-blue-600" />} />
            <KpiCard label="Returns" value={formatCurrency(report.totals.returnedRevenue)} icon={<RotateCcw size={16} className="text-red-600" />} />
            <KpiCard label="Net Units" value={String(report.totals.netQty)} icon={<PackageSearch size={16} className="text-amber-600" />} />
            <KpiCard label="Invoices" value={String(report.totals.invoiceCount)} icon={<Filter size={16} className="text-stone-700" />} />
          </div>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
            <div className="space-y-3">
              <div className="h-[290px] rounded-xl border border-stone-200 p-3">
                <p className="mb-2 text-[12px] font-medium text-stone-700">Net Revenue (LKR) by Location</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productRevenueByLocationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edeae1" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                    <Legend />
                    {chartLocationKeys.map((locCode, idx) => (
                      <Bar
                        key={locCode}
                        dataKey={`loc_${locCode}`}
                        stackId="revenue"
                        name={locCode}
                        fill={LOCATION_COLORS[idx % LOCATION_COLORS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[290px] rounded-xl border border-stone-200 p-3">
                <p className="mb-2 text-[12px] font-medium text-stone-700">Net Quantity (Count) by Location</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productCountByLocationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edeae1" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <Tooltip formatter={(value) => Number(value ?? 0)} />
                    <Legend />
                    {chartLocationKeys.map((locCode, idx) => (
                      <Bar
                        key={locCode}
                        dataKey={`loc_${locCode}`}
                        stackId="count"
                        name={locCode}
                        fill={LOCATION_COLORS[idx % LOCATION_COLORS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
                Performance Table
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("product")}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border ${
                    activeTab === "product"
                      ? "bg-green-700 text-white border-green-700"
                      : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  Product Wise
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("location")}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border ${
                    activeTab === "location"
                      ? "bg-green-700 text-white border-green-700"
                      : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  Location Wise
                </button>
              </div>
            </div>
          </section>

          {activeTab === "product" ? (
            <ProductWiseExpandableTable
              data={report.productPerformance}
              expandedProductIds={expandedProductIds}
              onToggle={toggleExpandedProduct}
            />
          ) : (
            <DataTable
              data={report.locationPerformance}
              columns={locationColumns}
              minWidth={980}
              searchPlaceholder="Search location..."
              emptyMessage="No locations found for selected filters."
            />
          )}
        </>
      )}
    </div>
  );
}

function ProductWiseExpandableTable({
  data,
  expandedProductIds,
  onToggle,
}: {
  data: ProductPerformanceRow[];
  expandedProductIds: Set<number>;
  onToggle: (productId: number) => void;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white px-4 py-10 text-center text-[13px] text-stone-500">
        No products found for selected filters.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[14px]" style={{ minWidth: "980px" }}>
          <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.1em] text-stone-500">
            <tr>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Product</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Category</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium text-right">Net Qty</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium text-right">Returned Qty</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium text-right">Net Revenue</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium text-right">Invoices</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isExpanded = expandedProductIds.has(row.productId);
              return (
                <Fragment key={row.productId}>
                  <tr key={row.productId} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-stone-800 font-medium">{row.productName}</p>
                        <p className="text-[11px] text-stone-500 [font-family:var(--font-jetbrains)]">
                          {row.productCode} | {row.packSize}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-700">{row.categoryName}</td>
                    <td className="px-4 py-3 text-right text-stone-700">{row.netQty}</td>
                    <td className="px-4 py-3 text-right text-red-700">{row.returnedQty}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={row.netRevenue < 0 ? "text-red-700 font-medium" : "text-emerald-700 font-medium"}>
                        {formatCurrency(row.netRevenue)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-stone-700">{row.invoiceCount}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onToggle(row.productId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1 text-[12px] text-stone-700 hover:bg-stone-50"
                      >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        {isExpanded ? "Hide" : "Show"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${row.productId}-details`} className="border-b border-stone-100 bg-stone-50/70">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                          <table className="w-full border-collapse text-[12.5px]">
                            <thead className="bg-stone-50 text-[10.5px] uppercase tracking-[0.08em] text-stone-500">
                              <tr>
                                <th className="px-3 py-2 text-left">Location</th>
                                <th className="px-3 py-2 text-right">Net Qty</th>
                                <th className="px-3 py-2 text-right">Net Revenue</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.locationBreakdown.map((loc) => (
                                <tr key={`${row.productId}-${loc.locationId}`} className="border-t border-stone-100">
                                  <td className="px-3 py-2 text-stone-700">
                                    {loc.locationCode} - {loc.locationName}
                                  </td>
                                  <td className="px-3 py-2 text-right text-stone-700">{loc.netQty}</td>
                                  <td className="px-3 py-2 text-right text-emerald-700 font-medium">
                                    {formatCurrency(loc.netRevenue)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10.5px] uppercase tracking-[0.09em] text-stone-400 font-semibold [font-family:var(--font-dmsans)]">
          {label}
        </p>
        <p className="text-[20px] leading-tight text-stone-900 font-semibold [font-family:var(--font-dmsans)] mt-1">
          {value}
        </p>
      </div>
    </div>
  );
}
