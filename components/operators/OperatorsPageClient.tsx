"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  Mail,
  Plus,
  // eslint-disable-next-line
  ShieldUser,
  // eslint-disable-next-line
  UserRound,
  X,
} from "lucide-react";
import DataTable from "@/components/ui/DataTable";

interface Operator {
  user_id: number;
  clerk_id: string | null;
  full_name: string;
  username: string;
  first_name: string;
  last_name: string;
}

interface OperatorsApiResponse {
  operators: Operator[];
}

interface CreateOperatorForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const DEFAULT_CREATE_FORM: CreateOperatorForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

async function getApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export default function OperatorsPageClient() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateOperatorForm>(DEFAULT_CREATE_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createError, setCreateError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const operatorColumns = useMemo<ColumnDef<Operator>[]>(
    () => [
      {
        accessorKey: "user_id",
        header: "User ID",
        cell: ({ row }) => (
          <span className="[font-family:var(--font-jetbrains)] text-[11.5px] text-blue-700">
            {row.original.user_id}
          </span>
        ),
      },
      {
        accessorKey: "full_name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            href={`/operators/${row.original.user_id}`}
            className="text-[13px] font-semibold text-stone-800 hover:text-blue-700 [font-family:var(--font-dmsans)]"
          >
            {row.original.full_name}
          </Link>
        ),
      },
      {
        accessorKey: "username",
        header: "Email",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-stone-500 [font-family:var(--font-dmsans)]">
            <Mail size={12} />
            {row.original.username}
          </span>
        ),
      },
      {
        accessorKey: "clerk_id",
        header: "Clerk ID",
        cell: ({ row }) => (
          <span className="[font-family:var(--font-jetbrains)] text-[11.5px] text-blue-700">
            {row.original.clerk_id ?? "-"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`/operators/${row.original.user_id}`}
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-stone-200 text-[12px] font-medium text-stone-600 hover:bg-stone-100 transition-colors [font-family:var(--font-dmsans)]"
          >
            View
          </Link>
        ),
      },
    ],
    [],
  );

  const operatorsQuery = useQuery<Operator[], Error>({
    queryKey: ["operators-list"],
    queryFn: async () => {
      const response = await fetch("/api/operators", { cache: "no-store" });
      if (!response.ok) {
        const error = await getApiError(response, "Failed to load operators.");
        throw new Error(error);
      }
      const data = (await response.json()) as OperatorsApiResponse;
      return data.operators ?? [];
    },
  });

  const handleCreateOperator = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    setCreateError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/operators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createForm),
      });

      if (!response.ok) {
        const error = await getApiError(response, "Failed to create operator.");
        throw new Error(error);
      }

      setCreateForm(DEFAULT_CREATE_FORM);
      setShowCreatePassword(false);
      setIsCreateOpen(false);
      setSuccessMessage("Operator created successfully.");
      await operatorsQuery.refetch();
    } catch (error: unknown) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create operator.",
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
            Admin
          </p>
          <h1 className="text-[26px] font-semibold text-stone-900 [font-family:var(--font-dmsans)] leading-tight">
            Operators
          </h1>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            Create and manage operator accounts.
          </p>
        </div>
        <button
          onClick={() => {
            setCreateError("");
            setShowCreatePassword(false);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 text-white text-[13px] font-semibold hover:bg-green-800 transition-colors [font-family:var(--font-dmsans)]"
        >
          <Plus size={14} /> New Operator
        </button>
      </div>

      {successMessage && (
        <div className="px-4 py-3 rounded-xl border border-green-200 bg-green-50 text-green-800 text-[13px] [font-family:var(--font-dmsans)]">
          {successMessage}
        </div>
      )}

      {operatorsQuery.error && (
        <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-[13px] [font-family:var(--font-dmsans)]">
          {operatorsQuery.error.message}
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        

        {operatorsQuery.isLoading ? (
          <div className="px-4 py-8 text-[13px] text-stone-500">Loading operators...</div>
        ) : (
          <DataTable
            data={operatorsQuery.data ?? []}
            columns={operatorColumns}
            minWidth={980}
            searchPlaceholder="Search operators..."
            emptyMessage="No operators found"
          />
        )}
      </div>

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isCreating) {
              setShowCreatePassword(false);
              setIsCreateOpen(false);
            }
          }}
        >
          <div className="w-full max-w-[520px] bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="text-[18px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
                Create Operator
              </h2>
              <button
                onClick={() => {
                  setShowCreatePassword(false);
                  setIsCreateOpen(false);
                }}
                disabled={isCreating}
                className="w-8 h-8 rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X size={14} className="mx-auto" />
              </button>
            </div>

            <form onSubmit={handleCreateOperator} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                    First name
                  </label>
                  <input
                    value={createForm.firstName}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
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
                    value={createForm.lastName}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
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
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-[13px] text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 [font-family:var(--font-dmsans)]"
                  placeholder="operator@agrinova.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12.5px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                  Initial password
                </label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    minLength={8}
                    value={createForm.password}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    required
                    className="w-full px-3 pr-11 py-2 rounded-xl border border-stone-200 bg-white text-[13px] text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 [font-family:var(--font-dmsans)]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowCreatePassword(
                        (previousValue) => !previousValue,
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-colors flex items-center justify-center"
                    aria-label={
                      showCreatePassword ? "Hide password" : "Show password"
                    }
                  >
                    {showCreatePassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
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
                  onClick={() => {
                    setShowCreatePassword(false);
                    setIsCreateOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-[13px] font-medium text-stone-600 hover:bg-stone-100 transition-colors [font-family:var(--font-dmsans)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-green-700 text-white text-[13px] font-semibold hover:bg-green-800 disabled:opacity-70 transition-colors [font-family:var(--font-dmsans)]"
                >
                  {isCreating ? "Creating..." : "Create Operator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
