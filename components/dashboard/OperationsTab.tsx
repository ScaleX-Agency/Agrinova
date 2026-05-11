"use client";
// components/dashboard/OperationsTab.tsx
// Phase 3 — Operations Tab content
//
// Uses existing endpoints:
//   /api/reminders?status=PENDING  — due-today reminders
//   /api/goods-receiving-notes     — recent GRNs
//   /api/stock-movements           — recent movements (activity feed)
//
// Usage in dashboard/page.tsx:
//   import OperationsTab from "@/components/dashboard/OperationsTab";
//   {activeTab === "operations" && <OperationsTab />}

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Bell, Truck, Activity, ChevronRight,
  Clock, CheckCircle2, AlertCircle, Package,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface ReminderRow {
  reminder_id:   number;
  title:         string;
  customer_name?: string;
  reminder_date: string;
  status:        string;
  priority?:     "HIGH" | "MEDIUM" | "LOW";
}

interface GrnRow {
  grn_id:        number;
  grn_no:        string;
  supplier_name?: string;
  received_date: string;
  status?:       string;
  total_items?:  number;
}

interface MovementFeedRow {
  movement_id:     number;
  movement_date:   string;
  movement_type:   string;
  product_name:    string;
  location_code:   string;
  movement_qty:    number;
  qty_delta:       number;
  created_by_name: string;
}

// ── Hooks ────────────────────────────────────────────────────────────────────
function useTodayReminders() {
  return useQuery<{ items: ReminderRow[] }>({
    queryKey: ["dashboard-reminders-today"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(
        `/api/reminders?status=PENDING&date=${today}&pageSize=10`
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });
}

function useRecentGrns() {
  return useQuery<{ items: GrnRow[] }>({
    queryKey: ["dashboard-recent-grns"],
    queryFn: async () => {
      const res = await fetch("/api/goods-receiving-notes?pageSize=8&sortOrder=desc");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });
}

function useActivityFeed() {
  return useQuery<{ items: MovementFeedRow[] }>({
    queryKey: ["dashboard-activity-feed"],
    queryFn: async () => {
      const res = await fetch("/api/stock-movements?pageSize=15&sortOrder=desc");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000, // auto-refresh every minute
  });
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function ListSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="divide-y divide-stone-50">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-stone-100 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-36 bg-stone-100 rounded" />
            <div className="h-2 w-24 bg-stone-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Reminders Panel ───────────────────────────────────────────────────────────
function RemindersPanel({ data, loading }: { data: ReminderRow[]; loading: boolean }) {
  const priorityCls: Record<string, string> = {
    HIGH:   "bg-red-50 text-red-700 border-red-100",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-100",
    LOW:    "bg-stone-50 text-stone-500 border-stone-100",
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-stone-400" />
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
            Due Today
          </span>
          {!loading && data.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10.5px] font-semibold bg-red-50 text-red-700 border border-red-100 rounded-full [font-family:var(--font-dmsans)]">
              {data.length}
            </span>
          )}
        </div>
        <Link
          href="/reminders"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)]"
        >
          All reminders <ChevronRight size={12} />
        </Link>
      </div>

      {loading && <ListSkeleton />}

      {!loading && data.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-7 text-center">
          <CheckCircle2 size={20} className="text-green-500" />
          <p className="text-[13px] font-medium text-stone-600 [font-family:var(--font-dmsans)]">
            Nothing due today
          </p>
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="divide-y divide-stone-50">
          {data.map((r) => (
            <Link
              key={r.reminder_id}
              href={`/reminders/${r.reminder_id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/60 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                <Bell size={14} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-stone-800 truncate [font-family:var(--font-dmsans)] group-hover:text-blue-800 transition-colors">
                  {r.title}
                </p>
                {r.customer_name && (
                  <p className="text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">
                    {r.customer_name}
                  </p>
                )}
              </div>
              {r.priority && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border [font-family:var(--font-dmsans)] shrink-0 ${priorityCls[r.priority] ?? priorityCls.LOW}`}>
                  {r.priority}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── GRN Panel ─────────────────────────────────────────────────────────────────
function GrnPanel({ data, loading }: { data: GrnRow[]; loading: boolean }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Truck size={15} className="text-stone-400" />
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
            Recent GRNs
          </span>
        </div>
        <Link
          href="/goods-receiving-notes"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)]"
        >
          View all <ChevronRight size={12} />
        </Link>
      </div>

      {loading && <ListSkeleton />}

      {!loading && data.length === 0 && (
        <p className="px-5 py-6 text-[12.5px] text-stone-400 text-center [font-family:var(--font-dmsans)]">
          No goods receiving notes yet
        </p>
      )}

      {!loading && data.length > 0 && (
        <div className="divide-y divide-stone-50">
          {data.map((grn) => (
            <Link
              key={grn.grn_id}
              href={`/goods-receiving-notes/${grn.grn_id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/60 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <Truck size={14} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-stone-800 truncate [font-family:var(--font-dmsans)] group-hover:text-blue-800 transition-colors">
                  {grn.grn_no}
                </p>
                <p className="text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">
                  {grn.supplier_name ?? "—"} ·{" "}
                  {new Date(grn.received_date).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short",
                  })}
                </p>
              </div>
              {grn.total_items !== undefined && (
                <span className="text-[11px] font-medium text-stone-500 [font-family:var(--font-dmsans)] shrink-0">
                  {grn.total_items} items
                </span>
              )}
              {grn.status && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border [font-family:var(--font-dmsans)] shrink-0 ${
                  grn.status === "COMPLETED"
                    ? "bg-green-50 text-green-700 border-green-100"
                    : "bg-amber-50 text-amber-700 border-amber-100"
                }`}>
                  {grn.status}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────────
const MOV_DOT: Record<string, string> = {
  ISSUE:      "bg-blue-500",
  RETURN:     "bg-teal-500",
  PURCHASE:   "bg-green-500",
  ADJUSTMENT: "bg-amber-500",
  default:    "bg-stone-400",
};

function ActivityFeedPanel({ data, loading }: { data: MovementFeedRow[]; loading: boolean }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-stone-400" />
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
            Live Activity Feed
          </span>
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </div>
        <Link
          href="/stock-movements"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)]"
        >
          Full log <ChevronRight size={12} />
        </Link>
      </div>

      {loading && <ListSkeleton n={6} />}

      {!loading && data.length === 0 && (
        <p className="px-5 py-6 text-[12.5px] text-stone-400 text-center [font-family:var(--font-dmsans)]">
          No recent activity
        </p>
      )}

      {!loading && data.length > 0 && (
        <div className="px-5 py-3 space-y-0">
          {data.map((m, idx) => {
            const dotCls = MOV_DOT[m.movement_type] ?? MOV_DOT.default;
            const isNeg  = m.qty_delta < 0;
            const isLast = idx === data.length - 1;
            return (
              <div key={m.movement_id} className="flex gap-3 group">
                {/* Timeline spine */}
                <div className="flex flex-col items-center pt-1">
                  <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${dotCls}`} />
                  {!isLast && <div className="w-px flex-1 bg-stone-100 mt-1" />}
                </div>
                {/* Content */}
                <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-3"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12.5px] font-medium text-stone-700 leading-snug [font-family:var(--font-dmsans)]">
                      <span className="font-semibold text-stone-900">{m.movement_type}</span>{" "}
                      {m.product_name}
                    </p>
                    <span
                      className="text-[12px] font-bold [font-family:var(--font-jetbrains)] shrink-0"
                      style={{ color: isNeg ? "#991b1b" : "#166534" }}
                    >
                      {isNeg ? `−${Math.abs(m.qty_delta)}` : `+${m.qty_delta}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="[font-family:var(--font-jetbrains)] text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                      {m.location_code}
                    </span>
                    <span className="text-[11px] text-stone-400 [font-family:var(--font-dmsans)]">
                      <Clock size={10} className="inline mr-0.5" />
                      {new Date(m.movement_date).toLocaleTimeString("en-GB", {
                        hour: "2-digit", minute: "2-digit",
                      })}{" "}
                      · {m.created_by_name}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function OperationsTab() {
  const { data: remindersData, isLoading: remindersLoading } = useTodayReminders();
  const { data: grnsData,      isLoading: grnsLoading }      = useRecentGrns();
  const { data: activityData,  isLoading: activityLoading }  = useActivityFeed();

  const reminders = remindersData?.items ?? [];
  const grns      = grnsData?.items ?? [];
  const activity  = activityData?.items ?? [];

  return (
    <div className="space-y-5">
      {/* KPI row — quick counts */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start hover:shadow-sm transition-shadow">
          <div className="w-10 h-10 rounded-xl border bg-red-50 border-red-100 flex items-center justify-center shrink-0">
            <AlertCircle size={18} className="text-red-600" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">Due Today</p>
            <p className="text-[24px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] leading-none my-1">
              {remindersLoading ? "—" : reminders.length}
            </p>
            <span className="inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 [font-family:var(--font-dmsans)]">
              Reminders
            </span>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start hover:shadow-sm transition-shadow">
          <div className="w-10 h-10 rounded-xl border bg-blue-50 border-blue-100 flex items-center justify-center shrink-0">
            <Truck size={18} className="text-blue-700" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">Recent GRNs</p>
            <p className="text-[24px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] leading-none my-1">
              {grnsLoading ? "—" : grns.length}
            </p>
            <span className="inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 [font-family:var(--font-dmsans)]">
              Goods received
            </span>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start hover:shadow-sm transition-shadow">
          <div className="w-10 h-10 rounded-xl border bg-green-50 border-green-100 flex items-center justify-center shrink-0">
            <Activity size={18} className="text-green-700" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">Movements</p>
            <p className="text-[24px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] leading-none my-1">
              {activityLoading ? "—" : activity.length}
            </p>
            <span className="inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 [font-family:var(--font-dmsans)]">
              Recent
            </span>
          </div>
        </div>
      </div>

      {/* Two-column: reminders + GRNs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RemindersPanel data={reminders} loading={remindersLoading} />
        <GrnPanel data={grns} loading={grnsLoading} />
      </div>

      {/* Full-width activity feed */}
      <ActivityFeedPanel data={activity} loading={activityLoading} />
    </div>
  );
}
