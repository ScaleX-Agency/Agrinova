"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import type {
  CreateSalesReturnRequestDto,
  CreateSalesReturnResponse,
  InvoiceDetailResponse,
  ReturnNumberAvailabilityResponse,
} from "@/types/api";

type ReturnLineDraft = {
  lineId: number;
  productId: number;
  productName: string;
  packSize: string;
  returnableQty: number;
  returnQty: number;
  usableQty: number;
  condition: string;
  reasonForReturn: string;
  deductionAmount: number;
  invoiceLineBalanceAmount: number;
  defaultUnitRate: number;
};

type RecordReturnsModalButtonProps = {
  invoiceId: number;
  disabled: boolean;
  disabledTitle?: string;
  buttonClassName: string;
};

const getTodayDateInputValue = () => new Date().toISOString().split("T")[0];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const RecordReturnsModalButton = ({
  invoiceId,
  disabled,
  disabledTitle,
  buttonClassName,
}: RecordReturnsModalButtonProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [returnNumber, setReturnNumber] = useState("");
  const [debouncedReturnNumber, setDebouncedReturnNumber] = useState("");
  const [returnDate, setReturnDate] = useState(getTodayDateInputValue);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [lineDrafts, setLineDrafts] = useState<ReturnLineDraft[]>([]);

  const invoiceDetailQuery = useQuery({
    queryKey: ["record-returns-modal-invoice", invoiceId],
    enabled: isOpen,
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      const result = (await response.json()) as InvoiceDetailResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load invoice details.");
      }
      if (!result.data) {
        throw new Error("Invoice detail payload is missing.");
      }
      return result.data;
    },
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedReturnNumber(returnNumber.trim());
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [returnNumber]);

  const checkReturnNumberAvailability = async (value: string) => {
    const params = new URLSearchParams({
      checkReturnNo: "true",
      returnNumber: value,
    });
    const response = await fetch(`/api/sales-return-notes?${params.toString()}`);
    const result = (await response.json()) as ReturnNumberAvailabilityResponse;
    if (!response.ok) {
      throw new Error(result.error ?? "Failed to check return number.");
    }
    if (!result.data) {
      throw new Error("Return number check response is missing.");
    }
    return result.data;
  };

  const returnNoAvailabilityQuery = useQuery({
    queryKey: ["return-number-availability", debouncedReturnNumber],
    enabled: isOpen && debouncedReturnNumber.length > 0,
    queryFn: () => checkReturnNumberAvailability(debouncedReturnNumber),
    staleTime: 0,
  });

  const baseDrafts = useMemo<ReturnLineDraft[]>(() => {
    if (!invoiceDetailQuery.data) return [];
    return invoiceDetailQuery.data.lines
      .map((line) => {
        const returnableQty = Math.max(
          0,
          (line.issuedQuantity ?? 0) - (line.returnedQuantity ?? 0),
        );
        const defaultUnitRate =
          line.quantity > 0 ? line.netLineTotal / line.quantity : 0;
        return {
          lineId: line.lineId,
          productId: line.productId,
          productName: line.productName,
          packSize: line.packSize,
          returnableQty,
          returnQty: 0,
          usableQty: 0,
          condition: "",
          reasonForReturn: "",
          deductionAmount: 0,
          invoiceLineBalanceAmount: line.balanceAmount,
          defaultUnitRate,
        } satisfies ReturnLineDraft;
      })
      .filter((line) => line.returnableQty > 0);
  }, [invoiceDetailQuery.data]);

  const workingLineDrafts = lineDrafts.length > 0 ? lineDrafts : baseDrafts;

  const createReturnMutation = useMutation({
    mutationFn: async (payload: CreateSalesReturnRequestDto) => {
      const response = await fetch("/api/sales-return-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as CreateSalesReturnResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to create sales return.");
      }
      if (!result.data) {
        throw new Error("Create sales return response payload is missing.");
      }
      return result.data;
    },
  });

  const openModal = () => {
    if (disabled) return;
    setError("");
    setReturnNumber("");
    setReturnDate(getTodayDateInputValue());
    setNotes("");
    setLineDrafts([]);
    setIsOpen(true);
  };

  const setDraftValue = (
    lineId: number,
    updater: (draft: ReturnLineDraft) => ReturnLineDraft,
  ) => {
    setLineDrafts((current) =>
      (current.length > 0 ? current : baseDrafts).map((draft) =>
        draft.lineId === lineId ? updater(draft) : draft,
      ),
    );
  };

  const totals = useMemo(() => {
    return workingLineDrafts.reduce(
      (acc, line) => {
        const unusable = Math.max(0, line.returnQty - line.usableQty);
        acc.returnQty += line.returnQty;
        acc.usableQty += line.usableQty;
        acc.unusableQty += unusable;
        acc.totalAmount += line.returnQty > 0 ? line.deductionAmount : 0;
        return acc;
      },
      { returnQty: 0, usableQty: 0, unusableQty: 0, totalAmount: 0 },
    );
  }, [workingLineDrafts]);

  const handleSubmit = async () => {
    setError("");
    if (!returnDate || Number.isNaN(new Date(returnDate).getTime())) {
      setError("Valid return date is required.");
      return;
    }
    if (!returnNumber.trim()) {
      setError("Return number is required.");
      return;
    }
    try {
      const availability = await checkReturnNumberAvailability(returnNumber.trim());
      if (!availability.isUnique) {
        setError("An active return with this number already exists.");
        return;
      }
    } catch (availabilityError) {
      setError(
        availabilityError instanceof Error
          ? availabilityError.message
          : "Failed to check return number.",
      );
      return;
    }

    const selectedLines = workingLineDrafts.filter((line) => line.returnQty > 0);
    if (selectedLines.length === 0) {
      setError("Add at least one return line with return quantity.");
      return;
    }

    for (const line of selectedLines) {
      if (line.returnQty > line.returnableQty) {
        setError(`${line.productName}: return qty exceeds max returnable.`);
        return;
      }
      if (line.usableQty < 0 || line.usableQty > line.returnQty) {
        setError(`${line.productName}: invalid usable quantity.`);
        return;
      }
      if (!line.condition.trim()) {
        setError(`${line.productName}: condition is required.`);
        return;
      }
      if (!line.reasonForReturn.trim()) {
        setError(`${line.productName}: reason is required.`);
        return;
      }
      if (!Number.isFinite(line.deductionAmount) || line.deductionAmount < 0) {
        setError(`${line.productName}: deduction must be 0 or greater.`);
        return;
      }
      if (line.deductionAmount > line.invoiceLineBalanceAmount) {
        setError(`${line.productName}: deduction exceeds invoice line balance.`);
        return;
      }
    }

    try {
      const payload: CreateSalesReturnRequestDto = {
        invoiceId,
        returnNumber: returnNumber.trim(),
        returnDate,
        notes: notes.trim() || undefined,
        lines: selectedLines.map((line) => ({
          lineId: line.lineId,
          productId: line.productId,
          quantityUsable: line.usableQty,
          quantityUnusable: line.returnQty - line.usableQty,
          condition: line.condition.trim(),
          reasonForReturn: line.reasonForReturn.trim(),
          lineTotal: line.deductionAmount,
        })),
      };
      await createReturnMutation.mutateAsync(payload);
      setIsOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to record return.",
      );
    }
  };

  if (disabled) {
    return (
      <span
        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 px-2.5 py-1.5 text-[12px] font-medium text-stone-400"
        title={disabledTitle ?? "Record return is not available"}
      >
        <RotateCcw size={12} />
        Record Return
      </span>
    );
  }

  return (
    <>
      <button type="button" onClick={openModal} className={buttonClassName}>
        <RotateCcw size={12} />
        Record Return
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-6xl rounded-xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-stone-900">
                Record Return
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
                  Return Number
                </span>
                <input
                  value={returnNumber}
                  onChange={(event) => {
                    setReturnNumber(event.target.value);
                    setError("");
                  }}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] outline-none focus:border-[#1a5c2e]"
                  placeholder="SRN-YYYYMM-001"
                />
                {returnNumber.trim().length > 0 &&
                  (returnNoAvailabilityQuery.isFetching ? (
                    <p className="text-[12px] text-stone-500">Checking return number...</p>
                  ) : returnNoAvailabilityQuery.data?.isUnique ? (
                    <p className="text-[12px] text-stone-500">Return number is available.</p>
                  ) : (
                    <p className="text-[12px] text-red-700">An active return with this number already exists.</p>
                  ))}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-700">
                  Return Date
                </span>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(event) => setReturnDate(event.target.value)}
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

            <div className="max-h-[420px] overflow-auto rounded-lg border border-stone-200">
              <table className="w-full table-fixed border-collapse text-[12px]">
                <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.08em] text-stone-500">
                  <tr>
                    <th className="border-b border-stone-200 px-3 py-2 text-left">Product</th>
                    <th className="border-b border-stone-200 px-3 py-2 text-center">Returnable Qty</th>
                    <th className="border-b border-stone-200 px-3 py-2 text-center">Return Qty</th>
                    <th className="border-b border-stone-200 px-3 py-2 text-center">Usable Qty</th>
                    <th className="border-b border-stone-200 px-3 py-2 text-right">Balance</th>
                    <th className="border-b border-stone-200 px-3 py-2 text-center">Unusable</th>
                    <th className="border-b border-stone-200 px-3 py-2 text-left">Condition</th>
                    <th className="border-b border-stone-200 px-3 py-2 text-left">Reason</th>
                    <th className="border-b border-stone-200 px-3 py-2 text-right">Deduction</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceDetailQuery.isLoading ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-3 text-stone-500">
                        Loading invoice products...
                      </td>
                    </tr>
                  ) : workingLineDrafts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-3 text-stone-500">
                        No returnable lines are available.
                      </td>
                    </tr>
                  ) : (
                    workingLineDrafts.map((line) => {
                      const unusableQty = Math.max(
                        0,
                        line.returnQty - line.usableQty,
                      );
                      return (
                        <tr key={line.lineId}>
                          <td className="border-b border-stone-100 px-2 py-2 text-stone-800">
                            <div className="font-medium">{line.productName}</div>
                            <div className="text-[11px] text-stone-500">{line.packSize}</div>
                          </td>
                          <td className="border-b border-stone-100 px-2 py-2 text-center">{line.returnableQty}</td>
                          <td className="border-b border-stone-100 px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              max={line.returnableQty}
                              value={line.returnQty}
                              onChange={(event) => {
                                const returnQty = Math.max(
                                  0,
                                  Number(event.target.value) || 0,
                                );
                                const clampedReturn = Math.min(
                                  line.returnableQty,
                                  returnQty,
                                );
                                setDraftValue(line.lineId, (current) => {
                                  const nextUsableQty = Math.min(
                                    current.usableQty,
                                    clampedReturn,
                                  );
                                  return {
                                    ...current,
                                    returnQty: clampedReturn,
                                    usableQty: nextUsableQty,
                                    deductionAmount:
                                      clampedReturn > 0
                                        ? Math.min(
                                            current.invoiceLineBalanceAmount,
                                            Number(
                                              (
                                                current.defaultUnitRate * clampedReturn
                                              ).toFixed(2),
                                            ),
                                          )
                                        : 0,
                                  };
                                });
                              }}
                              className="w-full min-w-0 rounded-md border border-stone-300 px-2 py-1 text-[12px] outline-none focus:border-[#1a5c2e]"
                            />
                          </td>
                          <td className="border-b border-stone-100 px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              max={line.returnQty}
                              value={line.usableQty}
                              onChange={(event) => {
                                const usableQty = Math.max(
                                  0,
                                  Number(event.target.value) || 0,
                                );
                                setDraftValue(line.lineId, (current) => ({
                                  ...current,
                                  usableQty: Math.min(
                                    current.returnQty,
                                    usableQty,
                                  ),
                                }));
                              }}
                              className="w-full min-w-0 rounded-md border border-stone-300 px-2 py-1 text-[12px] outline-none focus:border-[#1a5c2e]"
                            />
                          </td>
                          <td className="border-b border-stone-100 px-2 py-2 text-right text-stone-700">
                            {formatCurrency(line.invoiceLineBalanceAmount)}
                          </td>
                          <td className="border-b border-stone-100 px-2 py-2 text-center font-medium text-amber-700">
                            {unusableQty}
                          </td>
                          <td className="border-b border-stone-100 px-2 py-2">
                            <input
                              value={line.condition}
                              onChange={(event) =>
                                setDraftValue(line.lineId, (current) => ({
                                  ...current,
                                  condition: event.target.value,
                                }))
                              }
                              className="w-full min-w-0 rounded-md border border-stone-300 px-2 py-1 text-[12px] outline-none focus:border-[#1a5c2e]"
                            />
                          </td>
                          <td className="border-b border-stone-100 px-2 py-2">
                            <input
                              value={line.reasonForReturn}
                              onChange={(event) =>
                                setDraftValue(line.lineId, (current) => ({
                                  ...current,
                                  reasonForReturn: event.target.value,
                                }))
                              }
                              className="w-full min-w-0 rounded-md border border-stone-300 px-2 py-1 text-[12px] outline-none focus:border-[#1a5c2e]"
                            />
                          </td>
                          <td className="border-b border-stone-100 px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              max={line.invoiceLineBalanceAmount}
                              value={line.deductionAmount}
                              onChange={(event) =>
                                setDraftValue(line.lineId, (current) => ({
                                  ...current,
                                  deductionAmount: Math.min(
                                    current.invoiceLineBalanceAmount,
                                    Math.max(0, Number(event.target.value) || 0),
                                  ),
                                }))
                              }
                              className="w-full min-w-0 rounded-md border border-stone-300 px-2 py-1 text-right text-[12px] outline-none focus:border-[#1a5c2e]"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">Return Qty</p>
                <p className="mt-1 text-[14px] font-semibold text-stone-900">{totals.returnQty}</p>
              </div>
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">Usable Qty</p>
                <p className="mt-1 text-[14px] font-semibold text-stone-900">{totals.usableQty}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-amber-700">Unusable Qty</p>
                <p className="mt-1 text-[14px] font-semibold text-amber-800">{totals.unusableQty}</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-blue-700">Credit Amount</p>
                <p className="mt-1 text-[14px] font-semibold text-blue-800">{formatCurrency(totals.totalAmount)}</p>
              </div>
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
                disabled={createReturnMutation.isPending}
                className="rounded-lg bg-[#1a5c2e] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#2d7a42] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createReturnMutation.isPending ? "Saving..." : "Save Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RecordReturnsModalButton;
