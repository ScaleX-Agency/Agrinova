export default function ProductPerformanceLoading() {
  return (
    <div className="space-y-4">
      <div className="h-16 rounded-2xl border border-stone-200 bg-white animate-pulse" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-[98px] rounded-2xl border border-stone-200 bg-white animate-pulse"
          />
        ))}
      </div>
      <div className="h-[300px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
      <div className="h-[360px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
    </div>
  );
}
