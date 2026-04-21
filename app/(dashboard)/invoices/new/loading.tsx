import { Sk } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="space-y-2">
        <Sk className="h-8 w-64 rounded-lg" />
        <Sk className="h-4 w-96 rounded" />
      </div>
      <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Sk className="h-4 w-32 rounded" />
            <Sk className="h-10 w-full rounded-xl" />
          </div>
        ))}
        <div className="flex justify-end gap-3 pt-4">
          <Sk className="h-10 w-24 rounded-xl" />
          <Sk className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

