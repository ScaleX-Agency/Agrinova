import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface LocationData {
  id: number;
  location_id: number;
  code: string;
  name: string;
  label: string;
  address?: string;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
  updated_at: string;
}

export interface CreateLocationInput {
  code: string;
  name: string;
  address?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface UpdateLocationInput extends Partial<CreateLocationInput> {
  id: number;
}

export function useLocations(status?: "ACTIVE" | "INACTIVE", page?: number, pageSize?: number, search?: string) {
  return useQuery({
    queryKey: ["locations", status, page, pageSize, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (page) params.append("page", page.toString());
      if (pageSize) params.append("pageSize", pageSize.toString());
      if (search) params.append("search", search);
      const url = `/api/locations?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch locations");
      return await res.json();
    },
  });
}
  

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateLocationInput) => {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create location");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateLocationInput) => {
      const { id, ...payload } = data;
      const res = await fetch(`/api/locations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update location");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/locations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete location");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}
