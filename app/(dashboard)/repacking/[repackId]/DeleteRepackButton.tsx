"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

type DeleteRepackButtonProps = {
  repackId: number;
  repackNo: string;
  redirectTo?: string | null;
};

const DeleteRepackButton = ({
  repackId,
  repackNo,
  redirectTo = "/repacking",
}: DeleteRepackButtonProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/repacking/${repackId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to delete repacking record.");
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
          : "Failed to delete repacking record.",
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
        Delete Repack
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-stone-200 bg-white p-5 shadow-lg">
            <h3 className="text-[16px] font-semibold text-stone-900">Delete Repack {repackNo}?</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-stone-600">
              This will reverse the stock levels (re-add source product quantity, subtract target product quantity) and mark this repack record as inactive.
            </p>
            {error ? <p className="mt-3 text-[12px] text-red-700 font-medium">{error}</p> : null}
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
                {deleteMutation.isPending ? "Deleting..." : "Delete Repack"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default DeleteRepackButton;
