"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  ShieldUser,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

interface Operator {
  user_id: number;
  clerk_id: string | null;
  full_name: string;
  username: string;
  first_name: string;
  last_name: string;
}

interface OperatorDetailApiResponse {
  operator: Operator;
}

interface EditOperatorForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface OperatorDetailPageClientProps {
  operatorId: string;
}

async function getApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export default function OperatorDetailPageClient({
  operatorId,
}: OperatorDetailPageClientProps) {
  const router = useRouter();
  const [operator, setOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [form, setForm] = useState<EditOperatorForm>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const resolvedOperatorId = useMemo(() => {
    const parsed = Number(operatorId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [operatorId]);

  const fetchOperator = useCallback(async () => {
    if (!resolvedOperatorId) {
      setLoadError("Invalid operator ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch(`/api/operators/${resolvedOperatorId}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const error = await getApiError(
          response,
          "Failed to load operator details.",
        );
        throw new Error(error);
      }

      const data = (await response.json()) as OperatorDetailApiResponse;
      setOperator(data.operator);
      setForm({
        firstName: data.operator.first_name,
        lastName: data.operator.last_name,
        email: data.operator.username,
        password: "",
      });
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load operator details.",
      );
    } finally {
      setLoading(false);
    }
  }, [resolvedOperatorId]);

  useEffect(() => {
    void fetchOperator();
  }, [fetchOperator]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resolvedOperatorId) return;

    setSaving(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        ...(form.password.trim() ? { password: form.password } : {}),
      };

      const response = await fetch(`/api/operators/${resolvedOperatorId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await getApiError(response, "Failed to update operator.");
        throw new Error(error);
      }

      const data = (await response.json()) as OperatorDetailApiResponse;
      setOperator(data.operator);
      setForm((prev) => ({ ...prev, password: "" }));
      setEditing(false);
      setSuccessMessage("Operator updated successfully.");
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to update operator.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!resolvedOperatorId) return;

    setDeleting(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/operators/${resolvedOperatorId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await getApiError(response, "Failed to remove operator.");
        throw new Error(error);
      }

      router.push("/operators");
      router.refresh();
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to remove operator.",
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

  if (loadError || !operator) {
    return (
      <div className="space-y-4">
        <Link
          href="/operators"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 hover:text-stone-700 [font-family:var(--font-dmsans)]"
        >
          <ArrowLeft size={14} />
          Back to Operators
        </Link>
        <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-[13px] [font-family:var(--font-dmsans)]">
          {loadError || "Operator not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/operators"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 hover:text-stone-700 [font-family:var(--font-dmsans)]"
          >
            <ArrowLeft size={14} />
            Back to Operators
          </Link>
          <h1 className="mt-2 text-[26px] font-semibold text-stone-900 [font-family:var(--font-playfair)] leading-tight">
            {operator.full_name}
          </h1>
          <p className="mt-1 text-[12px] text-blue-700 [font-family:var(--font-jetbrains)]">
            User ID: {operator.user_id}
          </p>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            Update operator profile details or remove this account.
          </p>
        </div>
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
            Operator Details
          </span>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                  First name
                </label>
                <input
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      firstName: event.target.value,
                    }))
                  }
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-[13px] text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 [font-family:var(--font-dmsans)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                  Last name
                </label>
                <input
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      lastName: event.target.value,
                    }))
                  }
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-[13px] text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 [font-family:var(--font-dmsans)]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12.5px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                required
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-[13px] text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 [font-family:var(--font-dmsans)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12.5px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                New password (optional)
              </label>
              <input
                type="password"
                minLength={8}
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder="Leave blank to keep current password"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-[13px] text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 [font-family:var(--font-dmsans)]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setForm({
                    firstName: operator.first_name,
                    lastName: operator.last_name,
                    email: operator.username,
                    password: "",
                  });
                  setSaveError("");
                }}
                className="px-4 py-2 rounded-xl border border-stone-200 text-[13px] font-medium text-stone-600 hover:bg-stone-100 transition-colors [font-family:var(--font-dmsans)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-green-700 text-white text-[13px] font-semibold hover:bg-green-800 disabled:opacity-70 transition-colors [font-family:var(--font-dmsans)]"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                User ID
              </p>
              <p className="mt-1 text-[12px] text-blue-700 [font-family:var(--font-jetbrains)]">
                {operator.user_id}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                Full Name
              </p>
              <p className="mt-1 text-[14px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
                {operator.full_name}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                Role
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full [font-family:var(--font-dmsans)]">
                <UserRound size={12} />
                Operator
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                Email
              </p>
              <p className="mt-1 text-[13px] text-stone-700 [font-family:var(--font-dmsans)] inline-flex items-center gap-1.5">
                <Mail size={12} />
                {operator.username}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                Clerk ID
              </p>
              <p className="mt-1 text-[12px] text-blue-700 [font-family:var(--font-jetbrains)] break-all">
                {operator.clerk_id ?? "—"}
              </p>
            </div>
          </div>
        )}
      </div>

      {confirmDeleteOpen && (
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
                Remove Operator
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
                  {operator.full_name}
                </span>
                ? This deletes the operator from both Clerk and the database.
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
                {deleting ? "Removing..." : "Remove Operator"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
