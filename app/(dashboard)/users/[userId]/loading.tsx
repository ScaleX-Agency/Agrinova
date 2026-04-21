import { Sk } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Sk className="h-8 w-64 rounded-lg" />
          <Sk className="h-4 w-48 rounded" />
        </div>
        <Sk className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
            <Sk className="h-6 w-48 rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Sk className="h-4 w-24 rounded" />
                  <Sk className="h-5 w-full rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <Sk className="h-48 w-full rounded-xl" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
            <Sk className="h-6 w-32 rounded-lg" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Sk className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Sk className="h-4 w-3/4 rounded" />
                  <Sk className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

