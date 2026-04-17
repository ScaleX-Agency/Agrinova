"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, Plus, Printer, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { InvoiceOptionDto, InvoicesResponse } from "@/types/api";

type StatusFilter = "ALL" | InvoiceOptionDto["status"];

const STATUS_STYLE: Record<InvoiceOptionDto["status"], string> = {
  PAID: "bg-green-50 text-green-700 border-green-100",
  PARTIAL: "bg-amber-50 text-amber-800 border-amber-100",
  UNPAID: "bg-red-50 text-red-700 border-red-100",
  OVERDUE: "bg-red-50 text-red-700 border-red-100",
};

const STATUS_LABEL: Record<InvoiceOptionDto["status"], string> = {
  PAID: "Paid",
  PARTIAL: "Partial",
  UNPAID: "Unpaid",
  OVERDUE: "Overdue",
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

const InvoicesClient = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [monthFilter, setMonthFilter] = useState("ALL");

  const invoicesQuery = useQuery<InvoiceOptionDto[], Error>({
    queryKey: ["invoices-list"],
    queryFn: async () => {
      const response = await fetch("/api/invoices");
      const result = (await response.json()) as InvoicesResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load invoices.");
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const invoices = invoicesQuery.data ?? [];

  const monthOptions = useMemo(() => {
    const unique = new Set(invoices.map((invoice) => toMonthKey(invoice.invoiceDate)).filter(Boolean));
    return Array.from(unique).sort((a, b) => (a > b ? -1 : 1));
  }, [invoices]);

  const filtered = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const statusMatches = statusFilter === "ALL" || invoice.status === statusFilter;
      const monthMatches = monthFilter === "ALL" || toMonthKey(invoice.invoiceDate) === monthFilter;
      const searchMatches =
        needle.length === 0 ||
        [invoice.invoiceNo, invoice.customerName, invoice.repName, invoice.locationCode ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(needle);

      return statusMatches && monthMatches && searchMatches;
    });
  }, [invoices, monthFilter, searchTerm, statusFilter]);

  const totalValue = filtered.reduce((sum, row) => sum + row.totalAmount, 0);
  const paid = filtered.filter((row) => row.status === "PAID").length;
  const partial = filtered.filter((row) => row.status === "PARTIAL").length;

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Sales</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-playfair)] font-semibold">
            Invoices
          </h1>
          <p className="text-[13px] text-stone-500">Live invoice records from the backend.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/goods-issue-notes/new"
            className="inline-flex items-center gap-2 rounded-xl border border-[#c0c3f0] bg-white px-3 py-2 text-[13px] font-medium text-[#2b2d7e] transition-colors hover:bg-[#eeeffe]"
          >
            <Plus size={14} />
            New GIN
          </Link>
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
            href="/invoices/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
          >
            <Plus size={14} />
            New Invoice
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Total Invoices</p>
          <p className="mt-1 text-[26px] leading-none text-stone-900 [font-family:var(--font-playfair)]">{filtered.length}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Paid</p>
          <p className="mt-1 text-[26px] leading-none text-[#1a5c2e] [font-family:var(--font-playfair)]">{paid}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Partial</p>
          <p className="mt-1 text-[26px] leading-none text-amber-700 [font-family:var(--font-playfair)]">{partial}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Total Value</p>
          <p className="mt-1 text-[26px] leading-none text-stone-900 [font-family:var(--font-playfair)]">
            {formatCurrency(totalValue)}
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
              placeholder="Search invoices, customer, sales rep, or location"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-[#1a5c2e]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="UNPAID">Unpaid</option>
              <option value="OVERDUE">Overdue</option>
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
                {[
                  "Invoice #",
                  "Date",
                  "Customer",
                  "Sales Rep",
                  "Location",
                  "Amount (LKR)",
                  "Status",
                  "Action",
                ].map((column) => (
                  <th key={column} className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr key={invoice.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-[#2b2d7e] [font-family:var(--font-jetbrains)]">
                    {invoice.invoiceNo}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{formatDate(invoice.invoiceDate)}</td>
                  <td className="px-4 py-3 text-stone-800">{invoice.customerName}</td>
                  <td className="px-4 py-3 text-stone-700">{invoice.repName}</td>
                  <td className="px-4 py-3 text-stone-700">{invoice.locationCode ?? "-"}</td>
                  <td className="px-4 py-3 text-stone-900">{formatCurrency(invoice.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLE[invoice.status]}`}
                    >
                      {STATUS_LABEL[invoice.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#c0c3f0] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#2b2d7e] hover:bg-[#eeeffe]"
                      >
                        <Eye size={12} />
                        View
                      </Link>
                      <Link
                        href={`/goods-issue-notes/new?invoiceId=${invoice.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-stone-700 hover:bg-stone-50"
                      >
                        Create GIN
                      </Link>
                      <Link
                        href={`/receipts/new?invoiceId=${invoice.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a5c2e] px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#2d7a42]"
                      >
                        Create Receipt
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !invoicesQuery.isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-stone-500">
                    No invoices match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {invoicesQuery.isLoading && (
        <p className="text-[13px] text-stone-500">Loading invoices...</p>
      )}

      {invoicesQuery.error instanceof Error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {invoicesQuery.error.message}
        </p>
      )}
    </section>
  );
};

export default InvoicesClient;
