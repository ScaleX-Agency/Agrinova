import { Sk } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl p-8 space-y-6">
        <div className="space-y-2 text-center flex flex-col items-center">
          <Sk className="h-10 w-10 rounded-xl mb-2" />
          <Sk className="h-6 w-48 rounded-lg" />
          <Sk className="h-4 w-64 rounded" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Sk className="h-4 w-20 rounded" />
            <Sk className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Sk className="h-4 w-20 rounded" />
            <Sk className="h-10 w-full rounded-xl" />
          </div>
          <Sk className="h-10 w-full rounded-xl mt-4" />
        </div>
      </div>
    </div>
  );
}

