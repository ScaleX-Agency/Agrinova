"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, PackagePlus } from "lucide-react";
import type { GoodsReceivingNotesResponse } from "@/types/api";

const ENTRY_TYPE_STYLE: Record<"LOCAL_PURCHASE" | "FOREIGN_IMPORT", string> = {
  LOCAL_PURCHASE: "bg-green-50 text-green-700 border-green-100",
  FOREIGN_IMPORT: "bg-blue-50 text-blue-700 border-blue-100",
};

const ENTRY_TYPE_LABEL: Record<"LOCAL_PURCHASE" | "FOREIGN_IMPORT", string> = {
  LOCAL_PURCHASE: "Local Purchase",
  FOREIGN_IMPORT: "Foreign Import",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const GoodsReceivingNotesPage = () => {
  const notesQuery = useQuery({
    queryKey: ["goods-receiving-notes"],
    queryFn: async () => {
      const response = await fetch("/api/goods-receiving-notes");
      const result = (await response.json()) as GoodsReceivingNotesResponse;
      if (!response.ok) {
        throw new Error(
          result.error ?? "Failed to load goods receiving notes.",
        );
      }
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const rows = notesQuery.data ?? [];

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
            Inventory
          </p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-playfair)] font-semibold">
            Goods Receiving Notes
          </h1>
          <p className="text-[13px] text-stone-500">
            Review all stock receipts created from new stock entries.
          </p>
        </div>

        <Link
          href="/inventory"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
        >
          <PackagePlus size={14} />
          New Stock Entry
        </Link>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[960px] border-collapse text-left text-[14px]">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.1em] text-stone-500">
            <tr>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">
                GRN #
              </th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">
                Date
              </th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">
                Entry Type
              </th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">
                Location
              </th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">
                Reference
              </th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">
                Lines
              </th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">
                Created By
              </th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-stone-100 hover:bg-stone-50"
              >
                <td className="px-4 py-3 font-medium text-[#2b2d7e] [font-family:var(--font-jetbrains)]">
                  {row.grnNumber}
                </td>
                <td className="px-4 py-3 text-stone-700">
                  {formatDate(row.date)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${ENTRY_TYPE_STYLE[row.entryType]}`}
                  >
                    {ENTRY_TYPE_LABEL[row.entryType]}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-700">
                  {row.locationCode} - {row.locationName}
                </td>
                <td className="px-4 py-3 text-stone-700">
                  {row.referenceNo ?? "—"}
                </td>
                <td className="px-4 py-3 text-stone-700">{row.lineCount}</td>
                <td className="px-4 py-3 text-stone-700">
                  {row.createdByName}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/goods-receiving-notes/${row.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#c0c3f0] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#2b2d7e] hover:bg-[#eeeffe]"
                  >
                    <Eye size={12} />
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!notesQuery.isLoading && rows.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] text-stone-500">
            No goods receiving notes found yet. Save a new stock entry to create
            the first one.
          </div>
        )}
      </div>

      {notesQuery.error instanceof Error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {notesQuery.error.message}
        </p>
      )}
    </section>
  );
};

export default GoodsReceivingNotesPage;
