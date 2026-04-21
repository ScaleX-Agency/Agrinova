import { Sk } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
         <Sk className="h-8 w-64 rounded-lg" />
         <Sk className="h-4 w-96 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-2xl p-6">
            <Sk className="h-4 w-24 rounded mb-4" />
            <Sk className="h-8 w-32 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <Sk className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

