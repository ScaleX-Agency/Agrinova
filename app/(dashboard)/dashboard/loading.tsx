// app/(dashboard)/dashboard/loading.tsx
// Skeleton shown by Next.js while the dashboard page suspends.
// Matches the exact layout and card shapes of page.tsx.

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">

      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-stone-100 rounded" />
          <div className="h-8 w-64 bg-stone-100 rounded" />
          <div className="h-3 w-48 bg-stone-100 rounded" />
        </div>
        <div className="hidden sm:flex gap-2">
          <div className="h-9 w-32 bg-stone-100 rounded-xl" />
          <div className="h-9 w-36 bg-stone-100 rounded-xl" />
        </div>
      </div>

      {/* Tab switcher skeleton */}
      <div className="h-10 w-52 bg-stone-100 rounded-xl" />

      {/* KPI row — 5 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-start">
            <div className="w-10 h-10 rounded-xl bg-stone-100 shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-2 w-16 bg-stone-100 rounded" />
              <div className="h-7 w-20 bg-stone-100 rounded" />
              <div className="h-4 w-24 bg-stone-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: trend + donut */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-100 flex justify-between">
            <div className="h-4 w-40 bg-stone-100 rounded" />
            <div className="h-4 w-24 bg-stone-100 rounded" />
          </div>
          <div className="p-5">
            <div className="h-[180px] bg-stone-50 rounded-xl" />
          </div>
        </div>
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-100">
            <div className="h-4 w-36 bg-stone-100 rounded" />
          </div>
          <div className="p-5 flex gap-6 items-center">
            <div className="w-[120px] h-[120px] rounded-full bg-stone-100 shrink-0" />
            <div className="space-y-3 flex-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-stone-100" />
                  <div className="h-3 flex-1 bg-stone-100 rounded" />
                  <div className="h-3 w-8 bg-stone-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: rep performance + top customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, ci) => (
          <div key={ci} className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-100">
              <div className="h-4 w-40 bg-stone-100 rounded" />
            </div>
            <div className="p-5 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-28 bg-stone-100 rounded" />
                    <div className="h-3 w-16 bg-stone-100 rounded" />
                  </div>
                  <div className="h-2 w-full bg-stone-100 rounded-full" />
                  <div className="h-2 w-4/5 bg-stone-50 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Row 4: top products + overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-100">
            <div className="h-4 w-36 bg-stone-100 rounded" />
          </div>
          <div className="p-5 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3 w-36 bg-stone-100 rounded" />
                  <div className="h-3 w-16 bg-stone-100 rounded" />
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full" style={{ width: `${90 - i * 15}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-100">
            <div className="h-4 w-32 bg-stone-100 rounded" />
          </div>
          <div className="divide-y divide-stone-50">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 bg-stone-100 rounded" />
                  <div className="h-2.5 w-20 bg-stone-100 rounded" />
                </div>
                <div className="space-y-1.5 text-right">
                  <div className="h-3 w-16 bg-stone-100 rounded" />
                  <div className="h-4 w-14 bg-stone-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
