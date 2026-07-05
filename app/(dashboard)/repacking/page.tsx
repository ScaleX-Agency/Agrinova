"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { ProductRepackOptionDto, ProductRepacksResponse } from "@/types/api";
import DataTable from "@/components/ui/DataTable";
import ProductRepackModal from "@/components/ProductRepackModal";
import { useLocations } from "@/hooks/useInventory";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const ProductRepacksPage = () => {
  const { data: locations = [] } = useLocations();

  const [showModal, setShowModal] = useState(false);
  const [rangeFilter, setRangeFilter] = useState("year");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const [appliedRange, setAppliedRange] = useState("year");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [appliedLocation, setAppliedLocation] = useState<string>("all");

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);

  const repacksQuery = useQuery<ProductRepacksResponse, Error>({
    queryKey: [
      "repacks",
      appliedRange,
      appliedStart,
      appliedEnd,
      appliedLocation,
      page,
      searchTerm,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedRange !== "all") {
        params.set("range", appliedRange);
        if (appliedRange === "custom") {
          if (appliedStart) params.set("startDate", appliedStart);
          if (appliedEnd) params.set("endDate", appliedEnd);
        }
      }
      if (appliedLocation !== "all") {
        params.set("locationId", appliedLocation);
      }
      params.set("page", String(page + 1));
      params.set("pageSize", "20");
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const query = params.toString();
      const response = await fetch(`/api/repacking?${query}`);
      const result = (await response.json()) as ProductRepacksResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load product repacking records.");
      }
      return result;
    },
  });

  const rows = repacksQuery.data?.data ?? [];
  const pagination = repacksQuery.data?.pagination;

  const columns: ColumnDef<ProductRepackOptionDto>[] = [
    {
      accessorKey: "repackNo",
      header: "Repack #",
      cell: ({ row }) => (
        <span className="font-medium text-[#2b2d7e] [font-family:var(--font-jetbrains)] text-[13px]">
          {row.original.repackNo}
        </span>
      ),
    },
    {
      accessorKey: "repackDate",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-stone-700 text-[13px]">{formatDate(row.original.repackDate)}</span>
      ),
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => (
        <span className="text-stone-700 text-[13px]">
          {row.original.locationCode} - {row.original.locationName}
        </span>
      ),
    },
    {
      id: "sourceProduct",
      header: "Source Product",
      cell: ({ row }) => (
        <div className="flex flex-col text-[13px]">
          <span className="font-semibold text-stone-800">
            {row.original.sourceProductCode}
          </span>
          <span className="text-stone-500 truncate max-w-[200px]" title={row.original.sourceProductName}>
            {row.original.sourceProductName}
          </span>
          <span className="text-[#2b2d7e] font-medium text-[11.5px] mt-0.5">
            Qty: {row.original.sourceQuantity}
          </span>
        </div>
      ),
    },
    {
      id: "targetProduct",
      header: "Target Product",
      cell: ({ row }) => (
        <div className="flex flex-col text-[13px]">
          <span className="font-semibold text-stone-800">
            {row.original.targetProductCode}
          </span>
          <span className="text-stone-500 truncate max-w-[200px]" title={row.original.targetProductName}>
            {row.original.targetProductName}
          </span>
          <span className="text-[#1a5c2e] font-medium text-[11.5px] mt-0.5">
            Qty: {row.original.targetQuantity}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "createdByName",
      header: "Created By",
      cell: ({ row }) => (
        <span className="text-stone-700 text-[13px]">{row.original.createdByName}</span>
      ),
    },
    {
      id: "actions",
      header: "Action",
      enableSorting: false,
      cell: ({ row }) => (
        <Link
          href={`/repacking/${row.original.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#c0c3f0] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#2b2d7e] hover:bg-[#eeeffe] transition-colors"
        >
          <Eye size={12} />
          View
        </Link>
      ),
    },
  ];

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Documents</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-dmsans)] font-semibold">
            Product Repacking
          </h1>
          <p className="text-[13px] text-stone-500">Record and review product repacking operations at your locations.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a5c2e] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#2d7a42] transition-colors self-start md:self-auto"
        >
          <Plus size={15} />
          New Repack
        </button>
      </header>

      <DataTable
        data={rows}
        columns={columns}
        minWidth={1180}
        isLoading={repacksQuery.isLoading}
        searchPlaceholder="Search repack no, source, target, or notes"
        emptyMessage="No product repacking records found."
        initialPageSize={20}
        serverSide={{
          pageIndex: page,
          pageSize: 20,
          pageCount: pagination?.totalPages ?? 1,
          totalRecords: pagination?.total ?? 0,
          onPageChange: (p) => setPage(p),
          searchTerm: searchTerm,
          onSearchChange: (s) => {
            setSearchTerm(s);
            setPage(0);
          },
        }}
        toolbarRight={
          <>
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} - {loc.label}
                </option>
              ))}
            </select>

            <select
              value={rangeFilter}
              onChange={(event) => setRangeFilter(event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
            >
              <option value="all">All Time</option>
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>

            {rangeFilter === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
                />
                <span className="text-[12px] text-stone-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
                />
              </div>
            )}
            <button
              onClick={() => {
                setAppliedRange(rangeFilter);
                setAppliedStart(customStart);
                setAppliedEnd(customEnd);
                setAppliedLocation(locationFilter);
                setPage(0);
              }}
              className="rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#2d7a42] transition-colors"
            >
              Apply Filter
            </button>
          </>
        }
      />

      {repacksQuery.error instanceof Error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 font-medium">
          {repacksQuery.error.message}
        </p>
      )}

      {showModal && (
        <ProductRepackModal
          onClose={() => setShowModal(false)}
          onSaved={() => repacksQuery.refetch()}
        />
      )}
    </section>
  );
};

export default ProductRepacksPage;
