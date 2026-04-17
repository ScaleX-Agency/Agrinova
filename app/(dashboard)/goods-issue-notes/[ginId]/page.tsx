import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
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
    (sum, line) => sum + line.quantity * Number(line.product.selling_price),
    0,
  );

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Operations</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-playfair)] font-semibold">
            Goods Issue Note {note.gin_number}
          </h1>
          <p className="text-[13px] text-stone-500">Detailed goods issue record loaded from backend data.</p>
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
              className="inline-flex items-center gap-2 rounded-xl border border-[#c0c3f0] bg-white px-3 py-2 text-[13px] font-medium text-[#2b2d7e] hover:bg-[#eeeffe]"
            >
              View Invoice
            </Link>
          )}
          <Link
            href="/goods-issue-notes"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
          >
            <ArrowLeft size={14} />
            Back to Goods Issue Notes
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">GIN Date</p>
          <p className="mt-1 text-[16px] font-semibold text-stone-900">{formatDate(note.gin_date)}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Customer</p>
          <p className="mt-1 text-[16px] font-semibold text-stone-900">{note.customer.name}</p>
          {note.customer.phone && <p className="text-[12px] text-stone-500">{note.customer.phone}</p>}
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Location</p>
          <p className="mt-1 text-[16px] font-semibold text-stone-900">{note.location.code}</p>
          <p className="text-[12px] text-stone-500">{note.location.name}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Line Count</p>
          <p className="mt-1 text-[16px] font-semibold text-stone-900">{note.lines.length}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
        <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-playfair)]">Issued Products</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[14px]">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.1em] text-stone-500">
              <tr>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left font-medium">Product</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left font-medium">Pack Size</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-center font-medium">Qty</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-right font-medium">Unit Price</th>
                <th className="border-b border-stone-200 px-4 py-3 text-right font-medium">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {note.lines.map((line) => {
                const unitPrice = Number(line.product.selling_price);
                const lineTotal = line.quantity * unitPrice;

                return (
                  <tr key={line.gin_line_id} className="border-b border-stone-100">
                    <td className="border-r border-stone-200 px-4 py-3 text-left text-stone-800">{line.product.product_name}</td>
                    <td className="border-r border-stone-200 px-4 py-3 text-left text-stone-700">{line.product.pack_size}</td>
                    <td className="border-r border-stone-200 px-4 py-3 text-center text-stone-700">{line.quantity}</td>
                    <td className="border-r border-stone-200 px-4 py-3 text-right text-stone-700">{formatCurrency(unitPrice)}</td>
                    <td className="px-4 py-3 text-right text-stone-900">{formatCurrency(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Prepared By</p>
          <p className="mt-1 text-[16px] font-semibold text-stone-900">{note.prepared_by}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Received By</p>
          <p className="mt-1 text-[16px] font-semibold text-stone-900">{note.received_by}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Total Value</p>
          <p className="mt-1 text-[20px] font-semibold text-[#1a5c2e]">{formatCurrency(totalValue)}</p>
        </div>
      </section>
    </section>
  );
};

export default GoodsIssueNoteDetailPage;
