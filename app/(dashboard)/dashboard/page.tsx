// app/(dashboard)/dashboard/page.tsx
// Main dashboard landing page for Agrinova IMS

import type { Metadata } from "next";
import Link from "next/link";
import {
  Package,
  TrendingUp,
  AlertTriangle,
  XCircle,
  ArrowLeftRight,
  Plus,
  FileText,
  UserCheck,
  MapPin,
  ChevronRight,
  Activity,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

// ── Types ────────────────────────────────────────────────────

type StatVariant = "green" | "blue" | "amber" | "red";

interface QuickAction {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  accent: string;
}

// ── Mock data (replace with real DB calls) ───────────────────

const STATS = [
  {
    label: "Total Products",
    value: "142",
    sub: "Across 4 locations",
    icon: <Package size={18} />,
    variant: "green" as StatVariant,
    trend: null,
  },
  {
    label: "Units in Stock",
    value: "8,430",
    sub: "+155 this week",
    icon: <TrendingUp size={18} />,
    variant: "blue" as StatVariant,
    trend: "up",
  },
  {
    label: "Low Stock",
    value: "12",
    sub: "Items below threshold",
    icon: <AlertTriangle size={18} />,
    variant: "amber" as StatVariant,
    trend: "warn",
  },
  {
    label: "Out of Stock",
    value: "3",
    sub: "Need immediate restocking",
    icon: <XCircle size={18} />,
    variant: "red" as StatVariant,
    trend: "danger",
  },
];

const LOCATIONS = [
  {
    code: "IGRN1",
    name: "Head Office",
    products: 48,
    units: 3200,
    low: 2,
    out: 0,
    pct: 88,
  },
  {
    code: "IGRN2",
    name: "Kuliyapitiya",
    products: 36,
    units: 2100,
    low: 5,
    out: 1,
    pct: 62,
  },
  {
    code: "IGRN3",
    name: "Nuwara Eliya",
    products: 31,
    units: 1800,
    low: 3,
    out: 2,
    pct: 55,
  },
  {
    code: "IGRN4",
    name: "Peradeniya",
    products: 27,
    units: 1330,
    low: 2,
    out: 0,
    pct: 72,
  },
];

const RECENT_MOVEMENTS = [
  {
    id: 1,
    type: "PURCHASE",
    product: "Glyphosate 480SL",
    location: "IGRN1",
    qty: +48,
    time: "2m ago",
    by: "Admin",
  },
  {
    id: 2,
    type: "ISSUE",
    product: "Mancozeb 80WP",
    location: "IGRN2",
    qty: -12,
    time: "31m ago",
    by: "Kamal P.",
  },
  {
    id: 3,
    type: "RETURN",
    product: "Chlorpyrifos 50EC",
    location: "IGRN3",
    qty: +6,
    time: "1h ago",
    by: "Nimal S.",
  },
  {
    id: 4,
    type: "ADJUSTMENT",
    product: "Imidacloprid 70WG",
    location: "IGRN4",
    qty: -3,
    time: "3h ago",
    by: "Admin",
  },
  {
    id: 5,
    type: "ISSUE",
    product: "Carbofuran 3G",
    location: "IGRN2",
    qty: -20,
    time: "5h ago",
    by: "Kamal P.",
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/inventory",
    icon: <Boxes size={20} />,
    label: "Stock Overview",
    description: "View and manage all inventory",
    accent: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    href: "/inventory/movements",
    icon: <ArrowLeftRight size={20} />,
    label: "Record Movement",
    description: "Issue, return or adjust stock",
    accent: "bg-green-50 text-green-700 border-green-100",
  },
  {
    href: "/invoices",
    icon: <FileText size={20} />,
    label: "New Invoice",
    description: "Create a customer invoice",
    accent: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    href: "/commission",
    icon: <UserCheck size={20} />,
    label: "Commission",
    description: "View sales rep commission breakdown",
    accent: "bg-amber-50 text-amber-700 border-amber-100",
  },
];

const MOVEMENT_TYPE_STYLE: Record<string, string> = {
  PURCHASE: "bg-green-50 text-green-700",
  ISSUE: "bg-blue-50 text-blue-800",
  RETURN: "bg-teal-50 text-teal-700",
  ADJUSTMENT: "bg-amber-50 text-amber-800",
};

const STAT_STYLE: Record<
  StatVariant,
  { icon: string; border: string; badge: string }
> = {
  green: {
    icon: "bg-green-50 text-green-700",
    border: "border-green-100",
    badge: "bg-green-50 text-green-700",
  },
  blue: {
    icon: "bg-blue-50 text-blue-700",
    border: "border-blue-100",
    badge: "bg-blue-50 text-blue-800",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700",
    border: "border-amber-100",
    badge: "bg-amber-50 text-amber-800",
  },
  red: {
    icon: "bg-red-50 text-red-700",
    border: "border-red-100",
    badge: "bg-red-50 text-red-700",
  },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Page ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium text-stone-400 uppercase tracking-[0.12em] [font-family:var(--font-dmsans)] mb-1">
            {today}
          </p>
          <h1 className="text-[26px] font-semibold text-stone-900 tracking-tight [font-family:var(--font-playfair)] leading-tight">
            {greeting()}, Admin 👋
          </h1>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            Here's what's happening across your inventory today.
          </p>
        </div>

        <Link
          href="/inventory/movements"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-[13px] font-semibold rounded-xl transition-colors [font-family:var(--font-dmsans)]"
        >
          <Plus size={14} /> Record Movement
        </Link>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => {
          const style = STAT_STYLE[s.variant];
          return (
            <div
              key={s.label}
              className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start hover:shadow-sm transition-shadow"
            >
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${style.icon} ${style.border}`}
              >
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 [font-family:var(--font-dmsans)]">
                  {s.label}
                </p>
                <p className="text-[26px] font-semibold text-stone-800 [font-family:var(--font-playfair)] leading-none my-1">
                  {s.value}
                </p>
                <span
                  className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full [font-family:var(--font-dmsans)] ${style.badge}`}
                >
                  {s.trend === "up" && (
                    <ArrowUpRight size={11} className="mr-0.5" />
                  )}
                  {s.trend === "danger" && (
                    <ArrowDownRight size={11} className="mr-0.5" />
                  )}
                  {s.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Movements — 2 cols */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-stone-400" />
              <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
                Recent Movements
              </span>
            </div>
            <Link
              href="/inventory/movements"
              className="flex items-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)]"
            >
              View all <ChevronRight size={12} />
            </Link>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-stone-50">
                {["Type", "Product", "Location", "Qty", "Time", "By"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-stone-400 text-left [font-family:var(--font-dmsans)] ${i === 3 ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {RECENT_MOVEMENTS.map((m) => {
                const isNeg = m.qty < 0;
                return (
                  <tr
                    key={m.id}
                    className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/60 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium [font-family:var(--font-dmsans)] ${MOVEMENT_TYPE_STYLE[m.type]}`}
                      >
                        {m.type.charAt(0) + m.type.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] font-medium text-stone-700 max-w-[160px] truncate [font-family:var(--font-dmsans)]">
                      {m.product}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 [font-family:var(--font-jetbrains)]">
                        {m.location}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-right font-semibold text-[14px] [font-family:var(--font-jetbrains)]"
                      style={{ color: isNeg ? "#991b1b" : "#166534" }}
                    >
                      {isNeg ? `−${Math.abs(m.qty)}` : `+${m.qty}`}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-stone-400 whitespace-nowrap [font-family:var(--font-dmsans)]">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {m.time}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-stone-500 [font-family:var(--font-dmsans)]">
                      {m.by}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quick Actions — 1 col */}
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-stone-100">
            <Plus size={15} className="text-stone-400" />
            <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
              Quick Actions
            </span>
          </div>
          <div className="p-3 space-y-2">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors group"
              >
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${a.accent}`}
                >
                  {a.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)] group-hover:text-blue-800 transition-colors">
                    {a.label}
                  </p>
                  <p className="text-[11.5px] text-stone-400 [font-family:var(--font-dmsans)]">
                    {a.description}
                  </p>
                </div>
                <ChevronRight
                  size={14}
                  className="text-stone-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Location Status ── */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-stone-400" />
            <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
              Location Health
            </span>
          </div>
          <Link
            href="/inventory"
            className="flex items-center gap-1 text-[12px] font-medium text-blue-700 hover:text-blue-800 [font-family:var(--font-dmsans)]"
          >
            Manage <ChevronRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-100">
          {LOCATIONS.map((loc) => {
            const barColor =
              loc.pct >= 75
                ? "bg-green-500"
                : loc.pct >= 50
                  ? "bg-amber-500"
                  : "bg-red-500";
            const statusText =
              loc.pct >= 75
                ? "Healthy"
                : loc.pct >= 50
                  ? "Moderate"
                  : "Critical";
            const statusStyle =
              loc.pct >= 75
                ? "text-green-700 bg-green-50"
                : loc.pct >= 50
                  ? "text-amber-700 bg-amber-50"
                  : "text-red-700 bg-red-50";

            return (
              <div
                key={loc.code}
                className="p-4 hover:bg-stone-50/60 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-jetbrains)] mb-0.5">
                      {loc.code}
                    </p>
                    <p className="text-[13.5px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
                      {loc.name}
                    </p>
                  </div>
                  <span
                    className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full [font-family:var(--font-dmsans)] ${statusStyle}`}
                  >
                    {statusText}
                  </span>
                </div>

                {/* Capacity bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[11px] text-stone-400 mb-1 [font-family:var(--font-dmsans)]">
                    <span>Stock level</span>
                    <span className="font-semibold text-stone-600">
                      {loc.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${loc.pct}%` }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-3 text-[11.5px] [font-family:var(--font-dmsans)]">
                  <div>
                    <p className="font-bold text-stone-700 [font-family:var(--font-jetbrains)] text-[13px]">
                      {loc.products}
                    </p>
                    <p className="text-stone-400">Products</p>
                  </div>
                  <div>
                    <p className="font-bold text-stone-700 [font-family:var(--font-jetbrains)] text-[13px]">
                      {loc.units.toLocaleString()}
                    </p>
                    <p className="text-stone-400">Units</p>
                  </div>
                  {loc.low > 0 && (
                    <div>
                      <p className="font-bold text-amber-700 [font-family:var(--font-jetbrains)] text-[13px]">
                        {loc.low}
                      </p>
                      <p className="text-amber-500">Low</p>
                    </div>
                  )}
                  {loc.out > 0 && (
                    <div>
                      <p className="font-bold text-red-700 [font-family:var(--font-jetbrains)] text-[13px]">
                        {loc.out}
                      </p>
                      <p className="text-red-500">Out</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
