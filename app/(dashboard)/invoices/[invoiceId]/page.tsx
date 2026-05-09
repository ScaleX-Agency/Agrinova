import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  User,
  FileText,
  DollarSign,
  Package,
  // eslint-disable-next-line
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Receipt,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import BackNavigationLink from "@/components/ui/BackNavigationLink";
import InvoicePrintButton from "./InvoicePrintButton";
import IssueStocksModalButton from "../IssueStocksModalButton";
import RecordPaymentModalButton from "../RecordPaymentModalButton";

const formatDate = (value: Date) =>
  value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatDateTime = (value: Date) =>
  value.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

const STATUS_BADGE_STYLE: Record<"PAID" | "PARTIAL" | "UNPAID" | "OVERDUE", { bg: string; text: string; icon: React.ReactNode }> = {
  PAID: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    icon: <CheckCircle size={14} className="shrink-0" />,
  },
  PARTIAL: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    icon: <Clock size={14} className="shrink-0" />,
  },
  UNPAID: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    icon: <AlertCircle size={14} className="shrink-0" />,
  },
  OVERDUE: {
    bg: "bg-red-50",
    text: "text-red-700",
    icon: <AlertCircle size={14} className="shrink-0" />,
  },
};

const GIN_STATUS_LABEL: Record<"PENDING" | "ISSUED" | "PARTIAL", string> = {
  PENDING: "Pending",
  ISSUED: "Issued",
  PARTIAL: "Partial",
};

const GIN_STATUS_BADGE_STYLE: Record<
  "PENDING" | "ISSUED" | "PARTIAL",
  { bg: string; text: string; icon: React.ReactNode }
> = {
  PENDING: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    icon: <Clock size={14} className="shrink-0" />,
  },
  ISSUED: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    icon: <CheckCircle size={14} className="shrink-0" />,
  },
  PARTIAL: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    icon: <AlertCircle size={14} className="shrink-0" />,
  },
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
      gin_status: true,
      payment_status: true,
      total_amount: true,
      paid_amount: true,
      credited_amount: true,
      balance_amount: true,
      created_at: true,
      updated_at: true,
      creator: {
        select: {
          full_name: true,
        },
      },
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
      goods_issue_notes: {
        orderBy: { gin_date: "desc" },
        select: {
          gin_id: true,
          gin_number: true,
          gin_date: true,
          location: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
      receipts: {
        orderBy: [{ receipt_date: "desc" }, { receipt_id: "desc" }],
        select: {
          receipt_id: true,
          receipt_date: true,
          amount: true,
        },
      },
      invoice_lines: {
        orderBy: { line_id: "asc" },
        select: {
          line_id: true,
          quantity: true,
          issued_qty: true,
          returned_qty: true,
          balance_qty: true,
          unit_price: true,
          promotion_type: true,
          discount: true,
          free_quantity: true,
          line_total: true,
          net_line_total: true,
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

  type InvoiceLine = (typeof invoice.invoice_lines)[number];

  const subtotal = invoice.invoice_lines.reduce(
    (sum: number, line: InvoiceLine) => sum + Number(line.line_total),
    0,
  );
  // eslint-disable-next-line
  const latestGin = invoice.goods_issue_notes[0] ?? null;
  const ginStatus = invoice.gin_status;
  const paymentStatus = invoice.payment_status;
  const total = Number(invoice.total_amount);
  const paidAmount = Number(invoice.paid_amount);
  const creditedAmount = Number(invoice.credited_amount);
  const balanceAmount = Number(invoice.balance_amount);
  const discountTotal = Math.max(0, subtotal - total);
  const issueStocksLines = invoice.invoice_lines.map((line) => ({
    productName: line.product.product_name,
    packSize: line.product.pack_size,
    quantity: line.quantity,
    freeQuantity: line.free_quantity,
  }));
  const paymentSnapshot = {
    invoiceNo: invoice.invoice_number,
    invoiceDate: invoice.invoice_date.toISOString(),
    customerName: invoice.customer.name,
    repName: invoice.rep.full_name,
    totalAmount: total,
    totalPaid: paidAmount,
    creditedAmount,
    outstandingAmount: balanceAmount,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const receiptsWithNumber = invoice.receipts.map((receipt: any) => {
    const year = receipt.receipt_date.getFullYear();
    const month = String(receipt.receipt_date.getMonth() + 1).padStart(2, "0");
    return {
      ...receipt,
      receipt_number: `RCP-${year}${month}-${String(receipt.receipt_id).padStart(3, "0")}`,
      amount: receipt.amount,
    };
  });

  return (
    <section className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <BackNavigationLink
              href="/invoices"
              label="Back to Invoices"
              className="mb-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-700 [font-family:var(--font-dmsans)]"
            />
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-500">
              Sales Document
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-dmsans)] font-semibold">
                Invoice {invoice.invoice_number}
              </h1>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                  STATUS_BADGE_STYLE[paymentStatus].bg
                } ${STATUS_BADGE_STYLE[paymentStatus].text}`}
              >
                {STATUS_BADGE_STYLE[paymentStatus].icon}
                {STATUS_LABEL[paymentStatus]}
              </div>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                  GIN_STATUS_BADGE_STYLE[ginStatus as "PENDING" | "ISSUED" | "PARTIAL"].bg
                } ${GIN_STATUS_BADGE_STYLE[ginStatus as "PENDING" | "ISSUED" | "PARTIAL"].text}`}
              >
                {GIN_STATUS_BADGE_STYLE[ginStatus as "PENDING" | "ISSUED" | "PARTIAL"].icon}
                GIN: {GIN_STATUS_LABEL[ginStatus as "PENDING" | "ISSUED" | "PARTIAL"]}
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="flex flex-wrap items-center gap-2">
          <InvoicePrintButton
            invoiceNo={invoice.invoice_number}
            invoiceDate={invoice.invoice_date.toISOString()}
            customerName={invoice.customer.name}
            customerPhone={invoice.customer.phone ?? null}
            customerAddress={invoice.customer.address ?? null}
            repName={invoice.rep.full_name}
            statusLabel={STATUS_LABEL[paymentStatus]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            lines={invoice.invoice_lines.map((line: any) => ({
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

          {ginStatus === "ISSUED" ? (
            <IssueStocksModalButton
              invoiceId={invoice.invoice_id}
              disabled
              disabledTitle={`GIN already ${GIN_STATUS_LABEL[ginStatus as "PENDING" | "ISSUED" | "PARTIAL"].toLowerCase()}`}
              buttonClassName="inline-flex items-center gap-1.5 rounded-xl bg-[#1a5c2e] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
              preloadedLines={issueStocksLines}
            />
          ) : (
            <IssueStocksModalButton
              invoiceId={invoice.invoice_id}
              disabled={false}
              buttonClassName="inline-flex items-center gap-1.5 rounded-xl bg-[#1a5c2e] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
              preloadedLines={issueStocksLines}
            />
          )}

          {paymentStatus === "PAID" ? (
            <RecordPaymentModalButton
              invoiceId={invoice.invoice_id}
              disabled
              disabledTitle="Invoice is fully paid"
              buttonClassName="inline-flex items-center gap-1.5 rounded-xl bg-[#1a5c2e] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
              preloadedSnapshot={paymentSnapshot}
            />
          ) : (
            <RecordPaymentModalButton
              invoiceId={invoice.invoice_id}
              disabled={false}
              buttonClassName="inline-flex items-center gap-1.5 rounded-xl bg-[#1a5c2e] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
              preloadedSnapshot={paymentSnapshot}
            />
          )}
        </div>
      </div>

      {/* ── Key Info Cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Invoice Date */}
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Invoice Date</p>
              <p className="mt-1 text-[15px] font-semibold text-stone-900">{formatDate(invoice.invoice_date)}</p>
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Customer</p>
              <p className="mt-1 truncate text-[14px] font-semibold text-stone-900">{invoice.customer.name}</p>
              {invoice.customer.phone && (
                <p className="mt-0.5 text-[11px] text-stone-500">{invoice.customer.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Sales Rep */}
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Sales Rep</p>
              <p className="mt-1 truncate text-[14px] font-semibold text-stone-900">{invoice.rep.full_name}</p>
            </div>
          </div>
        </div>

        {/* Total Amount */}
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-700 border border-green-100 flex items-center justify-center shrink-0">
              <DollarSign size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Grand Total</p>
              <p className="mt-1 text-[14px] font-semibold text-[#1a5c2e]">{formatCurrency(total)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Line Items Table ── */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Package size={16} />
            </div>
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
              Products
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[13px]">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.1em] text-stone-600 font-semibold">
              <tr>
                <th className="border-b border-r border-stone-200 px-5 py-3.5 text-left">Product</th>
                <th className="border-b border-r border-stone-200 px-5 py-3.5 text-left">Pack Size</th>
                <th className="border-b border-r border-stone-200 px-5 py-3.5 text-center">Qty</th>
                <th className="border-b border-r border-stone-200 px-5 py-3.5 text-center">Balance Qty</th>
                <th className="border-b border-r border-stone-200 px-5 py-3.5 text-right">Unit Price</th>
                <th className="border-b border-r border-stone-200 px-5 py-3.5 text-center">Promotion</th>
                <th className="border-b border-r border-stone-200 px-5 py-3.5 text-right">Line Total</th>
                <th className="border-b border-stone-200 px-5 py-3.5 text-right">Net Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {invoice.invoice_lines.map((line: any) => (
                <tr key={line.line_id} className="hover:bg-stone-50 transition-colors">
                  <td className="border-r border-stone-200 px-5 py-3.5 text-left font-medium text-stone-900">
                    {line.product.product_name}
                  </td>
                  <td className="border-r border-stone-200 px-5 py-3.5 text-left text-stone-700">{line.product.pack_size}</td>
                  <td className="border-r border-stone-200 px-5 py-3.5 text-center text-stone-700 font-medium whitespace-nowrap">
                    {line.quantity}
                    {line.free_quantity > 0 && (
                      <div className="text-[11px] text-green-600 mt-0.5">+{line.free_quantity} Free</div>
                    )}
                  </td>
                  <td className="border-r border-stone-200 px-5 py-3.5 text-center text-stone-700 font-medium whitespace-nowrap">
                    {line.balance_qty}
                    {(line.issued_qty > 0 || line.returned_qty > 0) && (
                      <div className="mt-0.5 text-[11px] text-stone-500">
                        {line.issued_qty} issued / {line.returned_qty} returned
                      </div>
                    )}
                  </td>
                  <td className="border-r border-stone-200 px-5 py-3.5 text-right text-stone-700">
                    {formatCurrency(Number(line.unit_price))}
                  </td>
                  <td className="border-r border-stone-200 px-5 py-3.5 text-center text-stone-700">
                    {line.promotion_type === "DISCOUNT" && Number(line.discount) > 0 ? (
                      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                        {Number(line.discount)}% OFF
                      </span>
                    ) : line.promotion_type === "FREE_QTY" && Number(line.free_quantity) > 0 ? (
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        FREE QTY
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border-r border-stone-200 px-5 py-3.5 text-right text-stone-500">
                    {formatCurrency(Number(line.line_total))}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-stone-900">
                    {formatCurrency(Number(line.net_line_total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Totals Summary ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Subtotal</p>
          <p className="mt-1.5 text-[20px] font-semibold text-stone-900">{formatCurrency(subtotal)}</p>
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            discountTotal > 0
              ? "border-amber-200 bg-amber-50"
              : "border-stone-200 bg-white"
          }`}
        >
          <p
            className={`text-[11px] font-medium uppercase tracking-wide ${
              discountTotal > 0 ? "text-amber-700" : "text-stone-500"
            }`}
          >
            Discount
          </p>
          <p
            className={`mt-1.5 text-[20px] font-semibold ${
              discountTotal > 0 ? "text-amber-700" : "text-stone-700"
            }`}
          >
            - {formatCurrency(discountTotal)}
          </p>
        </div>

        <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-green-700">Grand Total</p>
          <p className="mt-1.5 text-[22px] font-bold text-[#1a5c2e]">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">Paid</p>
          <p className="mt-1.5 text-[20px] font-semibold text-emerald-800">{formatCurrency(paidAmount)}</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-blue-700">Credited</p>
          <p className="mt-1.5 text-[20px] font-semibold text-blue-800">{formatCurrency(creditedAmount)}</p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-red-700">Balance</p>
          <p className="mt-1.5 text-[20px] font-semibold text-red-800">{formatCurrency(balanceAmount)}</p>
        </div>
      </div>

      {/* ── Receipts ── */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
            <Receipt size={14} />
          </span>
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
            Receipts ({receiptsWithNumber.length})
          </h2>
        </div>
        {receiptsWithNumber.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {receiptsWithNumber.map((receipt: any) => (
              <Link
                key={receipt.receipt_id}
                href={`/receipts/${receipt.receipt_id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[12px] font-medium text-emerald-900 transition-colors hover:bg-emerald-100"
              >
                <Receipt size={13} className="text-emerald-700" />
                <span>{receipt.receipt_number}</span>
                <span className="text-[11px] text-emerald-700">{formatCurrency(Number(receipt.amount))}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-stone-500">No receipts linked yet.</p>
        )}
      </section>

      {/* ── Goods Issue Notes ── */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
            <FileText size={14} />
          </span>
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
            Goods Issue Notes ({invoice.goods_issue_notes.length})
          </h2>
        </div>
        {invoice.goods_issue_notes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {invoice.goods_issue_notes.map((gin: any) => (
              <Link
                key={gin.gin_id}
                href={`/goods-issue-notes/${gin.gin_id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[12px] font-medium text-blue-900 transition-colors hover:bg-blue-100"
              >
                <FileText size={13} className="text-blue-700" />
                <span>{gin.gin_number}</span>
                <span className="text-[11px] text-blue-700">({gin.location.code})</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-stone-500">No goods issue notes linked yet.</p>
        )}
      </section>

      {/* ── Record Metadata ── */}
      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
          Record Metadata
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-[11px] text-stone-500">Created By</p>
            <p className="mt-0.5 text-[13px] font-medium text-stone-900">{invoice.creator.full_name}</p>
          </div>
          <div>
            <p className="text-[11px] text-stone-500">Created At</p>
            <p className="mt-0.5 text-[13px] font-medium text-stone-900">{formatDateTime(invoice.created_at)}</p>
          </div>
          <div>
            <p className="text-[11px] text-stone-500">Last Updated</p>
            <p className="mt-0.5 text-[13px] font-medium text-stone-900">{formatDateTime(invoice.updated_at)}</p>
          </div>
        </div>
      </section>
    </section>
  );
};

export default InvoiceDetailPage;
