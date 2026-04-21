import { Sk } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
         <Sk className="h-8 w-64 rounded-lg" />
         <Sk className="h-4 w-96 rounded" />
      </div>
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <Sk className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}

