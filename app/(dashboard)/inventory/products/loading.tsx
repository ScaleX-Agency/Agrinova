// app/(dashboard)/inventory/products/loading.tsx
// Pixel-perfect skeleton of the Products page.
// Mirrors: stat cards (4) + toolbar (search + pills + export) + product table.

export default function ProductsLoading() {
  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Sk className="h-3 w-16 rounded" />
          <Sk className="h-7 w-28 rounded-lg" />
          <Sk className="h-3.5 w-72 rounded" />
        </div>
        {/* New Product button ghost */}
        <Sk className="h-9 w-32 rounded-xl" />
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_ACCENTS.map(({ ring, icon }, i) => (
          <div
            key={i}
            className="bg-white border border-stone-200 rounded-2xl p-4 flex items-start gap-3"
          >
            <Sk className={`w-9 h-9 rounded-xl shrink-0 ${icon}`} />
            <div className="space-y-2 flex-1">
              <Sk className="h-2.5 w-16 rounded" />
              <Sk className="h-7 w-10 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Search input */}
        <Sk className="h-9 w-60 rounded-xl" />
        {/* Category pills */}
        {PILL_WIDTHS.map((w, i) => (
          <Sk key={i} className={`h-7 ${w} rounded-full`} />
        ))}
        {/* Export button */}
        <Sk className="h-9 w-20 rounded-xl ml-auto" />
      </div>

      {/* ── Product table ── */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
          <Sk className="h-4 w-36 rounded" />
          <Sk className="h-5 w-20 rounded-full" />
        </div>
        {/* Column headers */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-stone-100">
          {["w-20", "flex-1", "w-20", "w-16", "w-24 ml-auto", "w-14"].map(
            (w, i) => (
              <Sk key={i} className={`h-2.5 rounded ${w}`} />
            ),
          )}
        </div>
        {/* Rows */}
        {[...Array(8)].map((_, i) => (
          <ProductRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function ProductRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-stone-50 last:border-b-0">
      {/* Code */}
      <Sk className="h-3.5 w-20 rounded shrink-0" />
      {/* Product name */}
      <div className="flex-1 space-y-1.5">
        <Sk className="h-3.5 w-40 rounded" />
      </div>
      {/* Category badge */}
      <Sk className="h-5 w-20 rounded-full shrink-0" />
      {/* Pack size */}
      <Sk className="h-3.5 w-12 rounded shrink-0" />
      {/* Price */}
      <div className="ml-auto text-right space-y-1 shrink-0">
        <Sk className="h-2.5 w-8 rounded ml-auto" />
        <Sk className="h-4 w-20 rounded" />
      </div>
      {/* Actions */}
      <div className="flex gap-1.5 shrink-0">
        <Sk className="h-7 w-7 rounded-lg" />
        <Sk className="h-7 w-7 rounded-lg" />
      </div>
    </div>
  );
}

function Sk({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-stone-100 overflow-hidden relative before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent ${className}`}
    />
  );
}

const STAT_ACCENTS = [
  { icon: "!bg-green-100", ring: "" },
  { icon: "!bg-blue-100", ring: "" },
  { icon: "!bg-violet-100", ring: "" },
  { icon: "!bg-amber-100", ring: "" },
];

const PILL_WIDTHS = ["w-8", "w-20", "w-20", "w-24", "w-24", "w-24"];
