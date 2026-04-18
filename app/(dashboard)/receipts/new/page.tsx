"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  CreateReceiptRequestDto,
  CreateReceiptResponse,
  InvoiceDetailResponse,
  InvoiceOptionDto,
  InvoicesResponse,
  ReceiptMethod,
} from "@/types/api";
import SearchableSelect from "@/components/SearchableSelect";

const parsePositiveInt = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

const getTodayDateInputValue = () => new Date().toISOString().split("T")[0];

const NewReceiptPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialInvoiceId = useMemo(() => parsePositiveInt(searchParams.get("invoiceId")), [searchParams]);

  const [invoiceId, setInvoiceId] = useState<number | null>(initialInvoiceId);
  const [receiptDate, setReceiptDate] = useState(getTodayDateInputValue);
  const [amountReceived, setAmountReceived] = useState(0);
  const [amountTouched, setAmountTouched] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<ReceiptMethod>("CASH");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setInvoiceId(initialInvoiceId);
  }, [initialInvoiceId]);

  const invoicesQuery = useQuery<InvoiceOptionDto[], Error>({
    queryKey: ["receipt-invoices"],
    queryFn: async () => {
      const response = await fetch("/api/invoices");
      const result = (await response.json()) as InvoicesResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load invoices.");
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const invoiceDetailQuery = useQuery({
    queryKey: ["receipt-invoice-detail", invoiceId],
    enabled: invoiceId !== null,
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      const result = (await response.json()) as InvoiceDetailResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load invoice details.");
      return result.data;
    },
  });

  useEffect(() => {
    if (!invoiceDetailQuery.data || amountTouched) return;
    setAmountReceived(invoiceDetailQuery.data.outstandingAmount);
  }, [amountTouched, invoiceDetailQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: CreateReceiptRequestDto) => {
      const response = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as CreateReceiptResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to create receipt.");
      return result.data;
    },
  });

  const invoiceOptions = useMemo(
    () =>
      (invoicesQuery.data ?? []).map((invoice) => ({
        id: invoice.id,
        label: `${invoice.invoiceNo} • ${invoice.customerName}`,
        description: `${invoice.status} • ${formatCurrency(invoice.totalAmount)}`,
      })),
    [invoicesQuery.data],
  );

  const selectedInvoice = invoiceDetailQuery.data;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setSubmitError("");
    setSuccessMessage("");

    const nextFieldErrors: Record<string, string> = {};

    if (!invoiceId) {
      nextFieldErrors.invoice = "Invoice is required.";
    }

    if (!receiptDate) {
      nextFieldErrors.receiptDate = "Receipt date is required.";
    }

    if (!Number.isFinite(amountReceived) || amountReceived <= 0) {
      nextFieldErrors.amountReceived = "Amount must be greater than 0.";
    }

    if (selectedInvoice && amountReceived > selectedInvoice.outstandingAmount) {
      nextFieldErrors.amountReceived = "Amount cannot exceed outstanding amount.";
    }

    if (paymentMethod === "CHEQUE") {
      if (!chequeNo.trim()) {
        nextFieldErrors.chequeNo = "Cheque number is required.";
      }
      if (!chequeDate) {
        nextFieldErrors.chequeDate = "Cheque date is required.";
      }
      if (!bankName.trim()) {
        nextFieldErrors.bankName = "Bank name is required.";
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    const payload: CreateReceiptRequestDto = {
      invoiceId: invoiceId as number,
      collectedBy: 1,
      receiptDate,
      amountReceived,
      paymentMethod,
      chequeNo: paymentMethod === "CHEQUE" ? chequeNo.trim() : undefined,
      chequeDate: paymentMethod === "CHEQUE" ? chequeDate : undefined,
      bankName: paymentMethod === "CHEQUE" ? bankName.trim() : undefined,
    };

    try {
      const result = await saveMutation.mutateAsync(payload);
      setSuccessMessage(`Receipt created successfully (${result?.receiptNo ?? "saved"}).`);
      router.push(`/invoices/${invoiceId}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create receipt.");
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Sales</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-playfair)] font-semibold">
            Record Payment
          </h1>
          <p className="text-[13px] text-stone-500">
            Record a payment against an invoice. Invoice details are prefilled when launched from invoice actions.
          </p>
        </div>

        <Link
          href="/invoices"
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
        >
          Back to Invoices
        </Link>
      </header>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
          <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-playfair)]">Receipt Details</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-stone-600">Invoice</span>
              <SearchableSelect
                value={invoiceId}
                onChange={(value) => {
                  setInvoiceId(value);
                  setAmountTouched(false);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.invoice;
                    return next;
                  });
                }}
                options={invoiceOptions}
                placeholder={invoicesQuery.isLoading ? "Loading invoices..." : "Select invoice"}
                searchPlaceholder="Search invoices"
                loading={invoicesQuery.isLoading}
                disabled={initialInvoiceId !== null}
              />
              {fieldErrors.invoice && <p className="text-[12px] text-red-700">{fieldErrors.invoice}</p>}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-stone-600">Receipt Date</span>
              <input
                type="date"
                value={receiptDate}
                onChange={(event) => {
                  setReceiptDate(event.target.value);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.receiptDate;
                    return next;
                  });
                }}
                className={`rounded-xl border px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e] ${
                  fieldErrors.receiptDate
                    ? "border-red-300 bg-red-50"
                    : "border-stone-200 bg-stone-50"
                }`}
              />
              {fieldErrors.receiptDate && <p className="text-[12px] text-red-700">{fieldErrors.receiptDate}</p>}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-stone-600">Payment Method</span>
              <select
                value={paymentMethod}
                onChange={(event) => {
                  setPaymentMethod(event.target.value as ReceiptMethod);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.chequeNo;
                    delete next.chequeDate;
                    delete next.bankName;
                    return next;
                  });
                }}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e]"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </label>
          </div>
        </section>
        {paymentMethod === "CHEQUE" && (
          <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
            <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-playfair)]">Bank Details</h2>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {paymentMethod === "CHEQUE" && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-medium text-stone-600">Cheque No</span>
                    <input
                      type="text"
                      value={chequeNo}
                      onChange={(event) => {
                        setChequeNo(event.target.value);
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.chequeNo;
                          return next;
                        });
                      }}
                      className={`rounded-xl border px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e] ${
                        fieldErrors.chequeNo
                          ? "border-red-300 bg-red-50"
                          : "border-stone-200 bg-stone-50"
                      }`}
                    />
                    {fieldErrors.chequeNo && <p className="text-[12px] text-red-700">{fieldErrors.chequeNo}</p>}
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-medium text-stone-600">Cheque Date</span>
                    <input
                      type="date"
                      value={chequeDate}
                      onChange={(event) => {
                        setChequeDate(event.target.value);
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.chequeDate;
                          return next;
                        });
                      }}
                      className={`rounded-xl border px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e] ${
                        fieldErrors.chequeDate
                          ? "border-red-300 bg-red-50"
                          : "border-stone-200 bg-stone-50"
                      }`}
                    />
                    {fieldErrors.chequeDate && <p className="text-[12px] text-red-700">{fieldErrors.chequeDate}</p>}
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-medium text-stone-600">Bank Name</span>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(event) => {
                        setBankName(event.target.value);
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.bankName;
                          return next;
                        });
                      }}
                      className={`rounded-xl border px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e] ${
                        fieldErrors.bankName
                          ? "border-red-300 bg-red-50"
                          : "border-stone-200 bg-stone-50"
                      }`}
                    />
                    {fieldErrors.bankName && <p className="text-[12px] text-red-700">{fieldErrors.bankName}</p>}
                  </label>
                </>
              )}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
          <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-playfair)]">Invoice Snapshot</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Invoice #</p>
              <p className="mt-1 text-[14px] font-semibold text-stone-800">{selectedInvoice?.invoiceNo ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Customer</p>
              <p className="mt-1 text-[14px] font-semibold text-stone-800">{selectedInvoice?.customerName ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Invoice Total</p>
              <p className="mt-1 text-[14px] font-semibold text-stone-800">{formatCurrency(selectedInvoice?.totalAmount ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Outstanding</p>
              <p className="mt-1 text-[14px] font-semibold text-[#a32d2d]">
                {formatCurrency(selectedInvoice?.outstandingAmount ?? 0)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-stone-600">Amount Received</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={Number.isFinite(amountReceived) ? amountReceived : 0}
                onChange={(event) => {
                  setAmountTouched(true);
                  setAmountReceived(Number(event.target.value));
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.amountReceived;
                    return next;
                  });
                }}
                className={`rounded-xl border px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e] ${
                  fieldErrors.amountReceived
                    ? "border-red-300 bg-red-50"
                    : "border-stone-200 bg-stone-50"
                }`}
              />
              {fieldErrors.amountReceived && <p className="text-[12px] text-red-700">{fieldErrors.amountReceived}</p>}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-stone-600">Invoice Date</span>
              <input
                type="text"
                readOnly
                value={selectedInvoice ? formatDate(selectedInvoice.invoiceDate) : "-"}
                className="rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-[13px] text-stone-700"
              />
            </label>
          </div>
        </section>

        

        {submitError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {submitError}
          </p>
        )}

        {successMessage && (
          <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[13px] text-green-700">
            {successMessage}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Link
            href="/invoices"
            className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saveMutation.isPending || invoiceDetailQuery.isLoading}
            className="inline-flex items-center rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#2d7a42] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveMutation.isPending ? "Saving..." : "Save Receipt"}
          </button>
        </div>
      </form>

      {invoiceDetailQuery.error instanceof Error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {invoiceDetailQuery.error.message}
        </p>
      )}
    </section>
  );
};

export default NewReceiptPage;
