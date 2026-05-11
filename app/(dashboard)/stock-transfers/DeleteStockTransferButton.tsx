"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

type DeleteStockTransferButtonProps = {
  transferId: number;
  transferNo: string;
  redirectTo?: string | null;
};

const DeleteStockTransferButton = ({
  transferId,
  transferNo,
  redirectTo = "/stock-transfers",
}: DeleteStockTransferButtonProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/stock-transfers/${transferId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to delete stock transfer.");
      }
    },
    onSuccess: () => {
      setIsOpen(false);
      setError("");
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to delete stock transfer.",
      );
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
        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700 transition-colors hover:bg-red-100"
      >
        <Trash2 size={14} />
        Delete Transfer
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="text-[16px] font-semibold text-stone-900">Delete {transferNo}?</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-stone-600">
              This soft-deletes the stock transfer and reverses stock with transfer reversal movements.
            </p>
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
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
                className="rounded-lg bg-red-700 px-3 py-2 text-[13px] font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Transfer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default DeleteStockTransferButton;

