"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Boxes, Calculator, ClipboardList, Plus, RotateCcw, Trash2, X } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
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
  const [selectedProductLineId, setSelectedProductLineId] = useState<number | null>(null);

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

  const workingLineDrafts = lineDrafts;
  const selectedLineIds = useMemo(
    () => new Set(workingLineDrafts.map((line) => line.lineId)),
    [workingLineDrafts],
  );
  const availableProductOptions = useMemo(
    () =>
      baseDrafts
        .filter((line) => !selectedLineIds.has(line.lineId))
        .map((line) => ({
          id: line.lineId,
          label: line.productName,
          description: `${line.packSize} • Returnable: ${line.returnableQty}`,
          searchText: `${line.productName} ${line.packSize}`,
        })),
    [baseDrafts, selectedLineIds],
  );

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
    setSelectedProductLineId(null);
    setIsOpen(true);
  };

  const handleAddProductLine = () => {
    if (!selectedProductLineId) return;
    const selectedBaseLine = baseDrafts.find((line) => line.lineId === selectedProductLineId);
    if (!selectedBaseLine) return;
    if (selectedLineIds.has(selectedProductLineId)) return;
    setLineDrafts((current) => [...current, selectedBaseLine]);
    setSelectedProductLineId(null);
    setError("");
  };

  const handleRemoveProductLine = (lineId: number) => {
    setLineDrafts((current) => current.filter((line) => line.lineId !== lineId));
    setError("");
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

  const vatPercentage = invoiceDetailQuery.data?.vatPercentage ?? 0;

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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 md:items-center">
          <div className="flex max-h-[92vh] w-full max-w-[96vw] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[#faf9f5] p-4 xl:max-w-[1500px]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-700">
                  <RotateCcw size={15} />
                </span>
                <h2 className="text-[18px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
                  Record Sales Return
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <section className="mb-3 shrink-0 rounded-2xl border border-stone-200 bg-white p-3 md:p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-700">
                  <ClipboardList size={16} />
                </span>
                <h3 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
                  Return Details
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-600 [font-family:var(--font-dmsans)]">
                  Return Number <span className="text-red-600">*</span>
                </span>
                <input
                  value={returnNumber}
                  onChange={(event) => {
                    setReturnNumber(event.target.value);
                    setError("");
                  }}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 [font-family:var(--font-dmsans)] outline-none focus:border-[#1a5c2e]"
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
                <span className="text-[12px] font-medium text-stone-600 [font-family:var(--font-dmsans)]">
                  Return Date <span className="text-red-600">*</span>
                </span>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(event) => setReturnDate(event.target.value)}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 [font-family:var(--font-dmsans)] outline-none focus:border-[#1a5c2e]"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-600 [font-family:var(--font-dmsans)]">
                  Notes
                </span>
                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 [font-family:var(--font-dmsans)] outline-none focus:border-[#1a5c2e]"
                  placeholder="Optional notes (e.g. damaged in transit)"
                />
              </label>
              </div>
            </section>

            <section className="mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 md:p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <Boxes size={16} />
                </span>
                <h3 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
                  Return Items
                </h3>
              </div>

            <div className="mb-2 rounded-xl border border-stone-200 bg-stone-50 p-2 md:w-1/2">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[12px] font-medium text-stone-700 [font-family:var(--font-dmsans)]">Add Product</p>
                <p className="text-[11px] text-stone-500">
                  {workingLineDrafts.length}/{baseDrafts.length}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[minmax(0,1fr)_auto]">
                <SearchableSelect
                  value={selectedProductLineId}
                  onChange={setSelectedProductLineId}
                  options={availableProductOptions}
                  placeholder="Select product"
                  searchPlaceholder="Search product..."
                  emptyMessage="No more items."
                  loading={invoiceDetailQuery.isLoading}
                  disabled={invoiceDetailQuery.isLoading || availableProductOptions.length === 0}
                />
                <button
                  type="button"
                  onClick={handleAddProductLine}
                  disabled={!selectedProductLineId}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#1a5c2e] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#2d7a42] disabled:cursor-not-allowed disabled:opacity-60 [font-family:var(--font-dmsans)]"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-stone-200 bg-white">
              <table className="min-w-[1150px] w-full table-fixed border-collapse text-[12px]">
                <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.08em] text-stone-500">
                  <tr>
                    <th className="sticky top-0 border-b border-stone-200 px-3 py-2 text-left">Product</th>
                    <th className="sticky top-0 border-b border-stone-200 px-3 py-2 text-center">Returnable</th>
                    <th className="sticky top-0 border-b border-stone-200 px-3 py-2 text-center">Return Qty</th>
                    <th className="sticky top-0 border-b border-stone-200 px-3 py-2 text-center">Usable Qty</th>
                    <th className="sticky top-0 border-b border-stone-200 px-3 py-2 text-right">Line Balance</th>
                    <th className="sticky top-0 border-b border-stone-200 px-3 py-2 text-center">Unusable</th>
                    <th className="sticky top-0 border-b border-stone-200 px-3 py-2 text-left">Condition</th>
                    <th className="sticky top-0 border-b border-stone-200 px-3 py-2 text-left">Reason</th>
                    <th className="sticky top-0 border-b border-stone-200 px-3 py-2 text-right">Deduction (LKR)</th>
                    <th className="sticky top-0 border-b border-stone-200 px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceDetailQuery.isLoading ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-3 text-stone-500">
                        Loading invoice products...
                      </td>
                    </tr>
                  ) : workingLineDrafts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-3 text-stone-500">
                        No products added yet. Select a product above to start recording returns.
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
                            <div className="break-words font-medium">{line.productName}</div>
                            <div className="break-words text-[11px] text-stone-500">{line.packSize}</div>
                          </td>
                          <td className="border-b border-stone-100 px-2 py-2 text-center">{line.returnableQty}</td>
                          <td className="border-b border-stone-100 px-2 py-2">
                            <div className="flex items-center gap-1">
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
                              <button
                                type="button"
                                onClick={() =>
                                  setDraftValue(line.lineId, (current) => ({
                                    ...current,
                                    returnQty: current.returnableQty,
                                    usableQty: Math.min(current.usableQty, current.returnableQty),
                                    deductionAmount: Math.min(
                                      current.invoiceLineBalanceAmount,
                                      Number((current.defaultUnitRate * current.returnableQty).toFixed(2)),
                                    ),
                                  }))
                                }
                                className="rounded border border-stone-300 px-1.5 py-1 text-[10px] font-medium text-stone-600 hover:bg-stone-50"
                                title="Set max returnable quantity"
                              >
                                Max
                              </button>
                            </div>
                          </td>
                          <td className="border-b border-stone-100 px-2 py-2">
                            <div className="flex items-center gap-1">
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
                              <button
                                type="button"
                                onClick={() =>
                                  setDraftValue(line.lineId, (current) => ({
                                    ...current,
                                    usableQty: current.returnQty,
                                  }))
                                }
                                className="rounded border border-stone-300 px-1.5 py-1 text-[10px] font-medium text-stone-600 hover:bg-stone-50"
                                title="Set usable quantity equal to return quantity"
                              >
                                All
                              </button>
                            </div>
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
                              placeholder="Good / Damaged"
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
                              placeholder="Reason for return"
                            />
                          </td>
                          <td className="border-b border-stone-100 px-2 py-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-medium text-stone-500">LKR</span>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                max={line.invoiceLineBalanceAmount}
                                value={line.deductionAmount}
                                disabled={line.returnQty <= 0}
                                onChange={(event) =>
                                  setDraftValue(line.lineId, (current) => ({
                                    ...current,
                                    deductionAmount: Math.min(
                                      current.invoiceLineBalanceAmount,
                                      Math.max(0, Number(event.target.value) || 0),
                                    ),
                                  }))
                                }
                                className="w-full min-w-0 rounded-md border border-stone-300 px-2 py-1 text-right text-[12px] outline-none focus:border-[#1a5c2e] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
                              />
                            </div>
                          </td>
                          <td className="border-b border-stone-100 px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveProductLine(line.lineId)}
                              className="inline-flex items-center justify-center rounded border border-stone-300 p-1.5 text-stone-600 hover:bg-stone-50"
                              title="Remove line"
                              aria-label={`Remove ${line.productName}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            </section>

            <section className="shrink-0 rounded-2xl border border-stone-200 bg-white p-3 md:p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <Calculator size={16} />
                </span>
                <h3 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
                  Totals
                </h3>
              </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">Return Qty</p>
                <p className="mt-1 text-[14px] font-semibold text-stone-900">{totals.returnQty}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">Usable Qty</p>
                <p className="mt-1 text-[14px] font-semibold text-stone-900">{totals.usableQty}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                <p className="text-[11px] uppercase tracking-[0.08em] text-amber-700">Unusable Qty</p>
                <p className="mt-1 text-[14px] font-semibold text-amber-800">{totals.unusableQty}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5">
                <p className="text-[11px] uppercase tracking-[0.08em] text-blue-700">
                  Credit Amount {vatPercentage > 0 ? `(inc. ${vatPercentage}% VAT)` : ""}
                </p>
                <p className="mt-1 text-[14px] font-semibold text-blue-800">
                  {formatCurrency(totals.totalAmount * (1 + vatPercentage / 100))}
                </p>
              </div>
            </div>
            </section>

            {error && <p className="mt-3 text-[12px] text-red-700">{error}</p>}

            <div className="mt-3 flex shrink-0 justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50 [font-family:var(--font-dmsans)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={createReturnMutation.isPending}
                className="rounded-xl bg-[#1a5c2e] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#2d7a42] disabled:cursor-not-allowed disabled:opacity-60 [font-family:var(--font-dmsans)]"
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
