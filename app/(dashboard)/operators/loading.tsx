import { Sk } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <Sk className="h-8 w-64 rounded-lg" />
        <Sk className="h-4 w-96 rounded" />
      </div>
      <div className="flex items-center justify-between">
        <Sk className="h-10 w-64 rounded-xl" />
        <Sk className="h-10 w-24 rounded-xl" />
      </div>
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-3 border-b border-stone-100">
          {[...Array(5)].map((_, i) => (
            <Sk key={i} className="h-4 flex-1 rounded" />
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-stone-50 last:border-b-0">
            {[...Array(5)].map((_, j) => (
              <Sk key={j} className="h-4 flex-1 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

