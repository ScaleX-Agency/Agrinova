"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import BackNavigationLink from "@/components/ui/BackNavigationLink";
import type {
  CreateGoodsIssueNoteRequestDto,
  CreateGoodsIssueNoteResponse,
  GinNumberAvailabilityResponse,
  InvoiceDetailResponse,
} from "@/types/api";

const parsePositiveInt = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getTodayDateInputValue = () => new Date().toISOString().split("T")[0];

const NewGoodsIssueNotePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = useMemo(
    () => parsePositiveInt(searchParams.get("invoiceId")),
    [searchParams],
  );

  const [isModalOpen, setIsModalOpen] = useState(true);
  const [ginNumber, setGinNumber] = useState("");
  const [ginDate, setGinDate] = useState(getTodayDateInputValue);
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    ginNumber?: string;
    ginDate?: string;
  }>({});
  const [debouncedGinNumber, setDebouncedGinNumber] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const checkGinNumberAvailability = async (value: string) => {
    const params = new URLSearchParams({
      checkGinNo: "true",
      ginNumber: value,
    });
    const response = await fetch(`/api/goods-issue-notes?${params.toString()}`);
    const result = (await response.json()) as GinNumberAvailabilityResponse;
    if (!response.ok) {
      throw new Error(result.error ?? "Failed to check GIN number.");
    }
    if (!result.data) {
      throw new Error("GIN number check response is missing.");
    }
    return result.data;
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedGinNumber(ginNumber.trim());
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [ginNumber]);

  const invoiceQuery = useQuery({
    queryKey: ["gin-create-invoice-detail", invoiceId],
    enabled: invoiceId !== null,
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      const result = (await response.json()) as InvoiceDetailResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load invoice details.");
      }
      if (!result.data) {
        throw new Error("Invoice payload is missing.");
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

  const ginNoAvailabilityQuery = useQuery({
    queryKey: ["gin-number-availability", debouncedGinNumber],
    enabled: debouncedGinNumber.length > 0,
    queryFn: () => checkGinNumberAvailability(debouncedGinNumber),
    staleTime: 0,
  });

  const validate = () => {
    const nextErrors: { ginNumber?: string; ginDate?: string } = {};
    if (!ginNumber.trim()) nextErrors.ginNumber = "GIN number is required.";
    if (
      ginNumber.trim().length > 0 &&
      ginNoAvailabilityQuery.data &&
      !ginNoAvailabilityQuery.data.isUnique
    ) {
      nextErrors.ginNumber = "An active GIN with this number already exists.";
    }
    if (!ginDate.trim()) nextErrors.ginDate = "Date is required.";
    if (ginDate && Number.isNaN(new Date(ginDate).getTime())) {
      nextErrors.ginDate = "Date is invalid.";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreate = async () => {
    setSubmitError("");
    if (!invoiceId) {
      setSubmitError("Invoice context is missing. Open this from an invoice.");
      return;
    }
    if (!validate()) return;

    setIsChecking(true);
    try {
      const availability = await checkGinNumberAvailability(ginNumber.trim());
      if (!availability.isUnique) {
        setFieldErrors((prev) => ({
          ...prev,
          ginNumber: "An active GIN with this number already exists.",
        }));
        setIsChecking(false);
        return;
      }
      setIsChecking(false);

      const payload: CreateGoodsIssueNoteRequestDto = {
        ginNumber: ginNumber.trim(),
        ginDate,
        invoiceId,
        notes: notes.trim() || undefined,
      };
      const created = await createGinMutation.mutateAsync(payload);
      router.push(`/goods-issue-notes/${created.ginId}`);
    } catch (error) {
      setIsChecking(false);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to create goods issue note.",
      );
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <BackNavigationLink
          href={invoiceId ? `/invoices/${invoiceId}` : "/goods-issue-notes"}
          label="Back"
        />
      </div>

      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
          Operations
        </p>
        <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-dmsans)] font-semibold">
          New Goods Issue Note
        </h1>
      </header>

      <div className="rounded-xl border border-stone-200 bg-white p-4 text-[13px] text-stone-700">
        {!invoiceId && (
          <p className="text-red-700">
            Missing invoice id. Open this from an invoice action.
          </p>
        )}
        {invoiceId && invoiceQuery.isLoading && <p>Loading invoice details...</p>}
        {invoiceId && invoiceQuery.error instanceof Error && (
          <p className="text-red-700">{invoiceQuery.error.message}</p>
        )}
        {invoiceId && invoiceQuery.data && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <p>
              <span className="text-stone-500">Invoice:</span>{" "}
              {invoiceQuery.data.invoiceNo}
            </p>
            <p>
              <span className="text-stone-500">Customer:</span>{" "}
              {invoiceQuery.data.customerName}
            </p>
            <p>
              <span className="text-stone-500">Sales Rep:</span>{" "}
              {invoiceQuery.data.repName}
            </p>
            <p>
              <span className="text-stone-500">Date:</span>{" "}
              {new Date(invoiceQuery.data.invoiceDate).toLocaleDateString(
                "en-GB",
                {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                },
              )}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#2d7a42]"
        >
          Open GIN Form
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-[18px] font-semibold text-stone-900">
                  Create Goods Issue Note
                </h2>
                <p className="text-[13px] text-stone-500">
                  Enter GIN number, date, and notes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md px-2 py-1 text-stone-500 hover:bg-stone-100"
              >
                x
              </button>
            </div>

            <div className="space-y-3">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-700">
                  GIN Number
                </span>
                <input
                  value={ginNumber}
                  onChange={(event) => {
                    setGinNumber(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, ginNumber: undefined }));
                    setSubmitError("");
                  }}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] outline-none focus:border-[#1a5c2e]"
                  placeholder="GIN-YYYYMM-001"
                />
                {fieldErrors.ginNumber && (
                  <p className="text-[12px] text-red-700">
                    {fieldErrors.ginNumber}
                  </p>
                )}
                {!fieldErrors.ginNumber &&
                  ginNumber.trim().length > 0 &&
                  (ginNoAvailabilityQuery.isFetching ? (
                    <p className="text-[12px] text-stone-500">Checking GIN number...</p>
                  ) : ginNoAvailabilityQuery.data?.isUnique ? (
                    <p className="text-[12px] text-stone-500">GIN number is available.</p>
                  ) : null)}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-700">
                  Date
                </span>
                <input
                  type="date"
                  value={ginDate}
                  onChange={(event) => {
                    setGinDate(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, ginDate: undefined }));
                    setSubmitError("");
                  }}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] outline-none focus:border-[#1a5c2e]"
                />
                {fieldErrors.ginDate && (
                  <p className="text-[12px] text-red-700">{fieldErrors.ginDate}</p>
                )}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-stone-700">
                  Notes
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => {
                    setNotes(event.target.value);
                    setSubmitError("");
                  }}
                  rows={3}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] outline-none focus:border-[#1a5c2e]"
                  placeholder="Optional notes"
                />
              </label>

              {submitError && <p className="text-[12px] text-red-700">{submitError}</p>}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createGinMutation.isPending || !invoiceId || isChecking}
                className="rounded-lg bg-[#1a5c2e] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#2d7a42] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createGinMutation.isPending ? "Saving..." : isChecking ? "Checking..." : "Create GIN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default NewGoodsIssueNotePage;
