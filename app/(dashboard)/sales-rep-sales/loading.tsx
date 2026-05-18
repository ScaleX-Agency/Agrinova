export default function SalesRepSalesLoading() {
  return (
    <div className="space-y-4">
      <div className="h-16 rounded-2xl border border-stone-200 bg-white animate-pulse" />
      <div className="h-44 rounded-2xl border border-stone-200 bg-white animate-pulse" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-[90px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
        ))}
      </div>
      <div className="h-[320px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
    </div>
  );
}

