"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, Package, Plus, Printer, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { InvoiceOptionDto, InvoicesResponse } from "@/types/api";

type StatusFilter = "ALL" | InvoiceOptionDto["status"];
type GinStatusFilter = "ALL" | InvoiceOptionDto["ginStatus"];

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

const GIN_STATUS_STYLE: Record<InvoiceOptionDto["ginStatus"], string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-100",
  ISSUED: "bg-[#eeeffe] text-[#2b2d7e] border-[#c0c3f0]",
  PARTIAL: "bg-blue-50 text-blue-700 border-blue-100",
};

const GIN_STATUS_LABEL: Record<InvoiceOptionDto["ginStatus"], string> = {
  PENDING: "Pending",
  ISSUED: "Issued",
  PARTIAL: "Partial",
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

const getRecentMonthOptions = (count: number) => {
  const now = new Date();
  const options: { key: string; label: string }[] = [];

  for (let index = 0; index < count; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
    options.push({ key, label });
  }

  return options;
};

const InvoicesPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<StatusFilter>("ALL");
  const [ginStatusFilter, setGinStatusFilter] = useState<GinStatusFilter>("ALL");
  const [timeFilter, setTimeFilter] = useState("ALL");

  const monthOptions = useMemo(() => getRecentMonthOptions(12), []);

  const invoicesQuery = useQuery<InvoiceOptionDto[], Error>({
    queryKey: ["invoices-list", paymentStatusFilter, ginStatusFilter, timeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (paymentStatusFilter !== "ALL") {
        params.set("paymentStatus", paymentStatusFilter);
      }
      if (ginStatusFilter !== "ALL") {
        params.set("ginStatus", ginStatusFilter);
      }
      if (timeFilter !== "ALL") {
        params.set("month", timeFilter);
      }

      const query = params.toString();
      const response = await fetch(`/api/invoices${query ? `?${query}` : ""}`);
      const result = (await response.json()) as InvoicesResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load invoices.");
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const invoices = invoicesQuery.data ?? [];

  const filtered = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const searchMatches =
        needle.length === 0 ||
        [invoice.invoiceNo, invoice.customerName, invoice.repName].join(" ").toLowerCase().includes(needle);

      return searchMatches;
    });
  }, [invoices, searchTerm]);

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
              placeholder="Search invoices, customer, or sales rep"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-[#1a5c2e]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={paymentStatusFilter}
              onChange={(event) => setPaymentStatusFilter(event.target.value as StatusFilter)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="UNPAID">Unpaid</option>
              <option value="OVERDUE">Overdue</option>
            </select>

            <select
              value={ginStatusFilter}
              onChange={(event) => setGinStatusFilter(event.target.value as GinStatusFilter)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
            >
              <option value="ALL">All GIN Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ISSUED">Issued</option>
              <option value="PARTIAL">Partial</option>
            </select>

            <select
              value={timeFilter}
              onChange={(event) => setTimeFilter(event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
            >
              <option value="ALL">All Time</option>
              {monthOptions.map((monthOption) => (
                <option key={monthOption.key} value={monthOption.key}>
                  {monthOption.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left text-[14px]">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.1em] text-stone-500">
              <tr>
                <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Invoice #</th>
                <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Date</th>
                <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Customer</th>
                <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Sales Rep</th>
                <th className="sticky top-0 border-b border-stone-200 px-4 py-3 text-right font-medium">
                  Amount (LKR)
                </th>
                <th className="sticky top-0 border-b border-stone-200 px-4 py-3 text-center font-medium">
                  Payment Status
                </th>
                <th className="sticky top-0 border-b border-stone-200 px-4 py-3 text-center font-medium">
                  GIN Status
                </th>
                <th className="sticky top-0 border-b border-stone-200 px-4 py-3 text-center font-medium">Action</th>
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
                  <td className="px-4 py-3 text-right text-stone-900">{formatCurrency(invoice.totalAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLE[invoice.status]}`}
                    >
                      {STATUS_LABEL[invoice.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${GIN_STATUS_STYLE[invoice.ginStatus]}`}
                    >
                      {GIN_STATUS_LABEL[invoice.ginStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {invoice.ginStatus === "ISSUED" ? (
                        <span
                          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 px-2.5 py-1.5 text-[12px] font-medium text-stone-400"
                          title="GIN already issued"
                        >
                          <Package size={12} />
                          Issue Stocks
                        </span>
                      ) : (
                        <Link
                          href={`/goods-issue-notes/new?invoiceId=${invoice.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a5c2e] px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#2d7a42]"
                        >
                          <Package size={12} />
                          Issue Stocks
                        </Link>
                      )}
                      {invoice.status === "PAID" ? (
                        <span
                          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 px-2.5 py-1.5 text-[12px] font-medium text-stone-400"
                          title="Invoice is fully paid"
                        >
                          Record Payment
                        </span>
                      ) : (
                        <Link
                          href={`/receipts/new?invoiceId=${invoice.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a5c2e] px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#2d7a42]"
                        >
                          Record Payment
                        </Link>
                      )}
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#c0c3f0] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#2b2d7e] hover:bg-[#eeeffe]"
                      >
                        <Eye size={12} />
                        View
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

export default InvoicesPage;