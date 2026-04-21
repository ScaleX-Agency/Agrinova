import { Sk } from "@/components/ui/skeleton";

// app/(dashboard)/inventory/loading.tsx
// Mirrors StockOverview.tsx exactly:
//   stat cards (4) → location cards (4) → tab bar + actions → filter bar → stock table

export default function InventoryLoading() {
  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-2">
          <Sk className="h-3 w-14 rounded" />
          <Sk className="h-[26px] w-44 rounded-lg" />
          <Sk className="h-3 w-64 rounded mt-1" />
        </div>
      </div>

      {/* ── Stat Cards — matches: grid grid-cols-4 gap-3 ── */}
      <div className="grid grid-cols-4 gap-3">
        {STAT_CARDS.map(({ iconBg, badgeW }, i) => (
          <div
            key={i}
            className="bg-white border border-stone-200 rounded-xl p-4 flex gap-3 items-start"
          >
            {/* icon box */}
            <div className={`w-9 h-9 rounded-lg flex-shrink-0 ${iconBg}`} />
            <div className="min-w-0 flex-1 space-y-1.5">
              {/* label */}
              <Sk className="h-2.5 w-20 rounded" />
              {/* value */}
              <Sk className="h-[28px] w-10 rounded-md" />
              {/* delta badge */}
              <Sk className={`h-5 rounded-full ${badgeW}`} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Location Cards — matches: grid grid-cols-4 gap-2.5 ── */}
      <div className="grid grid-cols-4 gap-2.5">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="relative text-left p-3.5 rounded-xl border-[1.5px] border-stone-200 bg-white"
          >
            {/* code */}
            <Sk className="h-2.5 w-12 rounded mb-1" />
            {/* name */}
            <Sk className="h-4 w-28 rounded mb-[10px]" />
            {/* stats row */}
            <div className="flex gap-3">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="space-y-[5px]">
                  <Sk className="h-[15px] w-7 rounded" />
                  <Sk className="h-2.5 w-10 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs + Actions ── */}
      <div className="flex items-center justify-between">
        {/* pill tabs */}
        <div className="flex gap-0.5 bg-stone-100 rounded-lg p-1 w-fit">
          <Sk className="h-7 w-[110px] rounded-md" />
          <Sk className="h-7 w-[110px] rounded-md" />
        </div>
        {/* action buttons */}
        <div className="flex gap-2">
          <Sk className="h-8 w-28 rounded-lg" />
          <Sk className="h-8 w-36 rounded-lg" />
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex gap-2 items-center flex-wrap">
        {/* search */}
        <Sk className="h-9 w-[260px] rounded-lg" />
        {/* location select */}
        <Sk className="h-9 w-44 rounded-lg" />
        {/* status select */}
        <Sk className="h-9 w-32 rounded-lg" />
        {/* export */}
        <Sk className="h-9 w-20 rounded-lg ml-auto" />
      </div>

      {/* ── Stock Table ── */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {/* toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <Sk className="h-4 w-20 rounded" />
          <Sk className="h-5 w-14 rounded-full" />
        </div>

        {/* column headers */}
        <div
          className="grid items-center border-b border-stone-100 px-3.5 py-2.5"
          style={{
            gridTemplateColumns: "96px 1fr 80px 72px 64px 80px 100px 72px",
          }}
        >
          {["w-8", "w-16", "w-12", "w-14", "w-10", "w-8", "w-12", "w-12"].map(
            (w, i) => (
              <Sk key={i} className={`h-2.5 rounded ${w}`} />
            ),
          )}
        </div>

        {/* rows — 8 rows matching actual table */}
        {[...Array(8)].map((_, i) => (
          <TableRow key={i} dim={i % 3 === 2} />
        ))}
      </div>
    </div>
  );
}

// ── Table row skeleton ────────────────────────────────────────
// Mirrors each <tr> in StockTable:
// code | product + sub | location badge | qty | threshold | level bar | status badge | actions
function TableRow({ dim }: { dim?: boolean }) {
  return (
    <div
      className={`grid items-center px-3.5 py-3 border-b border-stone-50 last:border-b-0 transition-opacity ${dim ? "opacity-50" : ""}`}
      style={{ gridTemplateColumns: "96px 1fr 80px 72px 64px 80px 100px 72px" }}
    >
      {/* product_code */}
      <Sk className="h-3 w-20 rounded" />
      {/* product name + category·pack */}
      <div className="space-y-1.5">
        <Sk className="h-3.5 w-36 rounded" />
        <Sk className="h-2.5 w-24 rounded" />
      </div>
      {/* location badge */}
      <Sk className="h-5 w-14 rounded-full" />
      {/* qty */}
      <Sk className="h-5 w-8 rounded ml-auto" />
      {/* threshold */}
      <Sk className="h-3.5 w-6 rounded ml-auto" />
      {/* level bar */}
      <div className="flex justify-end">
        <Sk className="h-1.5 w-[72px] rounded-full" />
      </div>
      {/* status badge */}
      <Sk className="h-5 w-20 rounded-full" />
      {/* action icons */}
      <div className="flex gap-1.5">
        <Sk className="h-7 w-7 rounded-md" />
        <Sk className="h-7 w-7 rounded-md" />
      </div>
    </div>
  );
}

// ── Shared shimmer primitive ──────────────────────────────────

// ── Config ────────────────────────────────────────────────────
// Each stat card gets its own icon background tint (matches StatCard iconBg)
// and an approximate badge width so proportions look realistic.
const STAT_CARDS = [
  { iconBg: "bg-green-50", badgeW: "w-28" }, // Total Products
  { iconBg: "bg-blue-50", badgeW: "w-24" }, // Total Units
  { iconBg: "bg-amber-50", badgeW: "w-32" }, // Low Stock
  { iconBg: "bg-red-50", badgeW: "w-28" }, // Out of Stock
];
