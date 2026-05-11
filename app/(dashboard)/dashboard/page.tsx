"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, HandCoins, Receipt, Users } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useTodayDashboard } from "@/hooks/useTodayDashboard";
import { formatLKRFull } from "@/lib/formatters";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">
          {label}
        </p>
        <p className="text-[22px] font-semibold text-stone-900 [font-family:var(--font-dmsans)] leading-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const { data, isLoading } = useTodayDashboard();
  const now = useMemo(() => new Date(), []);

  const today = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium text-stone-400 uppercase tracking-[0.12em] [font-family:var(--font-dmsans)] mb-1">
            {today}
          </p>
          <h1 className="text-[26px] font-semibold text-stone-900 tracking-tight [font-family:var(--font-dmsans)]">
            {greeting()}, {user?.firstName ? user.firstName : "Admin"}
          </h1>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            Daily operations snapshot across sales, cash collections, and document activity.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Today Sales"
          value={isLoading ? "..." : formatLKRFull(data?.kpis.todaySales ?? 0)}
          icon={<HandCoins size={18} className="text-green-700" />}
          accent="bg-green-50 border-green-100"
        />
        <StatCard
          label="Today Customers"
          value={isLoading ? "..." : String(data?.kpis.todayCustomers ?? 0)}
          icon={<Users size={18} className="text-blue-700" />}
          accent="bg-blue-50 border-blue-100"
        />
        <StatCard
          label="Today Collections"
          value={isLoading ? "..." : formatLKRFull(data?.kpis.todayCollections ?? 0)}
          icon={<Receipt size={18} className="text-violet-700" />}
          accent="bg-violet-50 border-violet-100"
        />
        <StatCard
          label="Today Invoices"
          value={isLoading ? "..." : String(data?.kpis.todayInvoices ?? 0)}
          icon={<Receipt size={18} className="text-cyan-700" />}
          accent="bg-cyan-50 border-cyan-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
              Today&apos;s Invoices
            </h2>
            <Link href="/invoices" className="text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)] flex items-center gap-1">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-stone-100">
                  {["Invoice #", "Customer", "Sales Rep", "Date", "Amount", "Balance", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!data || data.invoicesToday.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-stone-400 [font-family:var(--font-dmsans)]">
                      No invoices recorded today.
                    </td>
                  </tr>
                ) : (
                  data.invoicesToday.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-stone-50 last:border-b-0">
                      <td className="px-4 py-3 text-[12px] text-stone-700 [font-family:var(--font-jetbrains)]">{invoice.invoiceNo}</td>
                      <td className="px-4 py-3 text-[12.5px] text-stone-700 [font-family:var(--font-dmsans)]">{invoice.customerName}</td>
                      <td className="px-4 py-3 text-[12.5px] text-stone-600 [font-family:var(--font-dmsans)]">{invoice.repName}</td>
                      <td className="px-4 py-3 text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">{fmtDate(invoice.invoiceDate)}</td>
                      <td className="px-4 py-3 text-[12px] text-stone-700 [font-family:var(--font-jetbrains)]">{formatLKRFull(invoice.totalAmount)}</td>
                      <td className="px-4 py-3 text-[12px] text-stone-700 [font-family:var(--font-jetbrains)]">{formatLKRFull(invoice.balanceAmount)}</td>
                      <td className="px-4 py-3 text-[11px] [font-family:var(--font-dmsans)]">
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-100">
            <h2 className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
              Today&apos;s Collections
            </h2>
          </div>
          <div className="divide-y divide-stone-100 max-h-[420px] overflow-y-auto">
            {!data || data.receiptsToday.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-stone-400 [font-family:var(--font-dmsans)]">
                No receipts recorded today.
              </p>
            ) : (
              data.receiptsToday.map((receipt) => (
                <div key={receipt.id} className="px-4 py-3">
                  <p className="text-[12px] text-stone-800 [font-family:var(--font-dmsans)] font-medium">
                    {receipt.customerName}
                  </p>
                  <p className="text-[11.5px] text-stone-500 [font-family:var(--font-dmsans)]">
                    {receipt.receiptNo} · {receipt.invoiceNo} · {receipt.paymentMethod}
                  </p>
                  <p className="text-[12px] text-green-700 [font-family:var(--font-jetbrains)] mt-1">
                    {formatLKRFull(receipt.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

    </div>
  );
}
