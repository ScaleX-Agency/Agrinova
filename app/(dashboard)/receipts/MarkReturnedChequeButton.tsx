"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { CreateReturnedChequeRequestDto } from "@/types/api";

type MarkReturnedChequeButtonProps = {
  receiptId: number;
  receiptNo: string;
};

const getTodayDateInputValue = () => new Date().toISOString().split("T")[0];

const MarkReturnedChequeButton = ({ receiptId, receiptNo }: MarkReturnedChequeButtonProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [returnDate, setReturnDate] = useState(getTodayDateInputValue());
  const [reason, setReason] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: CreateReturnedChequeRequestDto = {
        receiptId,
        returnDate,
        reason: reason.trim(),
        bankReference: bankReference.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      const response = await fetch("/api/returned-cheques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Failed to mark cheque as returned.");
    },
    onSuccess: () => {
      setIsOpen(false);
      setError("");
      router.refresh();
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to mark cheque as returned.");
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800 transition-colors hover:bg-amber-100"
      >
        Mark Returned
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="text-[16px] font-semibold text-stone-900">Mark {receiptNo} as returned?</h3>
            <p className="mt-2 text-[13px] text-stone-600">
              This creates a returned-cheque record, deducts paid amount, and posts a negative commission adjustment.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-700">Return Date</span>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(event) => setReturnDate(event.target.value)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] text-stone-800"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-700">Reason</span>
                <input
                  type="text"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="e.g. Insufficient funds"
                  className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] text-stone-800"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-700">Bank Reference</span>
                <input
                  type="text"
                  value={bankReference}
                  onChange={(event) => setBankReference(event.target.value)}
                  placeholder="Optional"
                  className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] text-stone-800"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-700">Notes</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Optional"
                  className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] text-stone-800"
                />
              </label>
            </div>
            {error ? <p className="mt-3 text-[12px] text-red-700">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={mutation.isPending || !reason.trim() || !returnDate}
                onClick={() => mutation.mutate()}
                className="rounded-lg bg-amber-700 px-3 py-2 text-[13px] font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutation.isPending ? "Saving..." : "Confirm Return"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default MarkReturnedChequeButton;
