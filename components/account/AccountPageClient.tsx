"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Mail, ShieldUser, UserRound } from "lucide-react";
import BackNavigationLink from "@/components/ui/BackNavigationLink";

interface AccountDetails {
  user_id: number;
  clerk_id: string | null;
  full_name: string;
  username: string;
  role_name: string;
  first_name: string;
  last_name: string;
}

interface AccountApiResponse {
  account: AccountDetails;
}

interface AccountForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

async function getApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

function formatRole(roleName: string) {
  return roleName
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export default function AccountPageClient() {
  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState<AccountForm>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const fetchAccount = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/account", { cache: "no-store" });
      if (!response.ok) {
        const error = await getApiError(response, "Failed to load account.");
        throw new Error(error);
      }

      const data = (await response.json()) as AccountApiResponse;
      setAccount(data.account);
      setForm({
        firstName: data.account.first_name,
        lastName: data.account.last_name,
        email: data.account.username,
        password: "",
      });
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load account.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAccount();
  }, [fetchAccount]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasChanges) {
      return;
    }
    setIsSaving(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        ...(form.password.trim() ? { password: form.password } : {}),
      };

      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await getApiError(response, "Failed to update account.");
        throw new Error(error);
      }

      const data = (await response.json()) as AccountApiResponse;
      setAccount(data.account);
      setForm({
        firstName: data.account.first_name,
        lastName: data.account.last_name,
        email: data.account.username,
        password: "",
      });
      setSuccessMessage("Account updated successfully.");
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to update account.",
      );
    } finally {
      setIsSaving(false);
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

  if (loadError || !account) {
    return (
      <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-[13px] [font-family:var(--font-dmsans)]">
        {loadError || "Account not found."}
      </div>
    );
  }

  const hasChanges =
    form.firstName.trim() !== account.first_name.trim() ||
    form.lastName.trim() !== account.last_name.trim() ||
    form.email.trim().toLowerCase() !== account.username.trim().toLowerCase() ||
    form.password.trim().length > 0;

  const handleCancelEdits = () => {
    setForm({
      firstName: account.first_name,
      lastName: account.last_name,
      email: account.username,
      password: "",
    });
    setSaveError("");
    setSuccessMessage("");
  };

  return (
    <div className="space-y-5">
      <div>
        <BackNavigationLink href="/dashboard" label="Back to Dashboard" />
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)] mb-1">
          Profile
        </p>
        <h1 className="text-[26px] font-semibold text-stone-900 [font-family:var(--font-dmsans)] leading-tight">
          My Account
        </h1>
        <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
          View and update your account details.
        </p>
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
            Account Details
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
              User ID
            </p>
            <p className="mt-1 text-[12px] text-blue-700 [font-family:var(--font-jetbrains)]">
              {account.user_id}
            </p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
              Role
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full [font-family:var(--font-dmsans)]">
              <UserRound size={12} />
              {formatRole(account.role_name)}
            </p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 md:col-span-2">
            <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
              Clerk ID
            </p>
            <p className="mt-1 text-[12px] text-blue-700 [font-family:var(--font-jetbrains)] break-all">
              {account.clerk_id ?? "—"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="px-5 pb-5 space-y-4">
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
                  setForm((prev) => ({ ...prev, lastName: event.target.value }))
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
            <div className="relative">
              <Mail
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                required
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-200 bg-white text-[13px] text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 [font-family:var(--font-dmsans)]"
              />
            </div>
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
            {hasChanges && (
              <button
                type="button"
                onClick={handleCancelEdits}
                className="px-4 py-2 rounded-xl border border-stone-200 text-[13px] font-medium text-stone-600 hover:bg-stone-100 transition-colors [font-family:var(--font-dmsans)]"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving || !hasChanges}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors [font-family:var(--font-dmsans)] ${
                isSaving || !hasChanges
                  ? "bg-green-500 text-white opacity-70 cursor-not-allowed"
                  : "bg-green-700 text-white hover:bg-green-800"
              }`}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
