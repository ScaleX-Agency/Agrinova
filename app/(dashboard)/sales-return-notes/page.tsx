"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Search } from "lucide-react";
import DataTable from "@/components/ui/DataTable";

type SalesReturnListRow = {
  returnId: number;
  srnNumber: string;
  srnDate: string;
  grnNumber: string;
  creditNoteNumber: string;
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  locationId: number;
  locationCode: string;
  locationName: string;
  returnAmount: number;
  creditAmount: number;
  createdBy: string;
};

type ListResponse = { data: SalesReturnListRow[] };
type LocationOption = { location_id: number; code: string; name: string };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function SalesReturnNotesPage() {
  const [locationId, setLocationId] = useState("all");
  const [search, setSearch] = useState("");

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("locationId", locationId);
    if (search.trim()) sp.set("search", search.trim());
    return sp.toString();
  }, [locationId, search]);

  const listQuery = useQuery({
    queryKey: ["sales-return-notes-list", locationId, search],
    queryFn: async () => {
      const response = await fetch(`/api/sales-return-notes/list?${queryString}`, { cache: "no-store" });
      const result = (await response.json()) as ListResponse | { error?: string };
      if (!response.ok) throw new Error((result as { error?: string }).error ?? "Failed to load sales return notes.");
      return (result as ListResponse).data;
    },
  });

  const locationsQuery = useQuery({
    queryKey: ["inventory-locations-filter-srn-list"],
    queryFn: async () => {
      const response = await fetch("/api/inventory/locations", { cache: "no-store" });
      const data = await response.json();
      return (data.locations ?? []) as LocationOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const columns: ColumnDef<SalesReturnListRow>[] = [
    {
      accessorKey: "srnNumber",
      header: "SRN #",
      cell: ({ row }) => <span className="font-semibold text-stone-800">{row.original.srnNumber}</span>,
    },
    { accessorKey: "invoiceNumber", header: "Invoice #" },
    { accessorKey: "customerName", header: "Customer" },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => `${row.original.locationCode} - ${row.original.locationName}`,
    },
    {
      accessorKey: "srnDate",
      header: "Return Date",
      cell: ({ row }) => formatDate(row.original.srnDate),
    },
    {
      accessorKey: "returnAmount",
      header: "Return Amount",
      cell: ({ row }) => formatCurrency(row.original.returnAmount),
      meta: { align: "right" },
    },
    {
      id: "view",
      header: "",
      cell: ({ row }) => (
        <Link
          href={`/sales-return-notes/${row.original.returnId}`}
          className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-stone-700 hover:bg-stone-50"
        >
          View
        </Link>
      ),
      meta: { align: "right" },
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-stone-400 font-semibold">Sales</p>
          <h1 className="mt-1 text-[28px] leading-tight text-stone-900 font-semibold">Sales Return Notes</h1>
          <p className="mt-1 text-[13px] text-stone-500">Track each SRN with linked GRN and Credit Note package.</p>
        </div>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Location</span>
            <select
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]"
            >
              <option value="all">All Locations</option>
              {(locationsQuery.data ?? []).map((location) => (
                <option key={location.location_id} value={String(location.location_id)}>
                  {location.code} - {location.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Search</span>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-9 py-2 text-[13px]"
                placeholder="SRN, GRN, CN, invoice, customer, location..."
              />
            </div>
          </label>
        </div>
      </section>

      {listQuery.error instanceof Error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {listQuery.error.message}
        </div>
      ) : (
        <DataTable
          data={listQuery.data ?? []}
          columns={columns}
          minWidth={0}
          hideSearch
          isLoading={listQuery.isLoading}
          emptyMessage="No sales return notes found."
          toolbarRight={
            <div className="inline-flex items-center gap-1 text-[12px] text-stone-500">
              <FileText size={13} />
              Active return packages
            </div>
          }
        />
      )}
    </div>
  );
}
