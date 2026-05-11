"use client";
// components/dashboard/FinanceTab.tsx
// Phase 3 — Finance Tab content
//
// Uses existing endpoints:
//   /api/commission  — for pending commissions per rep
//   /api/receipts    — for recent payments
//
// Also uses /api/dashboard/finance for the cash-flow trend chart.
// That last one degrades to empty state until deployed.
//
// Usage in dashboard/page.tsx:
//   import FinanceTab from "@/components/dashboard/FinanceTab";
//   {activeTab === "finance" && <FinanceTab dateRange={dateRange} />}

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  DollarSign, TrendingUp, Clock, ChevronRight,
  CreditCard, Users, BarChart2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { formatLKR } from "@/lib/formatters";
import type { DateRange } from "@/types/dashboard";

// ── Types ────────────────────────────────────────────────────────────────────
interface ReceiptRow {
  receipt_id:    number;
  receipt_no:    string;
  customer_name: string;
  amount:        number;
  receipt_date:  string;
  payment_method?: string;
}

interface CommissionRow {
  rep_id:          number;
  rep_name:        string;
  pending_amount:  number;
  paid_amount:     number;
}

interface CashFlowPoint {
  label:       string;   // e.g. "Jan", "Week 1"
  collected:   number;
  outstanding: number;
}

interface FinanceApiResponse {
  cashFlowTrend:      CashFlowPoint[];
  totalPendingComm:   number;
  totalPaidComm:      number;
}

// ── Hooks ────────────────────────────────────────────────────────────────────
function useRecentReceipts() {
  return useQuery<{ items: ReceiptRow[] }>({
    queryKey: ["dashboard-recent-receipts"],
    queryFn: async () => {
      const res = await fetch("/api/receipts?pageSize=8&sortBy=receipt_date&sortOrder=desc");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });
}

function useCommissions() {
  return useQuery<{ items: CommissionRow[] }>({
    queryKey: ["dashboard-commissions"],
    queryFn: async () => {
      const res = await fetch("/api/commission?status=PENDING&pageSize=10");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });
}

function useFinanceData(dateRange: DateRange) {
  return useQuery<FinanceApiResponse>({
    queryKey: ["dashboard-finance", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/finance?range=${dateRange}`);
      if (!res.ok) throw new Error("Not available");
      return res.json();
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

// ── KPI skeleton ─────────────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-stone-100 shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-2 w-20 bg-stone-100 rounded" />
        <div className="h-7 w-24 bg-stone-100 rounded" />
        <div className="h-4 w-28 bg-stone-100 rounded-full" />
      </div>
    </div>
  );
}

// ── Cash Flow Chart ───────────────────────────────────────────────────────────
function CashFlowChart({ data, loading }: { data: CashFlowPoint[]; loading: boolean }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-stone-100">
        <BarChart2 size={15} className="text-stone-400" />
        <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
          Cash Flow Trend
        </span>
      </div>
      <div className="px-4 py-4">
        {loading && (
          <div className="h-[200px] animate-pulse bg-stone-50 rounded-xl" />
        )}
        {!loading && data.length === 0 && (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-[12.5px] text-stone-400 [font-family:var(--font-dmsans)]">
              Available once /api/dashboard/finance is deployed
            </p>
          </div>
        )}
        {!loading && data.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fontFamily: "var(--font-dmsans)", fill: "#a8a29e" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  fontFamily: "var(--font-dmsans)",
                  fontSize: 12,
                  borderRadius: 12,
                  border: "1px solid #e7e5e4",
                }}
                formatter={(v: number) => formatLKR(v)}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-dmsans)" }}
              />
              <Line
                type="monotone"
                dataKey="collected"
                name="Collected"
                stroke="#059669"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="outstanding"
                name="Outstanding"
                stroke="#d97706"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 2"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ── Recent Receipts ───────────────────────────────────────────────────────────
function RecentReceiptsPanel({ data, loading }: { data: ReceiptRow[]; loading: boolean }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <CreditCard size={15} className="text-stone-400" />
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
            Recent Payments
          </span>
        </div>
        <Link
          href="/receipts"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)]"
        >
          View all <ChevronRight size={12} />
        </Link>
      </div>

      {loading && (
        <div className="divide-y divide-stone-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-32 bg-stone-100 rounded" />
                <div className="h-2 w-20 bg-stone-100 rounded" />
              </div>
              <div className="h-5 w-20 bg-stone-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && data.length === 0 && (
        <p className="px-5 py-6 text-[12.5px] text-stone-400 text-center [font-family:var(--font-dmsans)]">
          No recent payments
        </p>
      )}

      {!loading && data.length > 0 && (
        <div className="divide-y divide-stone-50">
          {data.map((r) => (
            <Link
              key={r.receipt_id}
              href={`/receipts/${r.receipt_id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/60 transition-colors group"
            >
              <div className="w-7 h-7 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                <CreditCard size={12} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-stone-800 truncate [font-family:var(--font-dmsans)] group-hover:text-blue-800 transition-colors">
                  {r.customer_name}
                </p>
                <p className="text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">
                  {r.receipt_no} ·{" "}
                  {new Date(r.receipt_date).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short",
                  })}
                  {r.payment_method && ` · ${r.payment_method}`}
                </p>
              </div>
              <p className="text-[13px] font-bold text-green-700 [font-family:var(--font-jetbrains)] shrink-0">
                {formatLKR(r.amount)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pending Commissions ───────────────────────────────────────────────────────
function PendingCommissionsPanel({ data, loading }: { data: CommissionRow[]; loading: boolean }) {
  const totalPending = data.reduce((s, r) => s + r.pending_amount, 0);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-stone-400" />
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
            Pending Commissions
          </span>
        </div>
        <Link
          href="/commission"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)]"
        >
          Manage <ChevronRight size={12} />
        </Link>
      </div>

      {/* Total banner */}
      {!loading && data.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 bg-amber-50 border-b border-amber-100">
          <span className="text-[11.5px] font-medium text-amber-700 [font-family:var(--font-dmsans)]">
            Total pending payout
          </span>
          <span className="text-[14px] font-bold text-amber-800 [font-family:var(--font-jetbrains)]">
            {formatLKR(totalPending)}
          </span>
        </div>
      )}

      {loading && (
        <div className="divide-y divide-stone-50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
              <div className="w-7 h-7 rounded-full bg-stone-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-28 bg-stone-100 rounded" />
                <div className="h-2 w-16 bg-stone-100 rounded" />
              </div>
              <div className="h-5 w-20 bg-stone-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && data.length === 0 && (
        <p className="px-5 py-6 text-[12.5px] text-stone-400 text-center [font-family:var(--font-dmsans)]">
          No pending commissions
        </p>
      )}

      {!loading && data.length > 0 && (
        <div className="divide-y divide-stone-50">
          {data.map((rep) => (
            <div
              key={rep.rep_id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/60 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0 text-[11px] font-bold text-violet-700 [font-family:var(--font-dmsans)]">
                {rep.rep_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-stone-800 truncate [font-family:var(--font-dmsans)]">
                  {rep.rep_name}
                </p>
                <p className="text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">
                  Paid: {formatLKR(rep.paid_amount)}
                </p>
              </div>
              <span className="text-[12px] font-bold text-amber-700 [font-family:var(--font-jetbrains)] shrink-0">
                {formatLKR(rep.pending_amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function FinanceTab({ dateRange }: { dateRange: DateRange }) {
  const { data: financeData, isLoading: financeLoading }    = useFinanceData(dateRange);
  const { data: receiptsData, isLoading: receiptsLoading }  = useRecentReceipts();
  const { data: commData, isLoading: commLoading }          = useCommissions();

  const receipts    = receiptsData?.items ?? [];
  const commissions = commData?.items ?? [];

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {financeLoading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <div className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start hover:shadow-sm transition-shadow">
              <div className="w-10 h-10 rounded-xl border bg-green-50 border-green-100 flex items-center justify-center shrink-0">
                <DollarSign size={18} className="text-green-700" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">Cash Collected</p>
                <p className="text-[24px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] leading-none my-1">
                  {financeData ? formatLKR(financeData.cashFlowTrend.reduce((s, p) => s + p.collected, 0)) : "—"}
                </p>
                <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 [font-family:var(--font-dmsans)]">
                  This period
                </span>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start hover:shadow-sm transition-shadow">
              <div className="w-10 h-10 rounded-xl border bg-amber-50 border-amber-100 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-amber-700" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">Outstanding</p>
                <p className="text-[24px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] leading-none my-1">
                  {financeData ? formatLKR(financeData.cashFlowTrend.reduce((s, p) => s + p.outstanding, 0)) : "—"}
                </p>
                <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 [font-family:var(--font-dmsans)]">
                  Receivable
                </span>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start hover:shadow-sm transition-shadow">
              <div className="w-10 h-10 rounded-xl border bg-amber-50 border-amber-100 flex items-center justify-center shrink-0">
                <TrendingUp size={18} className="text-amber-700" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">Pending Commissions</p>
                <p className="text-[24px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] leading-none my-1">
                  {commLoading ? "—" : formatLKR(commissions.reduce((s, r) => s + r.pending_amount, 0))}
                </p>
                <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 [font-family:var(--font-dmsans)]">
                  Unpaid to reps
                </span>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start hover:shadow-sm transition-shadow">
              <div className="w-10 h-10 rounded-xl border bg-blue-50 border-blue-100 flex items-center justify-center shrink-0">
                <CreditCard size={18} className="text-blue-700" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">Recent Payments</p>
                <p className="text-[24px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] leading-none my-1">
                  {receiptsLoading ? "—" : receipts.length}
                </p>
                <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 [font-family:var(--font-dmsans)]">
                  Last 8 transactions
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Cash flow chart */}
      <CashFlowChart
        data={financeData?.cashFlowTrend ?? []}
        loading={financeLoading}
      />

      {/* Two-column: receipts + commissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentReceiptsPanel data={receipts} loading={receiptsLoading} />
        <PendingCommissionsPanel data={commissions} loading={commLoading} />
      </div>
    </div>
  );
}
