"use client";

import { AlertTriangle, XCircle } from "lucide-react";
import { LocationSummary } from "@/types/inventory";

interface Props {
  summaries: LocationSummary[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function LocationCards({ summaries, selectedId, onSelect }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {summaries.map((loc) => {
        const isSelected = selectedId === loc.location_id;
        return (
          <button
            key={loc.location_id}
            onClick={() => onSelect(loc.location_id)}
            className={`
              relative text-left p-3.5 rounded-xl border-[1.5px] transition-all
              ${isSelected
                ? "border-blue-500 bg-blue-50"
                : "border-stone-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
              }
            `}
          >
            {/* Alert badge */}
            {loc.out_count > 0 && (
              <span className="absolute top-2.5 right-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">
                {loc.out_count}
              </span>
            )}
            {loc.out_count === 0 && loc.low_count > 0 && (
              <span className="absolute top-2.5 right-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">
                {loc.low_count}
              </span>
            )}

            <p className="[font-family:var(--font-jetbrains)] text-[10px] font-medium text-stone-400 tracking-wider mb-0.5">
              {loc.code}
            </p>
            <p className={`text-[13px] font-semibold mb-2.5 ${isSelected ? "text-blue-800" : "text-stone-800"}`}>
              {loc.name}
            </p>

            <div className="flex gap-3">
              <div>
                <p className="text-[15px] font-bold text-stone-800 leading-none">{loc.total_products}</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Products</p>
              </div>
              <div>
                <p className="text-[15px] font-bold text-stone-800 leading-none">{loc.total_units}</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Units</p>
              </div>
              {loc.low_count > 0 && (
                <div>
                  <p className="text-[15px] font-bold text-amber-700 leading-none">{loc.low_count}</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">Low</p>
                </div>
              )}
              {loc.out_count > 0 && (
                <div>
                  <p className="text-[15px] font-bold text-red-700 leading-none">{loc.out_count}</p>
                  <p className="text-[10px] text-red-600 mt-0.5">Out</p>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
