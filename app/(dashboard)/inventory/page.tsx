// app/(dashboard)/inventory/page.tsx
// Server component: fetches once, passes as initialData to React Query.
// Subsequent visits are served from the RQ client cache (no API call until stale).

import StockOverview from "@/components/StockOverview";
import {
  getAllStock,
  getLocationSummaries,
  getAllMovements,
} from "@/lib/inventoryService";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Stock Overview" };

export default async function InventoryPage() {
  // Runs server-side — hits unstable_cache (not Supabase directly on repeat loads)
  const stock     = await getAllStock();
  const [summaries, movements] = await Promise.all([
    getLocationSummaries(), // fetch via SQL aggregation directly
    getAllMovements(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)] mb-1">
            Inventory
          </p>
          <h1 className="text-[26px] font-semibold text-stone-900 [font-family:var(--font-playfair)] leading-tight">
            Stock Overview
          </h1>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            Manage stock levels across all inventory locations
          </p>
        </div>
      </div>

      {/* initialData seeds the React Query cache — no loading flash on first visit */}
      <StockOverview
        initialStock={stock}
        initialSummaries={summaries}
        initialMovements={movements}
      />
    </div>
  );
}
