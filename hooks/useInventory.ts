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
  allStock:          (filters?: any) => ["stock", "all", filters] as const,
  summaries:         ["stock", "summaries"]   as const,
  allMovements:      (filters?: any) => ["movements", "all", filters] as const,
  locationStock:     (id: number, filters?: any) => ["stock",     "location", id, filters] as const,
  locationMovements: (id: number, filters?: any) => ["movements", "location", id, filters] as const,
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
export function useAllStock(
  params: { page?: number; pageSize?: number; search?: string; location_id?: number; status?: string } = {},
  initialData?: { stock: StockOverviewRow[], pagination: any }
) {
  return useQuery({
    queryKey: KEYS.allStock(params),
    queryFn:  () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", params.page.toString());
      if (params.pageSize) searchParams.set("pageSize", params.pageSize.toString());
      if (params.search) searchParams.set("search", params.search);
      if (params.location_id) searchParams.set("location_id", params.location_id.toString());
      if (params.status && params.status !== "all") searchParams.set("status", params.status);

      return fetchJSON<{ stock: StockOverviewRow[], pagination: any }>(`/api/inventory?${searchParams.toString()}`);
    },
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
export function useLocationStock(
  locationId: number,
  params: { page?: number; pageSize?: number; search?: string; status?: string } = {},
  initialData?: { stock: StockOverviewRow[], pagination: any }
) {
  return useQuery({
    queryKey: KEYS.locationStock(locationId, params),
    queryFn:  () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", params.page.toString());
      if (params.pageSize) searchParams.set("pageSize", params.pageSize.toString());
      if (params.search) searchParams.set("search", params.search);
      if (params.status && params.status !== "all") searchParams.set("status", params.status);

      return fetchJSON<{ stock: StockOverviewRow[], pagination: any }>(`/api/inventory/${locationId}?${searchParams.toString()}`);
    },
    initialData,
    staleTime: 30_000,
    enabled: locationId > 0,
  });
}

// ── Movements hooks ───────────────────────────────────────────

import type { PaginatedResult } from "@/types/inventory";

/**
 * Full movements log
 */
export function useAllMovements(
  params: { page?: number; pageSize?: number; movement_type?: string; search?: string } = {},
  initialData?: PaginatedResult<MovementRow>
) {
  return useQuery({
    queryKey: KEYS.allMovements(params),
    queryFn:  () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", params.page.toString());
      if (params.pageSize) searchParams.set("pageSize", params.pageSize.toString());
      if (params.movement_type && params.movement_type !== "ALL") searchParams.set("movement_type", params.movement_type);
      if (params.search) searchParams.set("search", params.search);

      return fetchJSON<PaginatedResult<MovementRow>>(`/api/stock-movements?${searchParams.toString()}`);
    },
    initialData,
    staleTime: 30_000,
  });
}

/**
 * Movements for a single location.
 */
export function useLocationMovements(
  locationId: number,
  params: { page?: number; pageSize?: number; movement_type?: string; search?: string } = {},
  initialData?: PaginatedResult<MovementRow>
) {
  return useQuery({
    queryKey: KEYS.locationMovements(locationId, params),
    queryFn:  () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", params.page.toString());
      if (params.pageSize) searchParams.set("pageSize", params.pageSize.toString());
      if (params.movement_type && params.movement_type !== "ALL") searchParams.set("movement_type", params.movement_type);
      if (params.search) searchParams.set("search", params.search);

      return fetchJSON<PaginatedResult<MovementRow>>(`/api/inventory/${locationId}/movements?${searchParams.toString()}`);
    },
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

    onMutate: async (dto) => {
      // Prevent stale refetch overwriting our optimistic data
      await qc.cancelQueries({ queryKey: ["stock"] });

      return {};
    },

    onError: (_, __, ctx) => {
      // no-op, just invalidate
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

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchJSON<{ categories: { category_id: number; name: string; tag: string }[] }>("/api/categories").then((d) => d.categories),
    staleTime: 300_000,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: () => fetchJSON<{ locations: { location_id: number; code: string; name: string }[] }>("/api/locations").then((d) => d.locations),
    staleTime: 300_000,
  });
}
