"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Filter, Play, RotateCcw } from "lucide-react";
import DataTable from "@/components/ui/DataTable";

type PeriodType = "daily" | "monthly" | "yearly" | "custom";

type ReportRow = {
  productId: number;
  itemCode: string;
  name: string;
  packSize: string;
  qty: number;
  freeQty: number;
  unitPrice: number;
  grossAmount: number;
  discount: number;
  netAmount: number;
};

type ReportResponse = {
  period: { startDate: string; endDate: string; label: string };
  totals: {
    qty: number;
    freeQty: number;
    grossAmount: number;
    discount: number;
    netAmount: number;
  };
  rows: ReportRow[];
};

type SalesRepOption = { rep_id: number; full_name: string };
type LocationOption = { id: number; code: string; label: string };
type CustomerOption = { customer_id: number; name: string };
type ProductOption = { product_id: number; product_code: string; product_name: string };

type FilterState = {
  periodType: PeriodType;
  date: string;
  month: string;
  year: string;
  from: string;
  to: string;
  repId: string;
  locationId: string;
  customerId: string;
  productId: string;
};

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

const buildQueryString = (filters: FilterState) => {
  const sp = new URLSearchParams();
  sp.set("periodType", filters.periodType);
  if (filters.periodType === "daily") sp.set("date", filters.date);
  if (filters.periodType === "monthly") sp.set("month", filters.month);
  if (filters.periodType === "yearly") sp.set("year", filters.year);
  if (filters.periodType === "custom") {
    sp.set("from", filters.from);
    sp.set("to", filters.to);
  }
  sp.set("repId", filters.repId);
  sp.set("locationId", filters.locationId);
  sp.set("customerId", filters.customerId);
  sp.set("productId", filters.productId);
  return sp.toString();
};

export default function SalesRepSalesClient() {
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [date, setDate] = useState(todayISO());
  const [month, setMonth] = useState(monthISO());
  const [year, setYear] = useState(yearISO());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [repId, setRepId] = useState("all");
  const [locationId, setLocationId] = useState("all");
  const [customerId, setCustomerId] = useState("all");
  const [productId, setProductId] = useState("all");
  const [appliedFilters, setAppliedFilters] = useState<FilterState | null>(null);

  const currentFilters = useMemo(
    () => ({
      periodType,
      date,
      month,
      year,
      from,
      to,
      repId,
      locationId,
      customerId,
      productId,
    }),
    [periodType, date, month, year, from, to, repId, locationId, customerId, productId],
  );

  const queryString = useMemo(
    () => (appliedFilters ? buildQueryString(appliedFilters) : ""),
    [appliedFilters],
  );

  const reportQuery = useQuery({
    queryKey: ["sales-rep-sales-item-report", queryString],
    enabled: appliedFilters !== null,
    queryFn: async () => {
      const response = await fetch(`/api/sales-rep-sales?${queryString}`, { cache: "no-store" });
      const data = (await response.json()) as ReportResponse | { error?: string };
      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "Failed to load sales report.");
      }
      return data as ReportResponse;
    },
  });

  const repsQuery = useQuery({
    queryKey: ["sales-reps-filter-sales-rep-sales-new"],
    queryFn: async () => {
      const response = await fetch("/api/sales-reps", { cache: "no-store" });
      const data = await response.json();
      return (data.salesReps ?? []) as SalesRepOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const locationsQuery = useQuery({
    queryKey: ["inventory-locations-filter-sales-rep-sales-new"],
    queryFn: async () => {
      const response = await fetch("/api/inventory/locations", { cache: "no-store" });
      const data = await response.json();
      return (data.data ?? []) as LocationOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const customersQuery = useQuery({
    queryKey: ["customers-filter-sales-rep-sales-new"],
    queryFn: async () => {
      const response = await fetch("/api/customers", { cache: "no-store" });
      const data = await response.json();
      return (data.customers ?? []) as CustomerOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const productsQuery = useQuery({
    queryKey: ["products-filter-sales-rep-sales-new"],
    queryFn: async () => {
      const response = await fetch("/api/products?page=1&pageSize=5000", { cache: "no-store" });
      const data = await response.json();
      return (data.products ?? []) as ProductOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const columns: ColumnDef<ReportRow>[] = [
    {
      accessorKey: "itemCode",
      header: "Item Code",
      cell: ({ row }) => (
        <span className="text-stone-700 [font-family:var(--font-jetbrains)]">{row.original.itemCode}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <span className="text-stone-800 font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "packSize",
      header: "Pack Size",
      cell: ({ row }) => <span className="text-stone-700">{row.original.packSize}</span>,
    },
    {
      accessorKey: "qty",
      header: "Qty",
      cell: ({ row }) => <span>{row.original.qty}</span>,
      meta: { align: "right" },
    },
    {
      accessorKey: "freeQty",
      header: "Free Qty",
      cell: ({ row }) => <span>{row.original.freeQty}</span>,
      meta: { align: "right" },
    },
    {
      accessorKey: "unitPrice",
      header: "Unit Price",
      cell: ({ row }) => <span>{formatCurrency(row.original.unitPrice)}</span>,
      meta: { align: "right" },
    },
    {
      accessorKey: "grossAmount",
      header: "Gross Amount",
      cell: ({ row }) => <span>{formatCurrency(row.original.grossAmount)}</span>,
      meta: { align: "right" },
    },
    {
      accessorKey: "discount",
      header: "Discount",
      cell: ({ row }) => <span className="text-amber-700">{formatCurrency(row.original.discount)}</span>,
      meta: { align: "right" },
    },
    {
      accessorKey: "netAmount",
      header: "Net Amount",
      cell: ({ row }) => <span className="text-emerald-700 font-medium">{formatCurrency(row.original.netAmount)}</span>,
      meta: { align: "right" },
    },
  ];

  const resetFilters = () => {
    setPeriodType("monthly");
    setDate(todayISO());
    setMonth(monthISO());
    setYear(yearISO());
    setFrom(todayISO());
    setTo(todayISO());
    setRepId("all");
    setLocationId("all");
    setCustomerId("all");
    setProductId("all");
    setAppliedFilters(null);
  };

  const applyFilters = () => {
    setAppliedFilters(currentFilters);
  };

  const report = reportQuery.data;

  const getLabelById = (
    id: string,
    allLabel: string,
    items: Array<{ id: number; label: string }>,
  ) => {
    if (id === "all") return allLabel;
    const parsed = Number(id);
    const match = items.find((item) => item.id === parsed);
    return match?.label ?? allLabel;
  };

  const exportExcel = async () => {
    if (!report || !appliedFilters) return;
    const { exportSalesRepSalesToExcel } = await import("@/lib/exportSalesRepSales");

    const repLabel = getLabelById(
      appliedFilters.repId,
      "All Reps",
      (repsQuery.data ?? []).map((rep) => ({ id: rep.rep_id, label: rep.full_name })),
    );

    const locationLabel = getLabelById(
      appliedFilters.locationId,
      "All Locations",
      (locationsQuery.data ?? []).map((location) => ({
        id: location.id,
        label: `${location.code} - ${location.label}`,
      })),
    );

    const customerLabel = getLabelById(
      appliedFilters.customerId,
      "All Customers",
      (customersQuery.data ?? []).map((customer) => ({
        id: customer.customer_id,
        label: customer.name,
      })),
    );

    const productLabel = getLabelById(
      appliedFilters.productId,
      "All Products",
      (productsQuery.data ?? []).map((product) => ({
        id: product.product_id,
        label: `${product.product_code} - ${product.product_name}`,
      })),
    );

    await exportSalesRepSalesToExcel({
      periodLabel: report.period.label,
      repLabel,
      locationLabel,
      customerLabel,
      productLabel,
      rows: report.rows,
    });
  };

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.13em] text-stone-400 font-semibold">Product Sale</p>
          <h1 className="text-[28px] leading-tight text-stone-900 font-semibold mt-1">Product Sale Details</h1>
          <p className="text-[13px] text-stone-500 mt-1">
            Generate invoice-line product sale details by rep, location, customer, and product.
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
            onClick={applyFilters}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a5c2e] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#2d7a42]"
          >
            <Play size={13} />
            Generate
          </button>
          <button
            type="button"
            onClick={exportExcel}
            disabled={!report || report.rows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={13} />
            Export Excel
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Period Type</span>
            <select
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]"
              value={periodType}
              onChange={(event) => setPeriodType(event.target.value as PeriodType)}
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
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]"
              />
            </label>
          )}

          {periodType === "monthly" && (
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Month</span>
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]"
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
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]"
              />
            </label>
          )}

          {periodType === "custom" && (
            <>
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">From</span>
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">To</span>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]"
                />
              </label>
            </>
          )}

          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Sales Rep</span>
            <select
              value={repId}
              onChange={(event) => setRepId(event.target.value)}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]"
            >
              <option value="all">All Reps</option>
              {(repsQuery.data ?? []).map((rep) => (
                <option key={rep.rep_id} value={String(rep.rep_id)}>
                  {rep.full_name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Location</span>
            <select
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]"
            >
              <option value="all">All Locations</option>
              {(locationsQuery.data ?? []).map((location) => (
                <option key={location.id} value={String(location.id)}>
                  {location.code} - {location.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Customer</span>
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]"
            >
              <option value="all">All Customers</option>
              {(customersQuery.data ?? []).map((customer) => (
                <option key={customer.customer_id} value={String(customer.customer_id)}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Product</span>
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]"
            >
              <option value="all">All Products</option>
              {(productsQuery.data ?? []).map((product) => (
                <option key={product.product_id} value={String(product.product_id)}>
                  {product.product_code} - {product.product_name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end text-[12px] text-stone-500">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
              <Filter size={12} />
              {report?.period.label ?? "Click Generate to load report"}
            </div>
          </div>
        </div>
      </section>

      {appliedFilters === null ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-10 text-center text-[13px] text-stone-500">
          Set filters and click Generate to load the sales table.
        </div>
      ) : reportQuery.isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-[90px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
            ))}
          </div>
          <div className="h-[320px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
        </div>
      ) : reportQuery.error ? (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
          {(reportQuery.error as Error).message}
        </div>
      ) : !report ? (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[13px]">
          No report data available.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Qty" value={String(report.totals.qty)} />
            <MetricCard label="Free Qty" value={String(report.totals.freeQty)} />
            <MetricCard label="Gross Amount" value={formatCurrency(report.totals.grossAmount)} />
            <MetricCard label="Discount" value={formatCurrency(report.totals.discount)} />
            <MetricCard label="Net Amount" value={formatCurrency(report.totals.netAmount)} />
          </div>

          <DataTable
            data={report.rows}
            columns={columns}
            minWidth={1300}
            hideSearch
            emptyMessage="No items found for selected filters."
          />
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4">
      <p className="text-[10.5px] uppercase tracking-[0.09em] text-stone-400 font-semibold">{label}</p>
      <p className="text-[20px] leading-tight text-stone-900 font-semibold mt-1">{value}</p>
    </div>
  );
}
