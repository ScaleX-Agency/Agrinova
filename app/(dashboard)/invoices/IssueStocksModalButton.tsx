"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import type {
  CreateGoodsIssueNoteRequestDto,
  CreateGoodsIssueNoteResponse,
  InvoiceDetailResponse,
} from "@/types/api";

type InvoiceLinePreview = {
  productName: string;
  packSize: string;
  quantity: number;
  freeQuantity: number;
};

type IssueStocksModalButtonProps = {
  invoiceId: number;
  disabled: boolean;
  disabledTitle?: string;
  buttonClassName: string;
  preloadedLines?: InvoiceLinePreview[];
};

const getTodayDateInputValue = () => new Date().toISOString().split("T")[0];

const IssueStocksModalButton = ({
  invoiceId,
  disabled,
  disabledTitle,
  buttonClassName,
  preloadedLines,
}: IssueStocksModalButtonProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [ginNumber, setGinNumber] = useState("");
  const [ginDate, setGinDate] = useState(getTodayDateInputValue);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const invoiceDetailQuery = useQuery({
    queryKey: ["issue-stocks-modal-invoice", invoiceId],
    enabled: isOpen && !preloadedLines,
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      const result = (await response.json()) as InvoiceDetailResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load invoice lines.");
      }
      if (!result.data) {
        throw new Error("Invoice detail payload is missing.");
      }
      return result.data;
    },
  });

  const createGinMutation = useMutation({
    mutationFn: async (payload: CreateGoodsIssueNoteRequestDto) => {
      const response = await fetch("/api/goods-issue-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as CreateGoodsIssueNoteResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to create goods issue note.");
      }
      if (!result.data) {
        throw new Error("Create goods issue note response payload is missing.");
      }
      return result.data;
    },
  });

  const displayLines = useMemo<InvoiceLinePreview[]>(() => {
    if (preloadedLines) {
      return preloadedLines;
    }
    if (!invoiceDetailQuery.data) {
      return [];
    }

    return invoiceDetailQuery.data.lines.map((line) => ({
      productName: line.productName,
      packSize: line.packSize,
      quantity: line.quantity,
      freeQuantity: line.freeQuantity,
    }));
  }, [invoiceDetailQuery.data, preloadedLines]);

  const openModal = () => {
    if (disabled) return;
    setIsOpen(true);
    setError("");
  };

  const handleSubmit = async () => {
    setError("");

    if (!ginNumber.trim()) {
      setError("GIN number is required.");
      return;
    }

    if (!ginDate.trim() || Number.isNaN(new Date(ginDate).getTime())) {
      setError("Valid date is required.");
      return;
    }

    try {
      const payload: CreateGoodsIssueNoteRequestDto = {
        ginNumber: ginNumber.trim(),
        ginDate,
        invoiceId,
        notes: notes.trim() || undefined,
      };
      await createGinMutation.mutateAsync(payload);
      setIsOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to issue stocks.",
      );
    }
  };

  if (disabled) {
    return (
      <span
        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 px-2.5 py-1.5 text-[12px] font-medium text-stone-400"
        title={disabledTitle ?? "Issue stocks is not available"}
      >
        <Package size={12} />
        Issue Stocks
      </span>
    );
  }

  return (
    <>
      <button type="button" onClick={openModal} className={buttonClassName}>
        <Package size={12} />
        Issue Stocks
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-stone-900">
                Issue Stocks
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md px-2 py-1 text-stone-500 hover:bg-stone-100"
              >
                x
              </button>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-700">
                  GIN Number
                </span>
                <input
                  value={ginNumber}
                  onChange={(event) => setGinNumber(event.target.value)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] outline-none focus:border-[#1a5c2e]"
                  placeholder="GIN-YYYYMM-001"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-700">
                  Date
                </span>
                <input
                  type="date"
                  value={ginDate}
                  onChange={(event) => setGinDate(event.target.value)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] outline-none focus:border-[#1a5c2e]"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-700">
                  Notes
                </span>
                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] outline-none focus:border-[#1a5c2e]"
                  placeholder="Optional notes"
                />
              </label>
            </div>

            <div className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-stone-500">
              Products & Qty
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border border-stone-200">
              <table className="w-full border-collapse text-[13px]">
                <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.08em] text-stone-500">
                  <tr>
                    <th className="border-b border-stone-200 px-3 py-2 text-left">
                      Product
                    </th>
                    <th className="border-b border-stone-200 px-3 py-2 text-left">
                      Pack
                    </th>
                    <th className="border-b border-stone-200 px-3 py-2 text-center">
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceDetailQuery.isLoading && !preloadedLines ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-stone-500">
                        Loading invoice products...
                      </td>
                    </tr>
                  ) : displayLines.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-stone-500">
                        No products found for this invoice.
                      </td>
                    </tr>
                  ) : (
                    displayLines.map((line, index) => (
                      <tr key={`${line.productName}-${index}`}>
                        <td className="border-b border-stone-100 px-3 py-2 text-stone-800">
                          {line.productName}
                        </td>
                        <td className="border-b border-stone-100 px-3 py-2 text-stone-600">
                          {line.packSize}
                        </td>
                        <td className="border-b border-stone-100 px-3 py-2 text-center text-stone-800">
                          {line.quantity}
                          {line.freeQuantity > 0
                            ? ` (+${line.freeQuantity} free)`
                            : ""}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {error && <p className="mt-3 text-[12px] text-red-700">{error}</p>}

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
                onClick={handleSubmit}
                disabled={createGinMutation.isPending}
                className="rounded-lg bg-[#1a5c2e] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#2d7a42] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createGinMutation.isPending ? "Issuing..." : "Issue Stocks"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default IssueStocksModalButton;
