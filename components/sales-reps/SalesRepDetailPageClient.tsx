"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  ShieldUser,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

interface SalesRep {
  rep_id: number;
  full_name: string;
  phone: string;
}

interface SalesRepDetailApiResponse {
  salesRep: SalesRep;
}

interface EditSalesRepForm {
  fullName: string;
  phone: string;
}

interface SalesRepDetailPageClientProps {
  repId: string;
  canEdit: boolean;
}

async function getApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export default function SalesRepDetailPageClient({
  repId,
  canEdit,
}: SalesRepDetailPageClientProps) {
  const router = useRouter();
  const [salesRep, setSalesRep] = useState<SalesRep | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [form, setForm] = useState<EditSalesRepForm>({
    fullName: "",
    phone: "",
  });

  const resolvedRepId = useMemo(() => {
    const parsed = Number(repId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [repId]);

  const hasEditChanges =
    !!salesRep &&
    (form.fullName.trim() !== salesRep.full_name.trim() ||
      form.phone.trim() !== salesRep.phone.trim());

  const fetchSalesRep = useCallback(async () => {
    if (!resolvedRepId) {
      setLoadError("Invalid sales rep ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch(`/api/sales-reps/${resolvedRepId}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const error = await getApiError(
          response,
          "Failed to load sales rep details.",
        );
        throw new Error(error);
      }

      const data = (await response.json()) as SalesRepDetailApiResponse;
      setSalesRep(data.salesRep);
      setForm({
        fullName: data.salesRep.full_name,
        phone: data.salesRep.phone,
      });
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load sales rep details.",
      );
    } finally {
      setLoading(false);
    }
  }, [resolvedRepId]);

  useEffect(() => {
    void fetchSalesRep();
  }, [fetchSalesRep]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resolvedRepId) return;
    if (!hasEditChanges) return;

    setSaving(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
      };

      const response = await fetch(`/api/sales-reps/${resolvedRepId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await getApiError(
          response,
          "Failed to update sales rep.",
        );
        throw new Error(error);
      }

      const data = (await response.json()) as SalesRepDetailApiResponse;
      setSalesRep(data.salesRep);
      setForm({
        fullName: data.salesRep.full_name,
        phone: data.salesRep.phone,
      });
      setEditing(false);
      setSuccessMessage("Sales rep updated successfully.");
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to update sales rep.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!resolvedRepId) return;

    setDeleting(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/sales-reps/${resolvedRepId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await getApiError(
          response,
          "Failed to remove sales rep.",
        );
        throw new Error(error);
      }

      router.push("/sales-reps");
      router.refresh();
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to remove sales rep.",
      );
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-44 rounded bg-stone-100 animate-pulse" />
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-3">
          <div className="h-5 w-52 rounded bg-stone-100 animate-pulse" />
          <div className="h-4 w-72 rounded bg-stone-100 animate-pulse" />
          <div className="h-4 w-60 rounded bg-stone-100 animate-pulse" />
          <div className="h-4 w-56 rounded bg-stone-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (loadError || !salesRep) {
    return (
      <div className="space-y-4">
        <Link
          href="/sales-reps"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 hover:text-stone-700 [font-family:var(--font-dmsans)]"
        >
          <ArrowLeft size={14} />
          Back to Sales Reps
        </Link>
        <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-[13px] [font-family:var(--font-dmsans)]">
          {loadError || "Sales rep not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/sales-reps"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 hover:text-stone-700 [font-family:var(--font-dmsans)]"
          >
            <ArrowLeft size={14} />
            Back to Sales Reps
          </Link>
          <h1 className="mt-2 text-[26px] font-semibold text-stone-900 [font-family:var(--font-playfair)] leading-tight">
            {salesRep.full_name}
          </h1>
          <p className="mt-1 text-[12px] text-blue-700 [font-family:var(--font-jetbrains)]">
            Rep ID: {salesRep.rep_id}
          </p>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            {canEdit
              ? "Update sales rep details or remove this record."
              : "View sales rep details."}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={() => {
                  setEditing(true);
                  setSaveError("");
                  setSuccessMessage("");
                }}
                className="px-4 py-2 rounded-xl border border-stone-200 text-[13px] font-medium text-stone-600 hover:bg-stone-100 transition-colors [font-family:var(--font-dmsans)]"
              >
                Edit
              </button>
            )}
            <button
              onClick={() => setConfirmDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-[13px] font-semibold text-red-700 hover:bg-red-100 transition-colors [font-family:var(--font-dmsans)]"
            >
              <Trash2 size={13} />
              Remove
            </button>
          </div>
        )}
      </div>

      {successMessage && (
        <div className="px-4 py-3 rounded-xl border border-green-200 bg-green-50 text-green-800 text-[13px] [font-family:var(--font-dmsans)]">
          {successMessage}
        </div>
      )}

      {saveError && (
        <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-[13px] [font-family:var(--font-dmsans)]">
          {saveError}
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center gap-2">
          <ShieldUser size={15} className="text-stone-400" />
          <span className="text-[13px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
            Sales Rep Details
          </span>
        </div>

        {editing && canEdit ? (
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                Full name
              </label>
              <input
                value={form.fullName}
                onChange={(event) =>
                  setForm((prev) => ({
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
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    phone: event.target.value,
                  }))
                }
                required
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-[13px] text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 [font-family:var(--font-dmsans)]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setForm({
                    fullName: salesRep.full_name,
                    phone: salesRep.phone,
                  });
                  setSaveError("");
                }}
                className="px-4 py-2 rounded-xl border border-stone-200 text-[13px] font-medium text-stone-600 hover:bg-stone-100 transition-colors [font-family:var(--font-dmsans)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !hasEditChanges}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors [font-family:var(--font-dmsans)] ${
                  saving || !hasEditChanges
                    ? "bg-green-500 text-white opacity-70 cursor-not-allowed"
                    : "bg-green-700 text-white hover:bg-green-800"
                }`}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                Rep ID
              </p>
              <p className="mt-1 text-[12px] text-blue-700 [font-family:var(--font-jetbrains)]">
                {salesRep.rep_id}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                Full Name
              </p>
              <p className="mt-1 text-[14px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
                {salesRep.full_name}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                Phone
              </p>
              <p className="mt-1 text-[13px] text-stone-700 [font-family:var(--font-dmsans)] inline-flex items-center gap-1.5">
                <Phone size={12} />
                {salesRep.phone}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                Record Type
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full [font-family:var(--font-dmsans)]">
                <UserRound size={12} />
                Sales Rep
              </p>
            </div>
          </div>
        )}
      </div>

      {confirmDeleteOpen && canEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setConfirmDeleteOpen(false);
            }
          }}
        >
          <div className="w-full max-w-[420px] bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="text-[17px] font-semibold text-stone-900 [font-family:var(--font-playfair)]">
                Remove Sales Rep
              </h2>
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleting}
                className="w-8 h-8 rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X size={14} className="mx-auto" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13px] text-stone-600 [font-family:var(--font-dmsans)] leading-relaxed">
                Are you sure you want to remove{" "}
                <span className="font-semibold text-stone-800">
                  {salesRep.full_name}
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-stone-200 text-[13px] font-medium text-stone-600 hover:bg-white transition-colors [font-family:var(--font-dmsans)]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 disabled:opacity-70 transition-colors [font-family:var(--font-dmsans)]"
              >
                <Trash2 size={13} />
                {deleting ? "Removing..." : "Remove Sales Rep"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
