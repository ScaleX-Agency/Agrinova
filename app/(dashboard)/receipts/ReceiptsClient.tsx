"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, Plus, Printer, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ReceiptMethod, ReceiptOptionDto, ReceiptsResponse } from "@/types/api";

type MethodFilter = "ALL" | ReceiptMethod;

const METHOD_LABEL: Record<ReceiptMethod, string> = {
  CASH: "Cash",
  CHEQUE: "Cheque",
  BANK_TRANSFER: "Bank Transfer",
};

const METHOD_STYLE: Record<ReceiptMethod, string> = {
  CASH: "bg-green-50 text-green-700 border-green-100",
  CHEQUE: "bg-amber-50 text-amber-800 border-amber-100",
  BANK_TRANSFER: "bg-blue-50 text-blue-700 border-blue-100",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const toMonthKey = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
};

const ReceiptsClient = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("ALL");
  const [monthFilter, setMonthFilter] = useState("ALL");

  const receiptsQuery = useQuery<ReceiptOptionDto[], Error>({
    queryKey: ["receipts-list"],
    queryFn: async () => {
      const response = await fetch("/api/receipts");
      const result = (await response.json()) as ReceiptsResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load receipts.");
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const receipts = receiptsQuery.data ?? [];

  const monthOptions = useMemo(() => {
    const unique = new Set(receipts.map((receipt) => toMonthKey(receipt.receiptDate)).filter(Boolean));
    return Array.from(unique).sort((a, b) => (a > b ? -1 : 1));
  }, [receipts]);

  const filtered = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return receipts.filter((receipt) => {
      const methodMatches = methodFilter === "ALL" || receipt.paymentMethod === methodFilter;
      const monthMatches = monthFilter === "ALL" || toMonthKey(receipt.receiptDate) === monthFilter;
      const searchMatches =
        needle.length === 0 ||
        [receipt.receiptNo, receipt.invoiceNo, receipt.customerName].join(" ").toLowerCase().includes(needle);

      return methodMatches && monthMatches && searchMatches;
    });
  }, [methodFilter, monthFilter, receipts, searchTerm]);

  const totalCollected = filtered.reduce((sum, receipt) => sum + receipt.amountReceived, 0);

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Sales</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-playfair)] font-semibold">
            Receipts
          </h1>
          <p className="text-[13px] text-stone-500">Payment receipts recorded against invoices.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-[#c0c3f0] bg-white px-3 py-2 text-[13px] font-medium text-[#2b2d7e] transition-colors hover:bg-[#eeeffe]"
          >
            <Printer size={14} />
            Print
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-[#c0c3f0] bg-white px-3 py-2 text-[13px] font-medium text-[#2b2d7e] transition-colors hover:bg-[#eeeffe]"
          >
            <Download size={14} />
            Export
          </button>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
          >
            <Plus size={14} />
            Create Receipt
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Total Receipts</p>
          <p className="mt-1 text-[26px] leading-none text-stone-900 [font-family:var(--font-playfair)]">{filtered.length}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 lg:col-span-2">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Total Collected</p>
          <p className="mt-1 text-[26px] leading-none text-[#1a5c2e] [font-family:var(--font-playfair)]">
            {formatCurrency(totalCollected)}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Cash Receipts</p>
          <p className="mt-1 text-[26px] leading-none text-stone-900 [font-family:var(--font-playfair)]">
            {filtered.filter((row) => row.paymentMethod === "CASH").length}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search receipt no, invoice no, or customer"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-[#1a5c2e]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value as MethodFilter)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
            >
              <option value="ALL">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>

            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
            >
              <option value="ALL">All Months</option>
              {monthOptions.map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {formatMonthLabel(monthKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left text-[14px]">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.1em] text-stone-500">
              <tr>
                {["Receipt #", "Date", "Invoice", "Customer", "Amount (LKR)", "Method", "Action"].map(
                  (column) => (
                    <th key={column} className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">
                      {column}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((receipt) => (
                <tr key={receipt.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-[#2b2d7e] [font-family:var(--font-jetbrains)]">
                    {receipt.receiptNo}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{formatDate(receipt.receiptDate)}</td>
                  <td className="px-4 py-3 text-stone-700">{receipt.invoiceNo}</td>
                  <td className="px-4 py-3 text-stone-800">{receipt.customerName}</td>
                  <td className="px-4 py-3 text-stone-900">{formatCurrency(receipt.amountReceived)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${METHOD_STYLE[receipt.paymentMethod]}`}
                    >
                      {METHOD_LABEL[receipt.paymentMethod]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/receipts/${receipt.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#c0c3f0] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#2b2d7e] hover:bg-[#eeeffe]"
                    >
                      <Eye size={12} />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !receiptsQuery.isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-stone-500">
                    No receipts match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {receiptsQuery.isLoading && <p className="text-[13px] text-stone-500">Loading receipts...</p>}

      {receiptsQuery.error instanceof Error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {receiptsQuery.error.message}
        </p>
      )}
    </section>
  );
};

export default ReceiptsClient;
