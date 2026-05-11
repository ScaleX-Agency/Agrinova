"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileText, Printer } from "lucide-react";
import BackNavigationLink from "@/components/ui/BackNavigationLink";
import DeleteSalesReturnButton from "@/app/(dashboard)/invoices/DeleteSalesReturnButton";

type DetailResponse = {
  data: {
    returnId: number;
    srnNumber: string;
    srnDate: string;
    notes: string | null;
    customer: {
      customerId: number;
      name: string;
      phone: string | null;
    };
    invoice: {
      invoiceId: number;
      invoiceNumber: string;
      invoiceDate: string;
      totalAmount: number;
      creditedAmount: number;
      balanceAmount: number;
      paymentStatus: string;
    };
    location: {
      locationId: number;
      code: string;
      name: string;
    };
    packageSummary: {
      srnNumber: string;
      srnAmount: number;
      grnNumber: string;
      grnDate: string | null;
      grnTotalQty: number;
      creditNoteNumber: string;
      creditNoteDate: string | null;
      creditAmount: number;
    };
    createdBy: string;
    lines: Array<{
      lineId: number;
      productId: number;
      productCode: string;
      productName: string;
      packSize: string;
      usableQty: number;
      unusableQty: number;
      totalQty: number;
      condition: string;
      reasonForReturn: string;
      lineTotal: number;
    }>;
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string | null) => {
  if (!value) return "Missing";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function SalesReturnNoteDetailPage() {
  const params = useParams<{ returnId: string }>();
  const returnId = Number(params.returnId);

  const detailQuery = useQuery({
    queryKey: ["sales-return-note-detail", returnId],
    enabled: Number.isInteger(returnId) && returnId > 0,
    queryFn: async () => {
      const response = await fetch(`/api/sales-return-notes/${returnId}`, { cache: "no-store" });
      const result = (await response.json()) as DetailResponse | { error?: string };
      if (!response.ok) throw new Error((result as { error?: string }).error ?? "Failed to load sales return note detail.");
      return (result as DetailResponse).data;
    },
  });

  if (detailQuery.error instanceof Error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
        {detailQuery.error.message}
      </div>
    );
  }

  if (detailQuery.isLoading || !detailQuery.data) {
    return (
      <div className="space-y-4">
        <div className="h-[88px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
        <div className="h-[220px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
        <div className="h-[280px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
      </div>
    );
  }

  const detail = detailQuery.data;
  const invoiceBalance = Math.max(0, detail.invoice.totalAmount - detail.invoice.creditedAmount);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <BackNavigationLink
                href="/sales-return-notes"
                label="Back to Sales Return Notes"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-700 [font-family:var(--font-dmsans)]"
              />
              <div className="flex flex-wrap items-end gap-2">
                <h1 className="text-[26px] leading-tight font-semibold text-[#2b2d7e] [font-family:var(--font-dmsans)]">
                  Sales Return Note {detail.srnNumber}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#c0c3f0] bg-white px-3 py-2 text-[12px] font-medium text-[#2b2d7e] transition-colors hover:bg-[#eeeffe]"
            >
              <Printer size={13} />
              Print
            </button>
            <DeleteSalesReturnButton returnId={detail.returnId} returnNumber={detail.srnNumber} />
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Agrinova IMS</p>
              <h2 className="mt-1 text-[20px] font-semibold text-[#2b2d7e] [font-family:var(--font-dmsans)]">
                Sales Return Note
              </h2>
              <p className="mt-0.5 text-[12px] text-stone-600">
                {detail.customer.name} | {detail.location.code} - {detail.location.name}
              </p>
            </div>
            <div className="text-right text-[12px] text-stone-600">
              <p>
                <span className="font-medium text-stone-800">SRN Date:</span> {formatDate(detail.srnDate)}
              </p>
              <p>
                <span className="font-medium text-stone-800">Invoice:</span> {detail.invoice.invoiceNumber}
              </p>
              <p>
                <span className="font-medium text-stone-800">Credit Amount:</span> {formatCurrency(detail.invoice.creditedAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-stone-200 px-5 py-4">
          <div className="grid gap-2 text-[13px] text-stone-700 md:grid-cols-2">
            <p>
              <span className="font-medium text-stone-800">SRN No:</span> {detail.srnNumber}
            </p>
            <p>
              <span className="font-medium text-stone-800">Created By:</span> {detail.createdBy}
            </p>
            <p>
              <span className="font-medium text-stone-800">Invoice Date:</span> {formatDate(detail.invoice.invoiceDate)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border-b border-stone-200">
          <table className="w-full min-w-[1260px] table-fixed border-collapse text-[13px]">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[22%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead className="bg-stone-50 text-[11px] font-medium uppercase tracking-[0.1em] text-stone-600">
              <tr>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left">Product Code</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left">Product Name</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left">Pack Size</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-right">Usable Qty</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-right">Unusable Qty</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-right">Total Qty</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left">Condition</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left">Reason</th>
                <th className="border-b border-stone-200 px-4 py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.length > 0 ? (
                detail.lines.map((line) => (
                  <tr key={line.lineId} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="border-r border-stone-200 px-4 py-3 text-stone-700 [font-family:var(--font-jetbrains)]">
                      {line.productCode}
                    </td>
                    <td className="border-r border-stone-200 px-4 py-3 font-medium text-stone-900">{line.productName}</td>
                    <td className="border-r border-stone-200 px-4 py-3 text-stone-700">{line.packSize}</td>
                    <td className="border-r border-stone-200 px-4 py-3 text-right text-stone-700">{line.usableQty}</td>
                    <td className="border-r border-stone-200 px-4 py-3 text-right text-stone-700">{line.unusableQty}</td>
                    <td className="border-r border-stone-200 px-4 py-3 text-right font-medium text-stone-900">{line.totalQty}</td>
                    <td className="border-r border-stone-200 px-4 py-3 text-stone-700">{line.condition}</td>
                    <td className="border-r border-stone-200 px-4 py-3 text-stone-700">{line.reasonForReturn}</td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-900">{formatCurrency(line.lineTotal)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-[13px] text-stone-500">
                    No lines found for this sales return note.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end px-5 py-4">
          <div className="w-full max-w-[360px] space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-4 text-[13px]">
            <div className="flex items-center justify-between border-b border-stone-200 pb-1.5 text-stone-700">
              <span>invoice total</span>
              <span>{formatCurrency(detail.invoice.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-stone-200 pb-1.5 text-stone-700">
              <span>credited amount</span>
              <span>{formatCurrency(detail.invoice.creditedAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-[15px] font-semibold text-red-700">
              <span>invoice balance</span>
              <span>{formatCurrency(invoiceBalance)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 text-stone-700">
            <FileText size={14} />
          </span>
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
            Linked Notes
          </h2>
        </div>
        <Link
          href={`/invoices/${detail.invoice.invoiceId}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[12px] font-medium text-indigo-900 transition-colors hover:bg-indigo-100"
        >
          <FileText size={13} className="text-indigo-700" />
          {detail.invoice.invoiceNumber}
        </Link>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 text-stone-700">
            <FileText size={14} />
          </span>
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
            Notes
          </h2>
        </div>
        <p className="whitespace-pre-wrap text-[13px] text-stone-700">{detail.notes?.trim() ? detail.notes : "No notes added."}</p>
      </section>
    </section>
  );
}
