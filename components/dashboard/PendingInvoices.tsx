"use client";
// components/dashboard/PendingInvoices.tsx
// Phase 2 — Pending / Partially-Paid Invoices Widget
//
// Requires: pendingInvoices[] added to /api/customer-sales response.
// Shape expected from API:
//   pendingInvoices: Array<{
//     invoice_id:    number;
//     invoice_no:    string;
//     customer_name: string;
//     total_amount:  number;
//     balance_due:   number;
//     invoice_date:  string;   // ISO
//     days_overdue:  number;   // negative = not yet due
//   }>
//
// Until the API is updated, the component degrades gracefully (shows empty state).
//
// Usage in dashboard/page.tsx (Sales tab):
//   import PendingInvoices from "@/components/dashboard/PendingInvoices";
//   <PendingInvoices invoices={salesData?.pendingInvoices} loading={salesLoading} />

import Link from "next/link";
import { FileText, ChevronRight, Clock, AlertCircle } from "lucide-react";
import { formatLKR } from "@/lib/formatters";

export interface PendingInvoiceRow {
  invoice_id:    number;
  invoice_no:    string;
  customer_name: string;
  total_amount:  number;
  balance_due:   number;
  invoice_date:  string;
  days_overdue:  number;
}

interface Props {
  invoices?: PendingInvoiceRow[];
  loading?: boolean;
}

export default function PendingInvoices({ invoices = [], loading = false }: Props) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-stone-400" />
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
            Pending Invoices
          </span>
          {!loading && invoices.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10.5px] font-semibold bg-violet-50 text-violet-700 border border-violet-100 rounded-full [font-family:var(--font-dmsans)]">
              {invoices.length}
            </span>
          )}
        </div>
        <Link
          href="/invoices?status=pending"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)]"
        >
          View all <ChevronRight size={12} />
        </Link>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="divide-y divide-stone-50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-36 bg-stone-100 rounded" />
                <div className="h-2 w-24 bg-stone-100 rounded" />
              </div>
              <div className="h-5 w-20 bg-stone-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && invoices.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
            <FileText size={18} className="text-green-600" />
          </div>
          <p className="text-[13px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
            No pending invoices
          </p>
          <p className="text-[11.5px] text-stone-400 [font-family:var(--font-dmsans)]">
            All invoices are settled for this period
          </p>
        </div>
      )}

      {/* List */}
      {!loading && invoices.length > 0 && (
        <div className="divide-y divide-stone-50">
          {invoices.map((inv) => {
            const isOverdue = inv.days_overdue > 0;
            const overdueCls = isOverdue
              ? "bg-red-50 text-red-700 border-red-100"
              : "bg-amber-50 text-amber-700 border-amber-100";
            const overdueLabel = isOverdue
              ? `${inv.days_overdue}d overdue`
              : "Pending";

            return (
              <Link
                key={inv.invoice_id}
                href={`/invoices/${inv.invoice_id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/60 transition-colors group"
              >
                {/* Icon */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isOverdue ? "bg-red-50 border border-red-100" : "bg-amber-50 border border-amber-100"
                }`}>
                  {isOverdue
                    ? <AlertCircle size={13} className="text-red-500" />
                    : <Clock size={13} className="text-amber-500" />
                  }
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-stone-800 truncate [font-family:var(--font-dmsans)] group-hover:text-blue-800 transition-colors">
                    {inv.customer_name}
                  </p>
                  <p className="text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">
                    {inv.invoice_no} ·{" "}
                    {new Date(inv.invoice_date).toLocaleDateString("en-GB", {
                      day: "2-digit", month: "short",
                    })}
                  </p>
                </div>

                {/* Amount + badge */}
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-bold text-stone-800 [font-family:var(--font-jetbrains)] leading-none">
                    {formatLKR(inv.balance_due)}
                  </p>
                  <span className={`mt-1 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full border [font-family:var(--font-dmsans)] ${overdueCls}`}>
                    {overdueLabel}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
