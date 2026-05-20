import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateStockTransferDto,
  LocationSummary,
  PaginatedResult,
  StockOverviewRow,
  StockTransferRecord,
} from "@/types/inventory";

type StockResponse = {
  stock: StockOverviewRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export const KEYS = {
  allStock: (filters?: unknown) => ["stock", "all", filters] as const,
  summaries: ["stock", "summaries"] as const,
  stockTransfers: (filters?: unknown) => ["stock-transfers", "all", filters] as const,
  locationStock: (id: number, filters?: unknown) => ["stock", "location", id, filters] as const,
  products: ["products"] as const,
};

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useAllStock(
  params: { page?: number; pageSize?: number; search?: string; location_id?: number; status?: string } = {},
  initialData?: StockResponse,
) {
  const shouldUseInitialData =
    Boolean(initialData) &&
    (params.page ?? 1) === 1 &&
    !params.search &&
    !params.location_id &&
    (!params.status || params.status === "all");

  return useQuery({
    queryKey: KEYS.allStock(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", params.page.toString());
      if (params.pageSize) searchParams.set("pageSize", params.pageSize.toString());
      if (params.search) searchParams.set("search", params.search);
      if (params.location_id) searchParams.set("location_id", params.location_id.toString());
      if (params.status && params.status !== "all") searchParams.set("status", params.status);
      return fetchJSON<StockResponse>(`/api/inventory?${searchParams.toString()}`);
    },
    initialData: shouldUseInitialData ? initialData : undefined,
    staleTime: 30_000,
  });
}

export function useLocationSummaries(initialData?: LocationSummary[]) {
  return useQuery({
    queryKey: KEYS.summaries,
    queryFn: () => fetchJSON<{ summaries: LocationSummary[] }>("/api/inventory").then((d) => d.summaries),
    initialData,
    staleTime: 30_000,
  });
}

export function useLocationStock(
  locationId: number,
  params: { page?: number; pageSize?: number; search?: string; status?: string } = {},
  initialData?: StockResponse,
) {
  return useQuery({
    queryKey: KEYS.locationStock(locationId, params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", params.page.toString());
      if (params.pageSize) searchParams.set("pageSize", params.pageSize.toString());
      if (params.search) searchParams.set("search", params.search);
      if (params.status && params.status !== "all") searchParams.set("status", params.status);
      return fetchJSON<StockResponse>(
        `/api/inventory/${locationId}?${searchParams.toString()}`,
      );
    },
    initialData,
    staleTime: 30_000,
    enabled: locationId > 0,
  });
}

export function useInvalidateInventory() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["stock"] });
    qc.invalidateQueries({ queryKey: ["stock-transfers"] });
  };
}

export function useStockTransfers(
  params: { page?: number; pageSize?: number } = {},
  initialData?: PaginatedResult<StockTransferRecord>,
) {
  return useQuery({
    queryKey: KEYS.stockTransfers(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", params.page.toString());
      if (params.pageSize) searchParams.set("pageSize", params.pageSize.toString());
      return fetchJSON<PaginatedResult<StockTransferRecord>>(`/api/stock-transfers?${searchParams.toString()}`);
    },
    initialData,
    staleTime: 30_000,
  });
}

export function useCreateStockTransfer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateStockTransferDto) => {
      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create stock transfer");
      }
      return res.json();
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["stock-transfers"] });
      qc.invalidateQueries({ queryKey: ["summaries"] });
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      fetchJSON<{ categories: { category_id: number; name: string; tag: string | null }[] }>("/api/categories").then(
        (d) => d.categories,
      ),
    staleTime: 300_000,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: () => fetchJSON<{ data: { id: number; code: string; label: string }[] }>("/api/locations").then((d) => d.data),
    staleTime: 300_000,
  });
}
