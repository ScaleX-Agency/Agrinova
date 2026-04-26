// hooks/useLocations.ts
//
// ROOT CAUSE OF THE BUG:
//   The original hook likely had a fixed queryKey like ["locations"]
//   and didn't include `status` in the key. React Query would cache
//   the first fetch (ACTIVE) and return it for every subsequent call
//   regardless of the status argument — so the Inactive tab always
//   showed Active locations.
//
// FIX:
//   - Include ALL filter params (status, page, pageSize, search)
//     in the queryKey array so each unique combination gets its own cache.
//   - Pass status as a query param to the API: ?status=INACTIVE
//   - For the count badges, call useLocations twice with status + page=1,
//     pageSize=999 so we know how many total are in each bucket.
//
// DEACTIVATE vs DELETE:
//   - The original code called deleteLocation (DELETE /api/inventory/[id])
//     which physically removed the row. This means historical stock data,
//     movements, and invoices linked to that location would break FK constraints.
//   - The correct approach is soft-delete: PATCH /api/inventory/[id] with
//     { status: "INACTIVE" }. This is what updateLocation already does.
//   - LocationsPage.tsx now calls updateLocation for both deactivate and
//     reactivate. If your API truly needs a DELETE for deactivation, add
//     a `status` column to INVENTORY_LOCATION and update the route.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface LocationData {
  location_id: number;
  code: string;
  name: string;
  address?: string;
  status: "ACTIVE" | "INACTIVE";
  stock_count?: number; // joined from STOCK table if backend supports it
}

interface LocationsResponse {
  // Support both { items } and { data } response shapes
  items?: LocationData[];
  data?: LocationData[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
}

// ── Fetch helpers ─────────────────────────────────────────────

async function fetchLocations(
  status: "ACTIVE" | "INACTIVE",
  page: number,
  pageSize: number,
  search: string,
): Promise<LocationsResponse> {
  const params = new URLSearchParams({
    status,
    page: String(page),
    pageSize: String(pageSize),
    ...(search ? { search } : {}),
  });
  const res = await fetch(`/api/inventory/locations?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to fetch locations");
  }
  return res.json();
}

async function createLocation(data: {
  code: string;
  name: string;
  address?: string;
  status?: "ACTIVE" | "INACTIVE";
}): Promise<LocationData> {
  const res = await fetch("/api/inventory/locations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to create location");
  }
  return res.json();
}

async function patchLocation(
  id: number,
  data: Partial<LocationData>,
): Promise<LocationData> {
  const res = await fetch(`/api/inventory/locations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to update location");
  }
  return res.json();
}

// This should only be used if the backend truly supports hard-delete.
// For deactivation, use patchLocation with { status: "INACTIVE" } instead.
async function hardDeleteLocation(id: number): Promise<void> {
  const res = await fetch(`/api/inventory/locations/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to delete location");
  }
}

// ── Hooks ─────────────────────────────────────────────────────

/**
 * FIX: All params included in queryKey — status is critical.
 * Without `status` in the key, React Query returns the same cached
 * ACTIVE results for the INACTIVE tab.
 */
export function useLocations(
  status: "ACTIVE" | "INACTIVE",
  page: number,
  pageSize: number,
  search: string,
) {
  return useQuery<LocationsResponse>({
    queryKey: ["locations", status, page, pageSize, search],
    queryFn: () => fetchLocations(status, page, pageSize, search),
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (prev) => prev, // keep old data while fetching (no flash)
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createLocation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}

/**
 * FIX: useUpdateLocation is used for BOTH deactivate AND reactivate.
 * Previously, useDeleteLocation was used for deactivation which called
 * DELETE and removed the row — meaning the Inactive tab had nothing to show.
 */
export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<LocationData>) =>
      patchLocation(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}

/**
 * Hard delete — only use if the backend supports it and you're sure
 * no stock/movements are linked to this location.
 * For deactivation, use useUpdateLocation with status="INACTIVE" instead.
 */
export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => hardDeleteLocation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}
