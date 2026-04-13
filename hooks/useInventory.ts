// src/hooks/useInventory.ts
// All React Query hooks for the inventory section.
// Used by client components — server components use inventoryService directly.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  StockOverviewRow,
  LocationSummary,
  MovementRow,
  CreateMovementDto,
} from "@/types/inventory";

// ── Query key registry ────────────────────────────────────────
// Centralised so invalidation is consistent everywhere.
export const KEYS = {
  allStock:          ["stock", "all"]         as const,
  summaries:         ["stock", "summaries"]   as const,
  allMovements:      ["movements", "all"]     as const,
  locationStock:     (id: number) => ["stock",     "location", id] as const,
  locationMovements: (id: number) => ["movements", "location", id] as const,
  products:          ["products"]             as const,
};

// ── Client-side status helper (mirrors server LOW_THRESHOLD) ──
function deriveStatus(qty: number, threshold = 20): StockOverviewRow["status"] {
  if (qty <= 0) return "out";
  if (qty < threshold) return "low";
  return "ok";
}

// ── Fetcher helpers ───────────────────────────────────────────

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Stock hooks ───────────────────────────────────────────────

/**
 * All stock across all locations.
 * `initialData` is passed from the RSC page so there's no loading flash on first visit.
 */
export function useAllStock(initialData?: StockOverviewRow[]) {
  return useQuery({
    queryKey: KEYS.allStock,
    queryFn:  () => fetchJSON<{ stock: StockOverviewRow[] }>("/api/inventory").then((d) => d.stock),
    initialData,
    staleTime: 30_000,
  });
}

/**
 * Location summary cards (total products, units, low/out counts).
 */
export function useLocationSummaries(initialData?: LocationSummary[]) {
  return useQuery({
    queryKey: KEYS.summaries,
    queryFn:  () => fetchJSON<{ summaries: LocationSummary[] }>("/api/inventory").then((d) => d.summaries),
    initialData,
    staleTime: 30_000,
  });
}

/**
 * Stock for a single location.
 */
export function useLocationStock(locationId: number, initialData?: StockOverviewRow[]) {
  return useQuery({
    queryKey: KEYS.locationStock(locationId),
    queryFn:  () =>
      fetchJSON<{ stock: StockOverviewRow[] }>(`/api/inventory/${locationId}`).then((d) => d.stock),
    initialData,
    staleTime: 30_000,
    enabled: locationId > 0,
  });
}

// ── Movements hooks ───────────────────────────────────────────

/**
 * Full movements log (latest 200).
 */
export function useAllMovements(initialData?: MovementRow[]) {
  return useQuery({
    queryKey: KEYS.allMovements,
    queryFn:  () =>
      fetchJSON<{ movements: MovementRow[] }>("/api/stock-movements").then((d) => d.movements),
    initialData,
    staleTime: 30_000,
  });
}

/**
 * Movements for a single location.
 */
export function useLocationMovements(locationId: number, initialData?: MovementRow[]) {
  return useQuery({
    queryKey: KEYS.locationMovements(locationId),
    queryFn:  () =>
      fetchJSON<{ movements: MovementRow[] }>(`/api/inventory/${locationId}/movements`).then(
        (d) => d.movements,
      ),
    initialData,
    staleTime: 30_000,
    enabled: locationId > 0,
  });
}

// ── Mutation: record movement ─────────────────────────────────
/**
 * POST /api/stock-movements
 * Includes optimistic update: qty changes in the table instantly.
 * Rolls back if the API fails. Invalidates all inventory keys on settle.
 */
export function useRecordMovement() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateMovementDto) =>
      fetchJSON<{ updatedStock: { stock_id: number; quantity_on_hand: number }; movement_id: number }>(
        // fetchJSON only does GET — use raw fetch for mutations
        // (overriding here to avoid duplicating fetchJSON)
        "/api/stock-movements" // handled in the block below
      ).then(() => null as never), // placeholder — real call below

    // Override the above with the real POST
    // (React Query doesn't support async mutationFn override inline,
    //  so we redefine properly:)
    ...(true && {
      mutationFn: async (dto: CreateMovementDto) => {
        const res = await fetch("/api/stock-movements", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(dto),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to save movement");
        }
        return res.json() as Promise<{
          updatedStock: { stock_id: number; quantity_on_hand: number };
          movement_id:  number;
        }>;
      },
    }),

    onMutate: async (dto) => {
      // Prevent stale refetch overwriting our optimistic data
      await qc.cancelQueries({ queryKey: KEYS.allStock });

      const prevStock = qc.getQueryData<StockOverviewRow[]>(KEYS.allStock);
      const delta =
        dto.movement_type === "ISSUE" || dto.movement_type === "ADJUSTMENT"
          ? -dto.quantity
          : dto.quantity;

      // Apply optimistic update immediately
      qc.setQueryData<StockOverviewRow[]>(KEYS.allStock, (old) =>
        old?.map((r) =>
          r.stock_id === dto.stock_id
            ? {
                ...r,
                quantity_on_hand: Math.max(0, r.quantity_on_hand + delta),
                status:           deriveStatus(r.quantity_on_hand + delta, r.reorder_threshold),
              }
            : r,
        ) ?? [],
      );

      return { prevStock };
    },

    onError: (_, __, ctx) => {
      // Rollback on failure
      if (ctx?.prevStock) qc.setQueryData(KEYS.allStock, ctx.prevStock);
    },

    onSettled: () => {
      // Always sync from server after mutation (success or error)
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
    },
  });
}

/**
 * Standalone helper to bust all inventory queries from any component.
 * Useful after modals that use their own fetch logic.
 */
export function useInvalidateInventory() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["stock"] });
    qc.invalidateQueries({ queryKey: ["movements"] });
  };
}
