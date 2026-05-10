"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, FileText, Receipt, RotateCcw, UserCircle2 } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
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

  const lineColumns: ColumnDef<DetailResponse["data"]["lines"][number]>[] = [
    { accessorKey: "productCode", header: "Product Code" },
    { accessorKey: "productName", header: "Product Name" },
    { accessorKey: "packSize", header: "Pack Size" },
    { accessorKey: "usableQty", header: "Usable Qty", meta: { align: "right" } },
    { accessorKey: "unusableQty", header: "Unusable Qty", meta: { align: "right" } },
    { accessorKey: "totalQty", header: "Total Qty", meta: { align: "right" } },
    { accessorKey: "condition", header: "Condition" },
    { accessorKey: "reasonForReturn", header: "Reason" },
    {
      accessorKey: "lineTotal",
      header: "Line Total",
      cell: ({ row }) => formatCurrency(row.original.lineTotal),
      meta: { align: "right" },
    },
  ];

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

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/sales-return-notes" className="inline-flex items-center gap-1 text-[12px] text-stone-500 hover:text-stone-700">
            <ArrowLeft size={13} /> Back to Sales Return Notes
          </Link>
          <h1 className="mt-1 text-[28px] leading-tight text-stone-900 font-semibold">{detail.srnNumber}</h1>
          <p className="mt-1 text-[13px] text-stone-500">
            {formatDate(detail.srnDate)} | {detail.customer.name} | Invoice {detail.invoice.invoiceNumber} | {detail.location.code} - {detail.location.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/invoices/${detail.invoice.invoiceId}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50"
          >
            <Receipt size={13} />
            Open Invoice
          </Link>
          <DeleteSalesReturnButton returnId={detail.returnId} returnNumber={detail.srnNumber} />
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="SRN" value={detail.packageSummary.srnNumber} icon={<FileText size={14} className="text-blue-700" />} />
        <SummaryCard label="GRN" value={detail.packageSummary.grnNumber} icon={<RotateCcw size={14} className="text-amber-700" />} />
        <SummaryCard label="Credit Note" value={detail.packageSummary.creditNoteNumber} icon={<Receipt size={14} className="text-violet-700" />} />
        <SummaryCard label="Return Amount" value={formatCurrency(detail.packageSummary.srnAmount)} icon={<UserCircle2 size={14} className="text-emerald-700" />} />
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
        <p className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Linked Package</p>
        <p className="mt-1 text-[15px] font-semibold text-stone-900">
          {detail.packageSummary.srnNumber} {"->"} {detail.packageSummary.grnNumber} {"->"} {detail.packageSummary.creditNoteNumber}
        </p>
        <p className="mt-1 text-[13px] text-stone-600">
          SRN Date: {formatDate(detail.srnDate)} | GRN Date: {formatDate(detail.packageSummary.grnDate)} | CN Date: {formatDate(detail.packageSummary.creditNoteDate)}
        </p>
        <p className="mt-1 text-[13px] text-stone-600">
          GRN Total Qty: {detail.packageSummary.grnTotalQty} | Credit Amount: {formatCurrency(detail.packageSummary.creditAmount)} | Created By: {detail.createdBy}
        </p>
      </section>

      <DataTable
        data={detail.lines}
        columns={lineColumns}
        minWidth={1480}
        searchPlaceholder="Search products or reasons..."
        emptyMessage="No lines found for this sales return note."
      />

      <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
        <p className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Financial Summary</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
            <p className="text-[11px] text-stone-500">Invoice Total</p>
            <p className="text-[14px] font-semibold text-stone-900">{formatCurrency(detail.invoice.totalAmount)}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
            <p className="text-[11px] text-stone-500">Credited Amount (Current Invoice)</p>
            <p className="text-[14px] font-semibold text-violet-700">{formatCurrency(detail.invoice.creditedAmount)}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
            <p className="text-[11px] text-stone-500">Current Invoice Balance</p>
            <p className="text-[14px] font-semibold text-red-700">{formatCurrency(detail.invoice.balanceAmount)}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100">{icon}</span>
        <p className="text-[10.5px] uppercase tracking-[0.09em] text-stone-400 font-semibold">{label}</p>
      </div>
      <p className="mt-2 text-[16px] font-semibold text-stone-900">{value}</p>
    </div>
  );
}

