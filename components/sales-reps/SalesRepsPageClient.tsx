"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Phone, Plus, Search, UserRound, Users, X } from "lucide-react";

interface SalesRep {
  rep_id: number;
  full_name: string;
  phone: string;
}

interface SalesRepsApiResponse {
  salesReps: SalesRep[];
}

interface CreateSalesRepForm {
  fullName: string;
  phone: string;
}

interface SalesRepsPageClientProps {
  canEdit: boolean;
}

const DEFAULT_CREATE_FORM: CreateSalesRepForm = {
  fullName: "",
  phone: "",
};

async function getApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export default function SalesRepsPageClient({
  canEdit,
}: SalesRepsPageClientProps) {
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateSalesRepForm>(DEFAULT_CREATE_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const filteredSalesReps = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return salesReps;
    return salesReps.filter(
      (salesRep) =>
        salesRep.full_name.toLowerCase().includes(q) ||
        salesRep.phone.toLowerCase().includes(q),
    );
  }, [salesReps, search]);

  const fetchSalesReps = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/sales-reps", { cache: "no-store" });
      if (!response.ok) {
        const error = await getApiError(response, "Failed to load sales reps.");
        throw new Error(error);
      }

      const data = (await response.json()) as SalesRepsApiResponse;
      setSalesReps(data.salesReps ?? []);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load sales reps.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSalesReps();
  }, [fetchSalesReps]);

  const handleCreateSalesRep = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    setCreateError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/sales-reps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createForm),
      });

      if (!response.ok) {
        const error = await getApiError(
          response,
          "Failed to create sales rep.",
        );
        throw new Error(error);
      }

      setCreateForm(DEFAULT_CREATE_FORM);
      setIsCreateOpen(false);
      setSuccessMessage("Sales rep created successfully.");
      await fetchSalesReps();
    } catch (error: unknown) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create sales rep.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)] mb-1">
            Sales
          </p>
          <h1 className="text-[26px] font-semibold text-stone-900 [font-family:var(--font-playfair)] leading-tight">
            Sales Reps
          </h1>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            View and manage sales representative records.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setCreateError("");
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 text-white text-[13px] font-semibold hover:bg-green-800 transition-colors [font-family:var(--font-dmsans)]"
          >
            <Plus size={14} /> New Sales Rep
          </button>
        )}
      </div>

      {successMessage && (
        <div className="px-4 py-3 rounded-xl border border-green-200 bg-green-50 text-green-800 text-[13px] [font-family:var(--font-dmsans)]">
          {successMessage}
        </div>
      )}

      {loadError && (
        <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-[13px] [font-family:var(--font-dmsans)]">
          {loadError}
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-stone-400" />
            <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
              Sales Rep Records
            </span>
            <span className="text-[11px] text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full [font-family:var(--font-dmsans)]">
              {salesReps.length}
            </span>
          </div>

          <div className="relative w-[230px]">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search sales reps..."
              className="w-full pl-9 pr-3 py-2 text-[13px] border border-stone-200 rounded-xl bg-white text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 transition-all [font-family:var(--font-dmsans)]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-stone-100">
                {["Rep ID", "Name", "Phone", "Actions"].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-stone-400 text-left bg-white [font-family:var(--font-dmsans)]"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr
                    key={`sales-rep-skeleton-${index}`}
                    className="border-b border-stone-50"
                  >
                    <td className="px-4 py-3">
                      <div className="h-4 w-16 rounded bg-stone-100 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-44 rounded bg-stone-100 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-36 rounded bg-stone-100 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-7 w-16 rounded-lg bg-stone-100 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredSalesReps.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-14 text-center">
                    <div className="w-11 h-11 mx-auto mb-3 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center">
                      <UserRound size={18} />
                    </div>
                    <p className="text-[14px] font-medium text-stone-600 [font-family:var(--font-dmsans)]">
                      No sales reps found
                    </p>
                    <p className="text-[12px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
                      Add a sales rep record to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSalesReps.map((salesRep) => (
                  <tr
                    key={salesRep.rep_id}
                    className="border-b border-stone-50 hover:bg-stone-50/70 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="[font-family:var(--font-jetbrains)] text-[11.5px] text-blue-700">
                        {salesRep.rep_id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/sales-reps/${salesRep.rep_id}`}
                        className="text-[13px] font-semibold text-stone-800 hover:text-blue-700 [font-family:var(--font-dmsans)]"
                      >
                        {salesRep.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-stone-500 [font-family:var(--font-dmsans)]">
                        <Phone size={12} />
                        {salesRep.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/sales-reps/${salesRep.rep_id}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg border border-stone-200 text-[12px] font-medium text-stone-600 hover:bg-stone-100 transition-colors [font-family:var(--font-dmsans)]"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateOpen && canEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isCreating) {
              setIsCreateOpen(false);
            }
          }}
        >
          <div className="w-full max-w-[520px] bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="text-[18px] font-semibold text-stone-900 [font-family:var(--font-playfair)]">
                Create Sales Rep
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
                className="w-8 h-8 rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X size={14} className="mx-auto" />
              </button>
            </div>

            <form onSubmit={handleCreateSalesRep} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                  Full name
                </label>
                <input
                  value={createForm.fullName}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      fullName: event.target.value,
                    }))
                  }
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-[13px] text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 [font-family:var(--font-dmsans)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12.5px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                  Phone
                </label>
                <input
                  value={createForm.phone}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-[13px] text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 [font-family:var(--font-dmsans)]"
                />
              </div>

              {createError && (
                <div className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-[12.5px] text-red-700 [font-family:var(--font-dmsans)]">
                  {createError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-[13px] font-medium text-stone-600 hover:bg-stone-100 transition-colors [font-family:var(--font-dmsans)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-green-700 text-white text-[13px] font-semibold hover:bg-green-800 disabled:opacity-70 transition-colors [font-family:var(--font-dmsans)]"
                >
                  {isCreating ? "Creating..." : "Create Sales Rep"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
