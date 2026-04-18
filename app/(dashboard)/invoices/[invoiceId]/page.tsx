import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import InvoicePrintButton from "./InvoicePrintButton";

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

const STATUS_LABEL: Record<"PAID" | "PARTIAL" | "UNPAID" | "OVERDUE", string> = {
  PAID: "Paid",
  PARTIAL: "Partial",
  UNPAID: "Unpaid",
  OVERDUE: "Overdue",
};

const InvoiceDetailPage = async ({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) => {
  const invoiceId = Number((await params).invoiceId);

  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    notFound();
  }

  const invoice = await prisma.invoice.findUnique({
    where: { invoice_id: invoiceId },
    select: {
      invoice_id: true,
      invoice_number: true,
      invoice_date: true,
      status: true,
      total_amount: true,
      customer: {
        select: {
          name: true,
          phone: true,
          address: true,
        },
      },
      rep: {
        select: {
          full_name: true,
        },
      },
      goods_issue_note: {
        select: {
          gin_id: true,
          gin_number: true,
          location: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
      invoice_lines: {
        orderBy: { line_id: "asc" },
        select: {
          line_id: true,
          quantity: true,
          unit_price: true,
          discount: true,
          line_total: true,
          product: {
            select: {
              product_name: true,
              pack_size: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  const subtotal = invoice.invoice_lines.reduce(
    (sum, line) => sum + line.quantity * Number(line.unit_price),
    0,
  );
  const total = Number(invoice.total_amount);
  const discountTotal = Math.max(0, subtotal - total);

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Sales</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-playfair)] font-semibold">
            Invoice {invoice.invoice_number}
          </h1>
          <p className="text-[13px] text-stone-500">Detailed invoice data from backend records.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InvoicePrintButton
            invoiceNo={invoice.invoice_number}
            invoiceDate={invoice.invoice_date.toISOString()}
            customerName={invoice.customer.name}
            customerPhone={invoice.customer.phone ?? null}
            customerAddress={invoice.customer.address ?? null}
            repName={invoice.rep.full_name}
            statusLabel={STATUS_LABEL[invoice.status]}
            lines={invoice.invoice_lines.map((line) => ({
              lineId: line.line_id,
              productName: line.product.product_name,
              packSize: line.product.pack_size,
              quantity: line.quantity,
              unitPrice: Number(line.unit_price),
              discount: Number(line.discount),
              lineTotal: Number(line.line_total),
            }))}
            subtotal={subtotal}
            discountTotal={discountTotal}
            grandTotal={total}
          />
          <Link
            href={`/goods-issue-notes/new?invoiceId=${invoice.invoice_id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-[#c0c3f0] bg-white px-3 py-2 text-[13px] font-medium text-[#2b2d7e] hover:bg-[#eeeffe]"
          >
            Create GIN
          </Link>
          {invoice.goods_issue_note?.gin_id && (
            <Link
              href={`/goods-issue-notes/${invoice.goods_issue_note.gin_id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
            >
              View GIN
            </Link>
          )}
          <Link
            href={`/receipts/new?invoiceId=${invoice.invoice_id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a5c2e] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#2d7a42]"
          >
            Record Payment
          </Link>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
          >
            <ArrowLeft size={14} />
            Back to Invoices
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Invoice Date</p>
          <p className="mt-1 text-[16px] font-semibold text-stone-900">{formatDate(invoice.invoice_date)}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Customer</p>
          <p className="mt-1 text-[16px] font-semibold text-stone-900">{invoice.customer.name}</p>
          {invoice.customer.phone && <p className="text-[12px] text-stone-500">{invoice.customer.phone}</p>}
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Sales Rep</p>
          <p className="mt-1 text-[16px] font-semibold text-stone-900">{invoice.rep.full_name}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Payment Status</p>
          <p className="mt-1 text-[16px] font-semibold text-stone-900">{STATUS_LABEL[invoice.status]}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
        <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-playfair)]">Line Items</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[14px]">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.1em] text-stone-500">
              <tr>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left font-medium">Product</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left font-medium">Pack Size</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-center font-medium">Qty</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-right font-medium">Unit Price</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-center font-medium">Discount (%)</th>
                <th className="border-b border-stone-200 px-4 py-3 text-right font-medium">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.invoice_lines.map((line) => (
                <tr key={line.line_id} className="border-b border-stone-100">
                  <td className="border-r border-stone-200 px-4 py-3 text-left text-stone-800">{line.product.product_name}</td>
                  <td className="border-r border-stone-200 px-4 py-3 text-left text-stone-700">{line.product.pack_size}</td>
                  <td className="border-r border-stone-200 px-4 py-3 text-center text-stone-700">{line.quantity}</td>
                  <td className="border-r border-stone-200 px-4 py-3 text-right text-stone-700">{formatCurrency(Number(line.unit_price))}</td>
                  <td className="border-r border-stone-200 px-4 py-3 text-center text-stone-700">{Number(line.discount)}</td>
                  <td className="px-4 py-3 text-right text-stone-900">{formatCurrency(Number(line.line_total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Subtotal</p>
          <p className="mt-1 text-[20px] font-semibold text-stone-900">{formatCurrency(subtotal)}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Discount</p>
          <p className="mt-1 text-[20px] font-semibold text-amber-700">- {formatCurrency(discountTotal)}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Grand Total</p>
          <p className="mt-1 text-[20px] font-semibold text-[#1a5c2e]">{formatCurrency(total)}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="text-[14px] font-semibold text-stone-900">Linked References</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 text-[13px] text-stone-600 md:grid-cols-2">
          <p>
            <span className="font-medium text-stone-800">GIN:</span>{" "}
            {invoice.goods_issue_note?.gin_number ?? "Not linked"}
          </p>
          <p>
            <span className="font-medium text-stone-800">Location:</span>{" "}
            {invoice.goods_issue_note?.location.code
              ? `${invoice.goods_issue_note.location.code} - ${invoice.goods_issue_note.location.name}`
              : "Not linked"}
          </p>
          {invoice.customer.address && (
            <p className="md:col-span-2">
              <span className="font-medium text-stone-800">Customer Address:</span>{" "}
              {invoice.customer.address}
            </p>
          )}
        </div>
      </section>
    </section>
  );
};

export default InvoiceDetailPage;
