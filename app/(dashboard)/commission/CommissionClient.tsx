"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { CommissionSummaryResponse } from "@/types/api";

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const CommissionClient = () => {
  const [month, setMonth] = useState(getCurrentMonth());

  const commissionQuery = useQuery({
    queryKey: ["commission-summary", month],
    queryFn: async () => {
      const response = await fetch(`/api/commission?month=${month}`);
      const result = (await response.json()) as CommissionSummaryResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load commission summary.");
      return result.data;
    },
  });

  const rows = commissionQuery.data?.rows ?? [];

  const totals = useMemo(() => {
    const totalSales = rows.reduce((sum, row) => sum + row.totalSales, 0);
    const cashCollected = rows.reduce((sum, row) => sum + row.cashCollected, 0);
    const totalCommission = rows.reduce((sum, row) => sum + row.commissionAmount, 0);
    return { totalSales, cashCollected, totalCommission };
  }, [rows]);

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Commission</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-playfair)] font-semibold">
            Sales Rep Commission
          </h1>
          <p className="text-[13px] text-stone-500">
            Formula: days = cash collected date - invoice date. Days ≤ 0: 2.5%, 1-65: 2%, above 65: 0%.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="month-filter" className="text-[12px] font-medium text-stone-600">
            Month
          </label>
          <input
            id="month-filter"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
          />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Sales Reps</p>
          <p className="mt-1 text-[26px] leading-none text-stone-900 [font-family:var(--font-playfair)]">{rows.length}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Total Sales</p>
          <p className="mt-1 text-[20px] leading-none text-stone-900 [font-family:var(--font-playfair)]">{formatCurrency(totals.totalSales)}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Cash Collected</p>
          <p className="mt-1 text-[20px] leading-none text-stone-900 [font-family:var(--font-playfair)]">{formatCurrency(totals.cashCollected)}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Commission Total</p>
          <p className="mt-1 text-[20px] leading-none text-[#1a5c2e] [font-family:var(--font-playfair)]">{formatCurrency(totals.totalCommission)}</p>
        </div>
      </section>

      <div className="rounded-2xl border border-stone-200 bg-white overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-left text-[14px]">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.1em] text-stone-500">
            <tr>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Sales Rep</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Invoices</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Total Sales</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Cash Collected</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Avg Days</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Commission Rate</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Commission</th>
              <th className="sticky top-0 border-b border-stone-200 px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.repId} className="border-b border-stone-100 hover:bg-stone-50">
                <td className="px-4 py-3 font-medium text-stone-900">{row.repName}</td>
                <td className="px-4 py-3 text-stone-700">{row.invoiceCount}</td>
                <td className="px-4 py-3 text-stone-800">{formatCurrency(row.totalSales)}</td>
                <td className="px-4 py-3 text-stone-800">{formatCurrency(row.cashCollected)}</td>
                <td className="px-4 py-3 text-stone-700">{row.avgDays.toFixed(2)}</td>
                <td className="px-4 py-3 text-stone-700">{formatPercent(row.commissionRate)}</td>
                <td className="px-4 py-3 font-semibold text-[#1a5c2e]">{formatCurrency(row.commissionAmount)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/commission/${row.repId}?month=${month}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#c0c3f0] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#2b2d7e] hover:bg-[#eeeffe]"
                  >
                    <Eye size={12} />
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {!commissionQuery.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-stone-500">
                  No commission data found for this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {commissionQuery.isLoading && <p className="text-[13px] text-stone-500">Loading commission data...</p>}

      {commissionQuery.error instanceof Error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {commissionQuery.error.message}
        </p>
      )}
    </section>
  );
};

export default CommissionClient;
