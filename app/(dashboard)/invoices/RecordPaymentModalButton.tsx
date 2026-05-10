"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { DollarSign } from "lucide-react";
import type {
  CreateReceiptRequestDto,
  CreateReceiptResponse,
  InvoiceDetailResponse,
  ReceiptMethod,
} from "@/types/api";

type PaymentInvoiceSnapshot = {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  repName: string;
  totalAmount: number;
  totalPaid: number;
  creditedAmount: number;
  outstandingAmount: number;
};

type RecordPaymentModalButtonProps = {
  invoiceId: number;
  disabled: boolean;
  disabledTitle?: string;
  buttonClassName: string;
  preloadedSnapshot?: PaymentInvoiceSnapshot;
};

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

const formatCurrencyInput = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const parseCurrencyInput = (value: string) => {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const getTodayDateInputValue = () => new Date().toISOString().split("T")[0];

const RecordPaymentModalButton = ({
  invoiceId,
  disabled,
  disabledTitle,
  buttonClassName,
  preloadedSnapshot,
}: RecordPaymentModalButtonProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [receiptDate, setReceiptDate] = useState(getTodayDateInputValue);
  const [amountDraft, setAmountDraft] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<ReceiptMethod>("CASH");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const invoiceDetailQuery = useQuery({
    queryKey: ["record-payment-modal-invoice", invoiceId],
    enabled: isOpen && !preloadedSnapshot,
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

  const createReceiptMutation = useMutation({
    mutationFn: async (payload: CreateReceiptRequestDto) => {
      const response = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as CreateReceiptResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to create receipt.");
      }
      if (!result.data) {
        throw new Error("Create receipt response payload is missing.");
      }
      return result.data;
    },
  });

  const snapshot = useMemo<PaymentInvoiceSnapshot | null>(() => {
    if (preloadedSnapshot) return preloadedSnapshot;
    if (!invoiceDetailQuery.data) return null;
    return {
      invoiceNo: invoiceDetailQuery.data.invoiceNo,
      invoiceDate: invoiceDetailQuery.data.invoiceDate,
      customerName: invoiceDetailQuery.data.customerName,
      repName: invoiceDetailQuery.data.repName,
      totalAmount: invoiceDetailQuery.data.totalAmount,
      totalPaid: invoiceDetailQuery.data.totalPaid,
      creditedAmount: invoiceDetailQuery.data.creditedAmount,
      outstandingAmount: invoiceDetailQuery.data.outstandingAmount,
    };
  }, [invoiceDetailQuery.data, preloadedSnapshot]);

  const resolvedAmountReceived =
    amountDraft === null
      ? snapshot?.outstandingAmount ?? 0
      : amountDraft.trim() === ""
      ? 0
      : parseCurrencyInput(amountDraft);
  const paymentCoverageLabel =
    snapshot && resolvedAmountReceived !== null && resolvedAmountReceived > 0
      ? resolvedAmountReceived >= snapshot.outstandingAmount
        ? "Full Payment"
        : "Partial Payment"
      : null;

  const openModal = () => {
    if (disabled) return;
    setError("");
    setIsOpen(true);
    setAmountDraft(null);
    setNotes("");
  };

  const validate = () => {
    if (!receiptDate || Number.isNaN(new Date(receiptDate).getTime())) {
      setError("Valid receipt date is required.");
      return false;
    }
    if (
      resolvedAmountReceived === null ||
      !Number.isFinite(resolvedAmountReceived) ||
      resolvedAmountReceived <= 0
    ) {
      setError("Amount must be greater than 0.");
      return false;
    }
    if (snapshot && resolvedAmountReceived > snapshot.outstandingAmount) {
      setError("Amount cannot exceed outstanding amount.");
      return false;
    }
    if (paymentMethod === "CHEQUE") {
      if (!chequeNo.trim()) {
        setError("Cheque number is required.");
        return false;
      }
      if (!chequeDate || Number.isNaN(new Date(chequeDate).getTime())) {
        setError("Valid cheque date is required.");
        return false;
      }
      if (!bankName.trim()) {
        setError("Bank name is required.");
        return false;
      }
    }
    if (paymentMethod === "BANK_TRANSFER" && !bankName.trim()) {
      setError("Bank name is required.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError("");
    if (!validate()) return;

    try {
      const payload: CreateReceiptRequestDto = {
        invoiceId,
        collectedBy: 0,
        receiptDate,
        amountReceived: resolvedAmountReceived,
        paymentMethod,
        chequeNo: paymentMethod === "CHEQUE" ? chequeNo.trim() : undefined,
        chequeDate: paymentMethod === "CHEQUE" ? chequeDate : undefined,
        bankName:
          paymentMethod === "CHEQUE" || paymentMethod === "BANK_TRANSFER"
            ? bankName.trim()
            : undefined,
        notes: notes.trim() || undefined,
      };
      await createReceiptMutation.mutateAsync(payload);
      setIsOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to record payment.",
      );
    }
  };

  if (disabled) {
    return (
      <span
        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 px-2.5 py-1.5 text-[12px] font-medium text-stone-400"
        title={disabledTitle ?? "Record payment is not available"}
      >
        Record Payment
      </span>
    );
  }

  return (
    <>
      <button type="button" onClick={openModal} className={buttonClassName}>
        <DollarSign size={12} />
        Record Payment
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-stone-900">
                Record Payment
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md px-2 py-1 text-stone-500 hover:bg-stone-100"
              >
                x
              </button>
            </div>

            {invoiceDetailQuery.isLoading && !preloadedSnapshot && (
              <p className="mb-3 text-[13px] text-stone-500">
                Loading invoice details...
              </p>
            )}

            {snapshot && (
              <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">
                    Invoice
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-stone-900">
                    {snapshot.invoiceNo}
                  </p>
                </div>
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">
                    Date
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-stone-900">
                    {formatDate(snapshot.invoiceDate)}
                  </p>
                </div>
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">
                    Customer
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-stone-900">
                    {snapshot.customerName}
                  </p>
                </div>
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">
                    Sales Rep
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-stone-900">
                    {snapshot.repName}
                  </p>
                </div>
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">
                    Invoice Total
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-stone-900">
                    {formatCurrency(snapshot.totalAmount)}
                  </p>
                </div>
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">
                    Paid
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-stone-900">
                    {formatCurrency(snapshot.totalPaid)}
                  </p>
                </div>
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-stone-500">
                    Credited
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-stone-900">
                    {formatCurrency(snapshot.creditedAmount)}
                  </p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-red-700">
                    Outstanding
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-red-800">
                    {formatCurrency(snapshot.outstandingAmount)}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-700">
                  Receipt Date
                </span>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(event) => setReceiptDate(event.target.value)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] outline-none focus:border-[#1a5c2e]"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-700">
                  Amount Received
                </span>
                <div className="flex items-center rounded-lg border border-stone-300 focus-within:border-[#1a5c2e]">
                  <span className="border-r border-stone-300 px-3 text-[12px] font-semibold text-stone-600">
                    LKR
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      amountDraft === null
                        ? resolvedAmountReceived === null
                          ? ""
                          : formatCurrencyInput(resolvedAmountReceived)
                        : amountDraft
                    }
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      const parsedValue = parseCurrencyInput(nextValue);

                      if (
                        snapshot &&
                        parsedValue !== null &&
                        parsedValue > snapshot.outstandingAmount
                      ) {
                        setError("Amount cannot exceed outstanding amount.");
                        return;
                      }

                      if (error === "Amount cannot exceed outstanding amount.") {
                        setError("");
                      }
                      setAmountDraft(nextValue);
                    }}
                    className="w-full rounded-r-lg px-3 py-2 text-[13px] outline-none"
                    placeholder={
                      snapshot
                        ? `Max ${formatCurrencyInput(snapshot.outstandingAmount)}`
                        : "Enter amount"
                    }
                  />
                </div>
                {paymentCoverageLabel && (
                  <span
                    className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      paymentCoverageLabel === "Full Payment"
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {paymentCoverageLabel}
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-700">
                  Payment Method
                </span>
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as ReceiptMethod)
                  }
                  className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] outline-none focus:border-[#1a5c2e]"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </label>
            </div>

            {(paymentMethod === "CHEQUE" || paymentMethod === "BANK_TRANSFER") && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                {paymentMethod === "CHEQUE" && (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-[12px] font-medium text-stone-700">
                        Cheque No
                      </span>
                      <input
                        value={chequeNo}
                        onChange={(event) => setChequeNo(event.target.value)}
                        className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] outline-none focus:border-[#1a5c2e]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[12px] font-medium text-stone-700">
                        Cheque Date
                      </span>
                      <input
                        type="date"
                        value={chequeDate}
                        onChange={(event) => setChequeDate(event.target.value)}
                        className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] outline-none focus:border-[#1a5c2e]"
                      />
                    </label>
                  </>
                )}
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-stone-700">
                    Bank Name
                  </span>
                  <input
                    value={bankName}
                    onChange={(event) => setBankName(event.target.value)}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] outline-none focus:border-[#1a5c2e]"
                  />
                </label>
              </div>
            )}

            <div className="mt-3">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-700">
                  Notes
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] outline-none focus:border-[#1a5c2e]"
                  placeholder="Optional notes"
                />
              </label>
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
                disabled={createReceiptMutation.isPending}
                className="rounded-lg bg-[#1a5c2e] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#2d7a42] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createReceiptMutation.isPending
                  ? "Saving..."
                  : "Save Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RecordPaymentModalButton;
