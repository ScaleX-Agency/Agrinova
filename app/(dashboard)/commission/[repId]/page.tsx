"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { CommissionRepDetailResponse } from "@/types/api";

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

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const CommissionRepDetailPage = () => {
  const params = useParams<{ repId: string }>();
  const searchParams = useSearchParams();

  const repId = Number(params.repId);
  const month = searchParams.get("month") ?? getCurrentMonth();

  const detailQuery = useQuery({
    queryKey: ["commission-detail", repId, month],
    enabled: Number.isInteger(repId) && repId > 0,
    queryFn: async () => {
      const response = await fetch(`/api/commission/${repId}?month=${month}`);
      const result = (await response.json()) as CommissionRepDetailResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load commission detail.");
      return result.data;
    },
  });

  const rows = detailQuery.data?.rows ?? [];

  const effectiveRate = useMemo(() => {
    if (!detailQuery.data || detailQuery.data.totalSales <= 0) return 0;
    return (detailQuery.data.commissionAmount / detailQuery.data.totalSales) * 100;
  }, [detailQuery.data]);

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Commission</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-playfair)] font-semibold">
            {detailQuery.data?.repName ?? "Sales Rep"} Commission
          </h1>
          <p className="text-[13px] text-stone-500">Month: {month}</p>
        </div>

        <Link
          href={`/commission?month=${month}`}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
        >
          <ArrowLeft size={14} />
          Back to Commission
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Invoices</p>
          <p className="mt-1 text-[20px] leading-none text-stone-900 [font-family:var(--font-playfair)]">
            {detailQuery.data?.invoiceCount ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Total Sales</p>
          <p className="mt-1 text-[20px] leading-none text-stone-900 [font-family:var(--font-playfair)]">
            {formatCurrency(detailQuery.data?.totalSales ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Cash Collected</p>
          <p className="mt-1 text-[20px] leading-none text-stone-900 [font-family:var(--font-playfair)]">
            {formatCurrency(detailQuery.data?.cashCollected ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Avg Days</p>
          <p className="mt-1 text-[20px] leading-none text-stone-900 [font-family:var(--font-playfair)]">
            {(detailQuery.data?.avgDays ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Commission</p>
          <p className="mt-1 text-[20px] leading-none text-[#1a5c2e] [font-family:var(--font-playfair)]">
            {formatCurrency(detailQuery.data?.commissionAmount ?? 0)}
          </p>
          <p className="mt-1 text-[12px] text-stone-500">Effective Rate: {formatPercent(effectiveRate)}</p>
        </div>
      </section>

      <div className="rounded-2xl border border-stone-200 bg-white overflow-x-auto">
        <table className="w-full min-w-[1260px] border-collapse text-left text-[14px]">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.1em] text-stone-500">
            <tr>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Receipt #</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Receipt Date</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Invoice #</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Invoice Date</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Customer</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Invoice Amount</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Cash Collected</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Days</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Rate</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Commission</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.receiptId} className="border-b border-stone-100 hover:bg-stone-50">
                <td className="px-4 py-3 font-medium text-[#2b2d7e] [font-family:var(--font-jetbrains)]">{row.receiptNo}</td>
                <td className="px-4 py-3 text-stone-700">{formatDate(row.receiptDate)}</td>
                <td className="px-4 py-3 text-stone-800">{row.invoiceNo}</td>
                <td className="px-4 py-3 text-stone-700">{formatDate(row.invoiceDate)}</td>
                <td className="px-4 py-3 text-stone-800">{row.customerName}</td>
                <td className="px-4 py-3 text-stone-800">{formatCurrency(row.invoiceAmount)}</td>
                <td className="px-4 py-3 text-stone-800">{formatCurrency(row.cashCollected)}</td>
                <td className="px-4 py-3 text-stone-700">{row.daysToPay}</td>
                <td className="px-4 py-3 text-stone-700">{formatPercent(row.commissionRate)}</td>
                <td className="px-4 py-3 font-semibold text-[#1a5c2e]">{formatCurrency(row.commissionAmount)}</td>
              </tr>
            ))}
            {!detailQuery.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-[13px] text-stone-500">
                  No commission records found for this sales rep in the selected month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detailQuery.isLoading && <p className="text-[13px] text-stone-500">Loading commission detail...</p>}

      {detailQuery.error instanceof Error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {detailQuery.error.message}
        </p>
      )}
    </section>
  );
};

export default CommissionRepDetailPage;
