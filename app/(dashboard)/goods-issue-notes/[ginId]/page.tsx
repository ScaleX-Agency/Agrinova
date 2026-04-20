import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  User,
  MapPin,
  Boxes,
  Package,
  FileText,
  CheckCircle,
  DollarSign,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import BackNavigationLink from "@/components/ui/BackNavigationLink";
import GinPrintButton from "./GinPrintButton";

const formatDate = (value: Date) =>
  value.toLocaleDateString("en-GB", {
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

const GoodsIssueNoteDetailPage = async ({
  params,
}: {
  params: Promise<{ ginId: string }>;
}) => {
  const ginId = Number((await params).ginId);

  if (!Number.isInteger(ginId) || ginId <= 0) {
    notFound();
  }

  const note = await prisma.goodsIssueNote.findUnique({
    where: { gin_id: ginId },
    select: {
      gin_id: true,
      gin_number: true,
      gin_date: true,
      prepared_by: true,
      received_by: true,
      invoice: {
        select: {
          invoice_id: true,
          invoice_number: true,
        },
      },
      customer: {
        select: {
          name: true,
          phone: true,
        },
      },
      location: {
        select: {
          code: true,
          name: true,
        },
      },
      lines: {
        orderBy: { gin_line_id: "asc" },
        select: {
          gin_line_id: true,
          quantity: true,
          product: {
            select: {
              product_name: true,
              pack_size: true,
              selling_price: true,
            },
          },
        },
      },
    },
  });

  if (!note) {
    notFound();
  }

  const totalValue = note.lines.reduce(
    (sum: number, line) => sum + line.quantity * Number(line.product.selling_price),
    0,
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <BackNavigationLink
              href="/goods-issue-notes"
              label="Back to Goods Issue Notes"
              className="mb-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-700 [font-family:var(--font-dmsans)]"
            />
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-500">
              Operations Document
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-dmsans)] font-semibold">
                Goods Issue Note {note.gin_number}
              </h1>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                <CheckCircle size={14} className="shrink-0" />
                Issued
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <GinPrintButton
            ginNumber={note.gin_number}
            ginDate={note.gin_date.toISOString()}
            invoiceNo={note.invoice?.invoice_number ?? null}
            customerName={note.customer.name}
            locationCode={note.location.code}
            locationName={note.location.name}
            preparedBy={note.prepared_by}
            receivedBy={note.received_by}
            lines={note.lines.map((line) => {
              const unitPrice = Number(line.product.selling_price);
              return {
                lineId: line.gin_line_id,
                productName: line.product.product_name,
                packSize: line.product.pack_size,
                quantity: line.quantity,
                unitPrice,
                lineTotal: line.quantity * unitPrice,
              };
            })}
            totalValue={totalValue}
          />
          {note.invoice?.invoice_id && (
            <Link
              href={`/invoices/${note.invoice.invoice_id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a5c2e] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
            >
              <FileText size={14} />
              View Invoice
            </Link>
          )}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
              <Calendar size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">GIN Date</p>
              <p className="mt-1 text-[15px] font-semibold text-stone-900">{formatDate(note.gin_date)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-purple-100 bg-purple-50 text-purple-700">
              <User size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Customer</p>
              <p className="mt-1 text-[14px] font-semibold text-stone-900">{note.customer.name}</p>
              {note.customer.phone && <p className="mt-0.5 text-[11px] text-stone-500">{note.customer.phone}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-700">
              <MapPin size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Location</p>
              <p className="mt-1 text-[14px] font-semibold text-stone-900">{note.location.code}</p>
              <p className="mt-0.5 text-[11px] text-stone-500">{note.location.name}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-green-100 bg-green-50 text-green-700">
              <Boxes size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Line Count</p>
              <p className="mt-1 text-[14px] font-semibold text-stone-900">{note.lines.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Package size={16} />
            </div>
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
              Products
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[13px]">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.1em] text-stone-600 font-semibold">
              <tr>
                <th className="border-b border-r border-stone-200 px-5 py-3.5 text-left">Product</th>
                <th className="border-b border-r border-stone-200 px-5 py-3.5 text-left">Pack Size</th>
                <th className="border-b border-r border-stone-200 px-5 py-3.5 text-center">Qty</th>
                <th className="border-b border-r border-stone-200 px-5 py-3.5 text-right">Unit Price</th>
                <th className="border-b border-stone-200 px-5 py-3.5 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {note.lines.map((line) => {
                const unitPrice = Number(line.product.selling_price);
                const lineTotal = line.quantity * unitPrice;

                return (
                  <tr key={line.gin_line_id} className="transition-colors hover:bg-stone-50">
                    <td className="border-r border-stone-200 px-5 py-3.5 text-left font-medium text-stone-900">{line.product.product_name}</td>
                    <td className="border-r border-stone-200 px-5 py-3.5 text-left text-stone-700">{line.product.pack_size}</td>
                    <td className="border-r border-stone-200 px-5 py-3.5 text-center font-medium text-stone-700">{line.quantity}</td>
                    <td className="border-r border-stone-200 px-5 py-3.5 text-right text-stone-700">{formatCurrency(unitPrice)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-stone-900">{formatCurrency(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Prepared By</p>
          <p className="mt-1.5 text-[20px] font-semibold text-stone-900">{note.prepared_by}</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Received By</p>
          <p className="mt-1.5 text-[20px] font-semibold text-stone-900">{note.received_by}</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Total Value</p>
          <p className="mt-1.5 text-[20px] font-semibold text-[#1a5c2e]">{formatCurrency(totalValue)}</p>
        </div>
      </section>

      {note.invoice?.invoice_id && (
        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700">
              <FileText size={14} />
            </span>
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
              Linked Invoice
            </h2>
          </div>
          <Link
            href={`/invoices/${note.invoice.invoice_id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[12px] font-medium text-indigo-900 transition-colors hover:bg-indigo-100"
          >
            <FileText size={13} className="text-indigo-700" />
            {note.invoice.invoice_number}
          </Link>
        </section>
      )}
    </section>
  );
};

export default GoodsIssueNoteDetailPage;
