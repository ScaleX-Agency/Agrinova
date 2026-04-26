import { Sk } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] text-stone-400 [font-family:var(--font-dmsans)]">
          <ArrowLeft size={13} />
          Back to Stock Overview
        </div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Sk className="h-4 w-16 rounded-md" />
              <span className="text-[11px] text-stone-300">·</span>
              <span className="text-[11.5px] text-stone-400 [font-family:var(--font-dmsans)]">
                Location Detail
              </span>
            </div>
            <Sk className="h-[32px] w-48 rounded-xl mt-1 mb-1" />
            <Sk className="h-[20px] w-64 rounded-md" />
          </div>
          <Sk className="h-10 w-[140px] rounded-xl hidden sm:block" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sk className="w-8 h-8 rounded-xl" />
              <Sk className="h-4 w-20 rounded-md" />
            </div>
            <Sk className="h-8 w-16 rounded-lg mt-3" />
          </div>
        ))}
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 bg-stone-50 flex items-center gap-3">
          <Sk className="h-8 w-40 rounded-lg" />
          <Sk className="h-8 w-64 rounded-xl ml-auto" />
        </div>
        <div className="p-5">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-stone-50">
                <div className="flex gap-4 items-center w-1/3">
                  <Sk className="h-5 w-20 rounded-md" />
                  <div className="space-y-1">
                    <Sk className="h-4 w-32 rounded-md" />
                    <Sk className="h-3 w-20 rounded-md" />
                  </div>
                </div>
                <Sk className="h-5 w-16 rounded-md" />
                <Sk className="h-4 w-12 rounded-md" />
                <Sk className="h-2 w-16 rounded-full" />
                <Sk className="h-7 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
