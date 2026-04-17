"use client";

import Link from "next/link";
import { Eye, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { GoodsIssueNotesResponse } from "@/types/api";

const formatDate = (value: string) => {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const GoodsIssueNotesPage = () => {
  const notesQuery = useQuery({
    queryKey: ["goods-issue-notes"],
    queryFn: async () => {
      const response = await fetch("/api/goods-issue-notes");
      const result = (await response.json()) as GoodsIssueNotesResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load goods issue notes.");
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const rows = notesQuery.data ?? [];

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Operations</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-playfair)] font-semibold">
            Goods Issue Notes
          </h1>
          <p className="text-[13px] text-stone-500">Track goods issued against invoices and review line-level details.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
          >
            <FileText size={14} />
            New Invoice
          </Link>
        </div>
      </header>

      <div className="rounded-2xl border border-stone-200 bg-white overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-[14px]">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.1em] text-stone-500">
            <tr>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">GIN #</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Date</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Customer</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Location</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Lines</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Invoice</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-stone-100 hover:bg-stone-50">
                <td className="px-4 py-3 font-medium text-[#2b2d7e] [font-family:var(--font-jetbrains)]">{row.ginNumber}</td>
                <td className="px-4 py-3 text-stone-700">{formatDate(row.date)}</td>
                <td className="px-4 py-3 text-stone-800">{row.customerName}</td>
                <td className="px-4 py-3 text-stone-700">{row.locationCode}</td>
                <td className="px-4 py-3 text-stone-700">{row.lineCount}</td>
                <td className="px-4 py-3">
                  {row.invoiceNumber ?? (
                    <span className="text-[12px] text-stone-500">Not Linked</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/goods-issue-notes/${row.id}`}
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
            No goods issue notes found yet. Create an invoice and the system will generate the GIN.
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

export default GoodsIssueNotesPage;
