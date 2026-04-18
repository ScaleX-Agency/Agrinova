// app/(dashboard)/dashboard/loading.tsx
// Pixel-perfect skeleton of the dashboard page.
// Mirrors: header → 4 stat cards → main grid (movements + quick actions) → location health

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          {/* date line */}
          <Sk className="h-3 w-48 rounded" />
          {/* greeting h1 */}
          <Sk className="h-8 w-64 rounded-lg" />
          {/* subtitle */}
          <Sk className="h-3.5 w-80 rounded mt-1" />
        </div>
        {/* Record Movement button */}
        <Sk className="hidden sm:block h-9 w-40 rounded-xl" />
      </div>

      {/* ── Stat Cards — grid grid-cols-2 lg:grid-cols-4 gap-3 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map(({ iconBg, badgeW }, i) => (
          <div
            key={i}
            className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start"
          >
            <div
              className={`w-10 h-10 rounded-xl border flex-shrink-0 ${iconBg}`}
            />
            <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
              <Sk className="h-2.5 w-20 rounded" />
              <Sk className="h-7 w-10 rounded-md" />
              <Sk className={`h-5 rounded-full ${badgeW}`} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid — grid-cols-1 lg:grid-cols-3 gap-4 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Movements — lg:col-span-2 ── */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl overflow-hidden">
          {/* card header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Sk className="h-3.5 w-3.5 rounded" />
              <Sk className="h-4 w-36 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <Sk className="h-6 w-20 rounded-lg" />
              <Sk className="h-4 w-14 rounded" />
            </div>
          </div>
          {/* col headers — Type | Product | Location | Qty | Time | By */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-b border-stone-100">
            {["w-10", "flex-1", "w-16", "w-8 ml-auto", "w-10", "w-8"].map(
              (w, i) => (
                <Sk key={i} className={`h-2.5 rounded ${w}`} />
              ),
            )}
          </div>
          {/* 5 movement rows */}
          {[...Array(5)].map((_, i) => (
            <MovementRow key={i} faded={i === 4} />
          ))}
        </div>

        {/* Quick Actions — 1 col ── */}
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          {/* header */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-stone-100">
            <Sk className="h-3.5 w-3.5 rounded" />
            <Sk className="h-4 w-24 rounded" />
          </div>
          {/* 5 action items: icon + title + desc + chevron */}
          <div className="p-3 space-y-1">
            {QUICK_ACTION_ICONS.map((bg, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                <div className={`w-10 h-10 rounded-xl border shrink-0 ${bg}`} />
                <div className="flex-1 space-y-1.5">
                  <Sk className="h-3.5 w-28 rounded" />
                  <Sk className="h-2.5 w-36 rounded" />
                </div>
                <Sk className="h-3.5 w-3.5 rounded shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Location Health ── */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Sk className="h-3.5 w-3.5 rounded" />
            <Sk className="h-4 w-28 rounded" />
          </div>
          <Sk className="h-4 w-16 rounded" />
        </div>
        {/* 4 location cells — grid-cols-4 divide-x ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-100">
          {[...Array(4)].map((_, i) => (
            <LocationCell key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Movement table row ────────────────────────────────────────
// Mirrors: Type badge | product name | location code | qty | date | by
function MovementRow({ faded }: { faded?: boolean }) {
  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 border-b border-stone-50 last:border-b-0 transition-opacity ${faded ? "opacity-40" : ""}`}
    >
      <Sk className="h-5 w-16 rounded-full shrink-0" />
      <Sk className="flex-1 h-3.5 rounded max-w-[140px]" />
      <Sk className="h-5 w-12 rounded-md shrink-0" />
      <Sk className="h-5 w-8 rounded ml-auto shrink-0" />
      <div className="flex items-center gap-1 shrink-0">
        <Sk className="h-2.5 w-2.5 rounded" />
        <Sk className="h-3 w-14 rounded" />
      </div>
      <Sk className="h-3 w-14 rounded shrink-0" />
    </div>
  );
}

// ── Location cell ─────────────────────────────────────────────
// Mirrors: code + name + status badge → level bar → stats row
function LocationCell() {
  return (
    <div className="p-4">
      {/* code + name + status badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1.5">
          <Sk className="h-2.5 w-10 rounded" />
          <Sk className="h-4 w-24 rounded" />
        </div>
        <Sk className="h-5 w-16 rounded-full" />
      </div>
      {/* level bar */}
      <div className="mb-3 space-y-1.5">
        <div className="flex justify-between">
          <Sk className="h-2.5 w-16 rounded" />
          <Sk className="h-2.5 w-8 rounded" />
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          {/* static shimmer bar — width varies per cell */}
          <Sk className="h-full rounded-full w-3/4" />
        </div>
      </div>
      {/* stats row: Products + Units */}
      <div className="flex gap-3">
        {[...Array(2)].map((_, j) => (
          <div key={j} className="space-y-1">
            <Sk className="h-4 w-8 rounded" />
            <Sk className="h-2.5 w-12 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shimmer primitive ─────────────────────────────────────────
function Sk({ className = "" }: { className?: string }) {
  return (
    <div
      className={`
        bg-stone-100 overflow-hidden relative
        before:absolute before:inset-0 before:-translate-x-full
        before:animate-[shimmer_1.5s_infinite]
        before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent
        ${className}
      `}
    />
  );
}

// ── Config ────────────────────────────────────────────────────
// Stat card icon tints match the real StatCard iconBg colours
const STAT_CARDS = [
  { iconBg: "bg-green-50  border-green-100", badgeW: "w-28" }, // Total Products
  { iconBg: "bg-blue-50   border-blue-100", badgeW: "w-24" }, // Total Units
  { iconBg: "bg-amber-50  border-amber-100", badgeW: "w-32" }, // Low Stock
  { iconBg: "bg-red-50    border-red-100", badgeW: "w-28" }, // Out of Stock
];

// Quick action icon box tints match the real QUICK_ACTIONS accent colours
const QUICK_ACTION_ICONS = [
  "bg-green-50  border-green-100", // Record Movement
  "bg-blue-50   border-blue-100", // Stock Overview
  "bg-green-50  border-green-100", // Products
  "bg-violet-50 border-violet-100", // New Invoice
  "bg-amber-50  border-amber-100", // Sales Reps
];
