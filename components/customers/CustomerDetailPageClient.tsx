"use client";

  // eslint-disable-next-line
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  ShieldUser,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import BackNavigationLink from "@/components/ui/BackNavigationLink";

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

interface CustomerDetailApiResponse {
  customer: Customer;
}

interface SalesRepsApiResponse {
  salesReps: SalesRepOption[];
}

interface EditCustomerForm {
  name: string;
  phone: string;
  address: string;
  assignedRepId: string;
}

interface CustomerDetailPageClientProps {
  customerId: string;
  canEdit: boolean;
}

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

export default function CustomerDetailPageClient({
  customerId,
  canEdit,
}: CustomerDetailPageClientProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [form, setForm] = useState<EditCustomerForm>({
    name: "",
    phone: "",
    address: "",
    assignedRepId: "",
  });

  const resolvedCustomerId = useMemo(() => {
    const parsed = Number(customerId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [customerId]);

  const hasEditChanges =
    !!customer &&
    (form.name.trim() !== customer.name.trim() ||
      form.phone.trim() !== (customer.phone ?? "").trim() ||
      form.address.trim() !== (customer.address ?? "").trim() ||
      Number(form.assignedRepId) !== customer.assigned_rep_id);

  const fetchCustomer = useCallback(async () => {
    if (!resolvedCustomerId) {
      setLoadError("Invalid customer ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const requests: Promise<Response>[] = [
        fetch(`/api/customers/${resolvedCustomerId}`, {
          cache: "no-store",
        }),
      ];

      if (canEdit) {
        requests.push(fetch("/api/sales-reps", { cache: "no-store" }));
      }

      const [customerResponse, repsResponse] = await Promise.all(requests);

      if (!customerResponse.ok) {
        const error = await getApiError(
          customerResponse,
          "Failed to load customer details.",
        );
        throw new Error(error);
      }

      if (canEdit && repsResponse && !repsResponse.ok) {
        const error = await getApiError(
          repsResponse,
          "Failed to load sales reps.",
        );
        throw new Error(error);
      }

      const customerData =
        (await customerResponse.json()) as CustomerDetailApiResponse;
      const fetchedCustomer = customerData.customer;

      setCustomer(fetchedCustomer);
      setForm({
        name: fetchedCustomer.name,
        phone: fetchedCustomer.phone ?? "",
        address: fetchedCustomer.address ?? "",
        assignedRepId: String(fetchedCustomer.assigned_rep_id),
      });

      if (canEdit && repsResponse) {
        const repsData = (await repsResponse.json()) as SalesRepsApiResponse;
        setSalesReps(repsData.salesReps ?? []);
      }
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load customer details.",
      );
    } finally {
      setLoading(false);
    }
  }, [canEdit, resolvedCustomerId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCustomer();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchCustomer]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resolvedCustomerId) return;
    if (!hasEditChanges) return;

    const assignedRepId = Number(form.assignedRepId);
    if (!Number.isInteger(assignedRepId) || assignedRepId <= 0) {
      setSaveError("Please select a sales rep.");
      return;
    }

    setSaving(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/customers/${resolvedCustomerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          assignedRepId,
        }),
      });

      if (!response.ok) {
        const error = await getApiError(response, "Failed to update customer.");
        throw new Error(error);
      }

      const data = (await response.json()) as CustomerDetailApiResponse;
      setCustomer(data.customer);
      setForm({
        name: data.customer.name,
        phone: data.customer.phone ?? "",
        address: data.customer.address ?? "",
        assignedRepId: String(data.customer.assigned_rep_id),
      });
      setEditing(false);
      setSuccessMessage("Customer updated successfully.");
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to update customer.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!resolvedCustomerId) return;

    setDeleting(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/customers/${resolvedCustomerId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await getApiError(response, "Failed to remove customer.");
        throw new Error(error);
      }

      router.push("/customers");
      router.refresh();
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to remove customer.",
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

  if (loadError || !customer) {
    return (
      <div className="space-y-4">
        <BackNavigationLink href="/customers" label="Back to Customers" />
        <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-[13px] [font-family:var(--font-dmsans)]">
          {loadError || "Customer not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <BackNavigationLink href="/customers" label="Back to Customers" />
          <h1 className="mt-2 text-[26px] font-semibold text-stone-900 [font-family:var(--font-dmsans)] leading-tight">
            {customer.name}
          </h1>
          <p className="mt-1 text-[12px] text-blue-700 [font-family:var(--font-jetbrains)]">
            Customer ID: {customer.customer_id}
          </p>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            {canEdit
              ? "Update customer details, change assigned rep, or remove this record."
              : "View customer details."}
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
            Customer Details
          </span>
        </div>

        {editing && canEdit ? (
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                Customer name
              </label>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({
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

            <div className="space-y-1.5">
              <label className="text-[12.5px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">
                Address
              </label>
              <input
                value={form.address}
                onChange={(event) =>
                  setForm((prev) => ({
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
                value={form.assignedRepId}
                onChange={(event) =>
                  setForm((prev) => ({
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

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setForm({
                    name: customer.name,
                    phone: customer.phone ?? "",
                    address: customer.address ?? "",
                    assignedRepId: String(customer.assigned_rep_id),
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
                Customer ID
              </p>
              <p className="mt-1 text-[12px] text-blue-700 [font-family:var(--font-jetbrains)]">
                {customer.customer_id}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                Customer Name
              </p>
              <p className="mt-1 text-[14px] font-semibold text-stone-800 [font-family:var(--font-dmsans)]">
                {customer.name}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                Phone
              </p>
              <p className="mt-1 text-[13px] text-stone-700 [font-family:var(--font-dmsans)] inline-flex items-center gap-1.5">
                <Phone size={12} />
                {customer.phone || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                Assigned Sales Rep
              </p>
              <p className="mt-1 text-[13px] text-stone-700 [font-family:var(--font-dmsans)]">
                {customer.sales_rep?.full_name ?? "—"}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                Address
              </p>
              <p className="mt-1 text-[13px] text-stone-700 [font-family:var(--font-dmsans)]">
                {customer.address || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                Created At
              </p>
              <p className="mt-1 text-[13px] text-stone-700 [font-family:var(--font-dmsans)]">
                {formatDate(customer.created_at)}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                Last Updated
              </p>
              <p className="mt-1 text-[13px] text-stone-700 [font-family:var(--font-dmsans)]">
                {formatDate(customer.updated_at)}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400 [font-family:var(--font-dmsans)]">
                Record Type
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full [font-family:var(--font-dmsans)]">
                <UserRound size={12} />
                Customer
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
              <h2 className="text-[17px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
                Remove Customer
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
                  {customer.name}
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
                {deleting ? "Removing..." : "Remove Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
