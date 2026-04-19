"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Phone,
  Plus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import DataTable from "@/components/ui/DataTable";

interface SalesRepOption {
  rep_id: number;
  full_name: string;
  phone: string;
}

interface Customer {
  customer_id: number;
  assigned_rep_id: number;
  name: string;
  address: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  sales_rep: SalesRepOption | null;
}

interface CustomersApiResponse {
  customers: Customer[];
}

interface SalesRepsApiResponse {
  salesReps: SalesRepOption[];
}

interface CreateCustomerForm {
  name: string;
  phone: string;
  address: string;
  assignedRepId: string;
}

interface CustomersPageClientProps {
  canEdit: boolean;
}

const DEFAULT_CREATE_FORM: CreateCustomerForm = {
  name: "",
  phone: "",
  address: "",
  assignedRepId: "",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

async function getApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export default function CustomersPageClient({
  canEdit,
}: CustomersPageClientProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateCustomerForm>(DEFAULT_CREATE_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const customerColumns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: "customer_id",
        header: "Customer ID",
        cell: ({ row }) => (
          <span className="[font-family:var(--font-jetbrains)] text-[11.5px] text-blue-700">
            {row.original.customer_id}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            href={`/customers/${row.original.customer_id}`}
            className="text-[13px] font-semibold text-stone-800 hover:text-blue-700 [font-family:var(--font-dmsans)]"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-stone-500 [font-family:var(--font-dmsans)]">
            <Phone size={12} />
            {row.original.phone || "-"}
          </span>
        ),
      },
      {
        id: "sales_rep",
        accessorFn: (row) => row.sales_rep?.full_name ?? "",
        header: "Sales Rep",
        cell: ({ row }) => (
          <span className="text-[12.5px] text-stone-600 [font-family:var(--font-dmsans)]">
            {row.original.sales_rep?.full_name ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "updated_at",
        header: "Last Updated",
        cell: ({ row }) => (
          <span className="text-[12.5px] text-stone-600 [font-family:var(--font-dmsans)]">
            {formatDate(row.original.updated_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`/customers/${row.original.customer_id}`}
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-stone-200 text-[12px] font-medium text-stone-600 hover:bg-stone-100 transition-colors [font-family:var(--font-dmsans)]"
          >
            View
          </Link>
        ),
      },
    ],
    [],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [customersResponse, repsResponse] = await Promise.all([
        fetch("/api/customers", { cache: "no-store" }),
        fetch("/api/sales-reps", { cache: "no-store" }),
      ]);

      if (!customersResponse.ok) {
        const error = await getApiError(
          customersResponse,
          "Failed to load customers.",
        );
        throw new Error(error);
      }

      if (!repsResponse.ok) {
        const error = await getApiError(
          repsResponse,
          "Failed to load sales reps.",
        );
        throw new Error(error);
      }

      const customersData =
        (await customersResponse.json()) as CustomersApiResponse;
      const repsData = (await repsResponse.json()) as SalesRepsApiResponse;

      setCustomers(customersData.customers ?? []);
      setSalesReps(repsData.salesReps ?? []);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load customers.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleCreateCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    setCreateError("");
    setSuccessMessage("");

    const assignedRepId = Number(createForm.assignedRepId);
    if (!Number.isInteger(assignedRepId) || assignedRepId <= 0) {
      setCreateError("Please select a sales rep.");
      setIsCreating(false);
      return;
    }

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createForm.name.trim(),
          phone: createForm.phone.trim(),
          address: createForm.address.trim(),
          assignedRepId,
        }),
      });

      if (!response.ok) {
        const error = await getApiError(response, "Failed to create customer.");
        throw new Error(error);
      }

      setCreateForm(DEFAULT_CREATE_FORM);
      setIsCreateOpen(false);
      setSuccessMessage("Customer created successfully.");
      await fetchData();
    } catch (error: unknown) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create customer.",
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
            Customers
          </p>
          <h1 className="text-[26px] font-semibold text-stone-900 [font-family:var(--font-playfair)] leading-tight">
            Customer List
          </h1>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            View and manage customer records and assigned sales reps.
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
            <Plus size={14} /> New Customer
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
              Customer Records
            </span>
            <span className="text-[11px] text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full [font-family:var(--font-dmsans)]">
              {customers.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-[13px] text-stone-500">Loading customers...</div>
        ) : (
          <DataTable
            data={customers}
            columns={customerColumns}
            minWidth={980}
            searchPlaceholder="Search customers..."
            emptyMessage="No customers found"
          />
        )}
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
                Create Customer
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
                className="w-8 h-8 rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X size={14} className="mx-auto" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                  Customer name
                </label>
                <input
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      name: event.target.value,
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

              <div className="space-y-1.5">
                <label className="text-[12.5px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                  Address
                </label>
                <input
                  value={createForm.address}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      address: event.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-[13px] text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 [font-family:var(--font-dmsans)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12.5px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                  Assigned sales rep
                </label>
                <select
                  value={createForm.assignedRepId}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      assignedRepId: event.target.value,
                    }))
                  }
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-[13px] text-stone-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-50 [font-family:var(--font-dmsans)]"
                >
                  <option value="">Select sales rep</option>
                  {salesReps.map((salesRep) => (
                    <option key={salesRep.rep_id} value={salesRep.rep_id}>
                      {salesRep.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {salesReps.length === 0 && (
                <div className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-[12.5px] text-amber-700 [font-family:var(--font-dmsans)]">
                  Add at least one sales rep before creating customers.
                </div>
              )}

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
                  disabled={isCreating || salesReps.length === 0}
                  className="px-4 py-2 rounded-xl bg-green-700 text-white text-[13px] font-semibold hover:bg-green-800 disabled:opacity-70 transition-colors [font-family:var(--font-dmsans)]"
                >
                  {isCreating ? "Creating..." : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
