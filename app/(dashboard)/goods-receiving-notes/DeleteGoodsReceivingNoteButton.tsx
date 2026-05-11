"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

type DeleteGoodsReceivingNoteButtonProps = {
  grnId: number;
  grnNumber: string;
  redirectTo?: string | null;
  compact?: boolean;
};

const DeleteGoodsReceivingNoteButton = ({
  grnId,
  grnNumber,
  redirectTo = "/goods-receiving-notes",
  compact = false,
}: DeleteGoodsReceivingNoteButtonProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/goods-receiving-notes/${grnId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to delete goods receiving note.");
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
          : "Failed to delete goods receiving note.",
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
        className={
          compact
            ? "inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100"
            : "inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700 transition-colors hover:bg-red-100"
        }
      >
        <Trash2 size={compact ? 12 : 14} />
        {compact ? "Delete" : "Delete GRN"}
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="text-[16px] font-semibold text-stone-900">
              Delete {grnNumber}?
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-stone-600">
              This reverses received stock, creates purchase reversal stock
              movements, and soft-deletes the goods receiving note.
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
                {deleteMutation.isPending ? "Deleting..." : "Delete GRN"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default DeleteGoodsReceivingNoteButton;
