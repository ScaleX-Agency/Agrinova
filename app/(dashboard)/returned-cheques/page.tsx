"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import type { ReturnedChequeOptionDto, ReturnedChequesResponse } from "@/types/api";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export default function ReturnedChequesPage() {
  const queryClient = useQueryClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const returnedChequesQuery = useQuery<ReturnedChequeOptionDto[], Error>({
    queryKey: ["returned-cheques"],
    queryFn: async () => {
      const response = await fetch("/api/returned-cheques");
      const result = (await response.json()) as ReturnedChequesResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load returned cheques.");
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/returned-cheques/${id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Failed to revert returned cheque.");
    },
    onSuccess: async () => {
      setPendingDeleteId(null);
      setError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["returned-cheques"] }),
        queryClient.invalidateQueries({ queryKey: ["receipts-list"] }),
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to revert returned cheque.");
    },
  });

  const columns = useMemo<ColumnDef<ReturnedChequeOptionDto>[]>(
    () => [
      {
        accessorKey: "returnDate",
        header: "Return Date",
        cell: ({ row }) => formatDate(row.original.returnDate),
      },
      {
        accessorKey: "receiptNo",
        header: "Receipt #",
        cell: ({ row }) => <span className="font-medium text-[#2b2d7e]">{row.original.receiptNo}</span>,
      },
      {
        accessorKey: "invoiceNo",
        header: "Invoice #",
      },
      {
        accessorKey: "customerName",
        header: "Customer",
      },
      {
        accessorKey: "chequeNo",
        header: "Cheque No",
        cell: ({ row }) => row.original.chequeNo ?? "-",
      },
      {
        accessorKey: "bankName",
        header: "Bank",
        cell: ({ row }) => row.original.bankName ?? "-",
      },
      {
        accessorKey: "amount",
        header: "Amount",
        meta: { align: "right" },
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
      {
        accessorKey: "reason",
        header: "Reason",
      },
      {
        id: "action",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => {
              setError("");
              setPendingDeleteId(row.original.id);
            }}
            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[12px] font-medium text-red-700 hover:bg-red-100"
          >
            Revert
          </button>
        ),
      },
    ],
    [],
  );

  return (
    <section className="space-y-5">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Sales</p>
        <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-dmsans)] font-semibold">
          Returned Cheques
        </h1>
        <p className="text-[13px] text-stone-500">Cheque receipts marked as returned with financial reversals.</p>
      </header>

      <DataTable
        data={returnedChequesQuery.data ?? []}
        columns={columns}
        minWidth={1200}
        isLoading={returnedChequesQuery.isLoading}
        searchPlaceholder="Search receipt, invoice, customer, reason"
        emptyMessage="No returned cheque records found."
      />

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
      ) : null}

      {pendingDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="text-[16px] font-semibold text-stone-900">Revert returned cheque?</h3>
            <p className="mt-2 text-[13px] text-stone-600">
              This will restore the receipt as active payment and remove reversal settlement/commission entries.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(pendingDeleteId)}
                className="rounded-lg bg-red-700 px-3 py-2 text-[13px] font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Reverting..." : "Revert"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
