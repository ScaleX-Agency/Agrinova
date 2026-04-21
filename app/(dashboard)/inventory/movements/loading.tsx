import { Sk } from "@/components/ui/skeleton";

// app/(dashboard)/inventory/movements/loading.tsx
// Pixel-perfect skeleton of the Movements Log page.
// Mirrors: stat cards (4) + filter bar + movements table.

export default function MovementsLoading() {
  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="space-y-2">
        <Sk className="h-3 w-16 rounded" />
        <Sk className="h-7 w-40 rounded-lg" />
        <Sk className="h-3.5 w-80 rounded" />
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CARD_ACCENT.map(({ bg, bar }, i) => (
          <div key={i} className={`border rounded-2xl p-4 ${bg}`}>
            <Sk className="h-2.5 w-20 rounded mb-2" />
            <Sk className={`h-8 w-10 rounded-md ${bar}`} />
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <Sk className="h-9 w-52 rounded-xl" />
        {/* Type filter buttons */}
        <div className="flex border border-stone-200 rounded-xl overflow-hidden">
          {["w-8", "w-12", "w-14", "w-20", "w-24"].map((w, i) => (
            <Sk
              key={i}
              className={`h-9 ${w} rounded-none border-r border-stone-100 last:border-r-0`}
            />
          ))}
        </div>
        <Sk className="h-3.5 w-16 rounded" />
        <Sk className="h-9 w-20 rounded-xl ml-auto" />
      </div>

      {/* ── Movements table ── */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Sk className="h-3.5 w-3.5 rounded" />
            <Sk className="h-4 w-28 rounded" />
          </div>
          <Sk className="h-5 w-16 rounded-full" />
        </div>
        {/* Column headers */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-stone-100">
          {[
            "w-20",
            "w-16",
            "flex-1",
            "w-14",
            "w-10 ml-auto",
            "w-28",
            "w-14",
          ].map((w, i) => (
            <Sk key={i} className={`h-2.5 rounded ${w}`} />
          ))}
        </div>
        {/* Rows */}
        {[...Array(8)].map((_, i) => (
          <MovementRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function MovementRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-stone-50 last:border-b-0">
      {/* Date */}
      <div className="flex items-center gap-1 shrink-0">
        <Sk className="h-2.5 w-2.5 rounded" />
        <Sk className="h-3 w-20 rounded" />
      </div>
      {/* Type badge */}
      <Sk className="h-5 w-16 rounded-full shrink-0" />
      {/* Product */}
      <div className="flex-1 space-y-1.5">
        <Sk className="h-3.5 w-36 rounded" />
        <Sk className="h-2.5 w-20 rounded" />
      </div>
      {/* Location */}
      <Sk className="h-5 w-12 rounded-md shrink-0" />
      {/* Qty */}
      <Sk className="h-5 w-8 rounded ml-auto shrink-0" />
      {/* Notes */}
      <Sk className="h-3 w-28 rounded shrink-0" />
      {/* By */}
      <Sk className="h-3 w-14 rounded shrink-0" />
    </div>
  );
}


const CARD_ACCENT = [
  { bg: "bg-stone-50  border-stone-200", bar: "!bg-stone-200" },
  { bg: "bg-blue-50   border-blue-100", bar: "!bg-blue-200" },
  { bg: "bg-green-50  border-green-100", bar: "!bg-green-200" },
  { bg: "bg-teal-50   border-teal-100", bar: "!bg-teal-200" },
];
