import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Receipt,
  FileText,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import BackNavigationLink from "@/components/ui/BackNavigationLink";
import InvoicePrintButton from "./InvoicePrintButton";
import IssueStocksModalButton from "../IssueStocksModalButton";
import RecordPaymentModalButton from "../RecordPaymentModalButton";
import RecordReturnsModalButton from "../RecordReturnsModalButton";
import DeleteSalesReturnButton from "../DeleteSalesReturnButton";
import DeleteInvoiceButton from "../DeleteInvoiceButton";
import DeleteReceiptButton from "../../receipts/DeleteReceiptButton";
import DeleteGoodsIssueNoteButton from "../../goods-issue-notes/DeleteGoodsIssueNoteButton";

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

const STATUS_BADGE_STYLE: Record<
  "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE",
  { bg: string; text: string; icon: React.ReactNode }
> = {
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
    bg: "bg-stone-100",
    text: "text-stone-700",
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
    bg: "bg-amber-50",
    text: "text-amber-700",
    icon: <Clock size={14} className="shrink-0" />,
  },
  ISSUED: {
    bg: "bg-[#eeeffe]",
    text: "text-[#2b2d7e]",
    icon: <CheckCircle size={14} className="shrink-0" />,
  },
  PARTIAL: {
    bg: "bg-blue-50",
    text: "text-blue-700",
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

  const currentUser = await getCurrentUser();
  const canDeleteReturns = isAdminUser(currentUser);

  const invoice = await prisma.invoice.findUnique({
    where: { invoice_id: invoiceId },
    select: {
      invoice_id: true,
      invoice_number: true,
      is_active: true,
      invoice_date: true,
      gin_status: true,
      payment_status: true,
      notes: true,
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
        where: { is_active: true },
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
        where: { is_active: true },
        orderBy: [{ receipt_date: "desc" }, { receipt_id: "desc" }],
        select: {
          receipt_id: true,
          receipt_date: true,
          amount: true,
        },
      },
      salesReturnNotes: {
        where: { is_active: true },
        orderBy: [{ return_date: "desc" }, { return_id: "desc" }],
        select: {
          return_id: true,
          return_number: true,
          return_date: true,
          total_amount: true,
          creator: {
            select: {
              full_name: true,
            },
          },
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

  if (!invoice || !invoice.is_active) {
    notFound();
  }

  type InvoiceLine = (typeof invoice.invoice_lines)[number];

  const subtotal = invoice.invoice_lines.reduce(
    (sum: number, line: InvoiceLine) => sum + Number(line.line_total),
    0,
  );
  const ginStatus = invoice.gin_status;
  const paymentStatus = invoice.payment_status;
  const total = Number(invoice.total_amount);
  const paidAmount = Number(invoice.paid_amount);
  const creditedAmount = Number(invoice.credited_amount);
  const balanceAmount = Number(invoice.balance_amount);
  const discountTotal = Math.max(0, subtotal - total);
  const grandTotalAfterReturns = Math.max(0, subtotal - discountTotal - creditedAmount);
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
  const totalReturnableQty = invoice.invoice_lines.reduce(
    (sum, line) => sum + Math.max(0, line.issued_qty - line.returned_qty),
    0,
  );

  const receiptsWithNumber = invoice.receipts.map((receipt) => {
    const year = receipt.receipt_date.getFullYear();
    const month = String(receipt.receipt_date.getMonth() + 1).padStart(2, "0");
    return {
      ...receipt,
      receipt_number: `RCP-${year}${month}-${String(receipt.receipt_id).padStart(3, "0")}`,
      amount: receipt.amount,
    };
  });
  const returnedLines = invoice.invoice_lines.filter((line) => line.returned_qty > 0);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <BackNavigationLink
                href="/invoices"
                label="Back to Invoices"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-700 [font-family:var(--font-dmsans)]"
              />
              <div className="flex flex-wrap items-end gap-2">
                <h1 className="text-[26px] font-semibold leading-tight text-[#2b2d7e] [font-family:var(--font-dmsans)]">
                  Invoice {invoice.invoice_number}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_BADGE_STYLE[paymentStatus].bg} ${STATUS_BADGE_STYLE[paymentStatus].text}`}
                >
                  {STATUS_BADGE_STYLE[paymentStatus].icon}
                  {STATUS_LABEL[paymentStatus]}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${GIN_STATUS_BADGE_STYLE[ginStatus].bg} ${GIN_STATUS_BADGE_STYLE[ginStatus].text}`}
                >
                  {GIN_STATUS_BADGE_STYLE[ginStatus].icon}
                  GIN: {GIN_STATUS_LABEL[ginStatus]}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <InvoicePrintButton
              invoiceNo={invoice.invoice_number}
              invoiceDate={invoice.invoice_date.toISOString()}
              customerName={invoice.customer.name}
              customerPhone={invoice.customer.phone ?? null}
              customerAddress={invoice.customer.address ?? null}
              repName={invoice.rep.full_name}
              statusLabel={STATUS_LABEL[paymentStatus]}
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

            {ginStatus === "ISSUED" ? (
              <IssueStocksModalButton
                invoiceId={invoice.invoice_id}
                disabled
                disabledTitle={`GIN already ${GIN_STATUS_LABEL[ginStatus].toLowerCase()}`}
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

            {totalReturnableQty <= 0 ? (
              <RecordReturnsModalButton
                invoiceId={invoice.invoice_id}
                disabled
                disabledTitle="No returnable quantities available"
                buttonClassName="inline-flex items-center gap-1.5 rounded-xl bg-[#1a5c2e] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
              />
            ) : (
              <RecordReturnsModalButton
                invoiceId={invoice.invoice_id}
                disabled={false}
                buttonClassName="inline-flex items-center gap-1.5 rounded-xl bg-[#1a5c2e] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
              />
            )}

            {canDeleteReturns ? (
              <DeleteInvoiceButton
                invoiceId={invoice.invoice_id}
                invoiceNo={invoice.invoice_number}
              />
            ) : null}
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Agrinova IMS</p>
              <h2 className="mt-1 text-[20px] font-semibold text-[#2b2d7e] [font-family:var(--font-dmsans)]">
                Invoice
              </h2>
              <p className="mt-0.5 text-[12px] text-stone-600">
                205D, Kalapaluwawa Road, Koswatta, Battaramulla
              </p>
            </div>
            <div className="text-right text-[12px] text-stone-600">
              <p>
                <span className="font-medium text-stone-800">Invoice No:</span> {invoice.invoice_number}
              </p>
              <p>
                <span className="font-medium text-stone-800">Invoice Date:</span> {formatDate(invoice.invoice_date)}
              </p>
              <p>
                <span className="font-medium text-stone-800">Status:</span> {STATUS_LABEL[paymentStatus]}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 border-b border-stone-200 px-5 py-4 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-stone-500">Bill To</p>
            <p className="mt-1 text-[14px] font-semibold text-stone-900">{invoice.customer.name}</p>
            {invoice.customer.phone ? (
              <p className="text-[13px] text-stone-700">{invoice.customer.phone}</p>
            ) : null}
            {invoice.customer.address ? (
              <p className="text-[13px] text-stone-700">{invoice.customer.address}</p>
            ) : null}
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-stone-500">Sales Representative</p>
            <p className="mt-1 text-[14px] font-semibold text-stone-900">{invoice.rep.full_name}</p>
          </div>
        </div>

        <div className="overflow-x-auto border-b border-stone-200">
          <table className="w-full min-w-[1020px] table-fixed border-collapse text-[13px]">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="bg-stone-50 text-[11px] font-medium uppercase tracking-[0.1em] text-stone-600">
              <tr>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left">Product</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-left">Pack Size</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-center">Qty</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-right">Unit Price</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-center">Promotion</th>
                <th className="border-b border-r border-stone-200 px-4 py-3 text-right">Gross Total</th>
                <th className="border-b border-stone-200 px-4 py-3 text-right">Net Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.invoice_lines.map((line) => (
                <tr key={line.line_id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="border-r border-stone-200 px-4 py-3 font-medium text-stone-900">
                    {line.product.product_name}
                  </td>
                  <td className="border-r border-stone-200 px-4 py-3 text-stone-700">{line.product.pack_size}</td>
                  <td className="border-r border-stone-200 px-4 py-3 text-center text-stone-700">
                    <span>{line.quantity}</span>
                    {line.free_quantity > 0 ? (
                      <span className="ml-1 text-[11px] text-green-700">+{line.free_quantity} free</span>
                    ) : null}
                  </td>
                  <td className="border-r border-stone-200 px-4 py-3 text-right text-stone-700">
                    {formatCurrency(Number(line.unit_price))}
                  </td>
                  <td className="border-r border-stone-200 px-4 py-3 text-center text-stone-700">
                    {line.promotion_type === "DISCOUNT" && Number(line.discount) > 0 ? (
                      <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        {Number(line.discount)}% OFF
                      </span>
                    ) : line.promotion_type === "FREE_QTY" && Number(line.free_quantity) > 0 ? (
                      <span className="inline-flex rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                        FREE QTY
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border-r border-stone-200 px-4 py-3 text-right text-stone-600">
                    {formatCurrency(Number(line.line_total))}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-stone-900">
                    {formatCurrency(Number(line.net_line_total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-b border-stone-200 py-4">
          <h3 className="px-5 text-[11px] font-medium uppercase tracking-[0.1em] text-stone-500">Returns</h3>
          {returnedLines.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[1020px] table-fixed border-collapse text-[13px]">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="bg-stone-50 text-[11px] font-medium uppercase tracking-[0.1em] text-stone-600">
                  <tr>
                    <th className="border-b border-r border-stone-200 px-4 py-3 text-left">Product</th>
                    <th className="border-b border-r border-stone-200 px-4 py-3 text-left">Pack Size</th>
                    <th className="border-b border-r border-stone-200 px-4 py-3 text-center">Qty</th>
                    <th className="border-b border-r border-stone-200 px-4 py-3 text-right">Unit Price</th>
                    <th className="border-b border-r border-stone-200 px-4 py-3 text-center">Promotion</th>
                    <th className="border-b border-r border-stone-200 px-4 py-3 text-right">Gross Total</th>
                    <th className="border-b border-stone-200 px-4 py-3 text-right">Net Total</th>
                  </tr>
                </thead>
                <tbody>
                  {returnedLines.map((line) => (
                    <tr key={`return-${line.line_id}`} className="border-b border-stone-100">
                      <td className="border-r border-stone-200 px-4 py-3 text-stone-900">
                        {line.product.product_name}
                      </td>
                      <td className="border-r border-stone-200 px-4 py-3 text-stone-700">
                        {line.product.pack_size}
                      </td>
                      <td className="border-r border-stone-200 px-4 py-3 text-center text-stone-700">
                        {line.returned_qty}
                      </td>
                      <td className="border-r border-stone-200 px-4 py-3 text-right text-stone-700">
                        {formatCurrency(Number(line.unit_price))}
                      </td>
                      <td className="border-r border-stone-200 px-4 py-3 text-center text-stone-700">
                        {line.promotion_type === "DISCOUNT" && Number(line.discount) > 0 ? (
                          <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            {Number(line.discount)}% OFF
                          </span>
                        ) : line.promotion_type === "FREE_QTY" && Number(line.free_quantity) > 0 ? (
                          <span className="inline-flex rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                            FREE QTY
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="border-r border-stone-200 px-4 py-3 text-right text-red-700">
                        - {formatCurrency(Number(line.line_total))}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-700">
                        - {formatCurrency(Number(line.net_line_total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 px-5 text-[12px] text-stone-500">No returned quantities recorded.</p>
          )}
        </div>

        <div className="flex justify-end px-5 py-4">
          <div className="w-full max-w-[360px] space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-4 text-[13px]">
            <div className="flex items-center justify-between border-b border-stone-200 pb-1.5 text-stone-700">
              <span>subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-stone-200 pb-1.5 text-stone-700">
              <span>discount</span>
              <span>- {formatCurrency(discountTotal)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-stone-200 pb-1.5 text-red-700">
              <span>returns</span>
              <span>- {formatCurrency(creditedAmount)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-stone-200 pb-1.5 text-[15px] font-semibold text-[#1a5c2e]">
              <span>grand total</span>
              <span>{formatCurrency(grandTotalAfterReturns)}</span>
            </div>
          </div>
        </div>
      </section>

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
            {receiptsWithNumber.map((receipt) => (
              <div key={receipt.receipt_id} className="inline-flex items-center gap-1.5">
                <Link
                  href={`/receipts/${receipt.receipt_id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[12px] font-medium text-emerald-900 transition-colors hover:bg-emerald-100"
                >
                  <Receipt size={13} className="text-emerald-700" />
                  <span>{receipt.receipt_number}</span>
                  <span className="text-[11px] text-emerald-700">{formatCurrency(Number(receipt.amount))}</span>
                </Link>
                {canDeleteReturns ? (
                  <DeleteReceiptButton
                    receiptId={receipt.receipt_id}
                    receiptNo={receipt.receipt_number}
                    redirectTo={null}
                    compact
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-stone-500">No receipts linked yet.</p>
        )}
      </section>

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
            {invoice.goods_issue_notes.map((gin) => (
              <div key={gin.gin_id} className="inline-flex items-center gap-1.5">
                <Link
                  href={`/goods-issue-notes/${gin.gin_id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[12px] font-medium text-blue-900 transition-colors hover:bg-blue-100"
                >
                  <FileText size={13} className="text-blue-700" />
                  <span>{gin.gin_number}</span>
                  <span className="text-[11px] text-blue-700">({gin.location.code})</span>
                </Link>
                {canDeleteReturns ? (
                  <DeleteGoodsIssueNoteButton
                    ginId={gin.gin_id}
                    ginNumber={gin.gin_number}
                    redirectTo={null}
                    compact
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-stone-500">No goods issue notes linked yet.</p>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
            <FileText size={14} />
          </span>
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
            Sales Return Notes ({invoice.salesReturnNotes.length})
          </h2>
        </div>
        {invoice.salesReturnNotes.length > 0 ? (
          <div className="space-y-2">
            {invoice.salesReturnNotes.map((srn) => (
              <div
                key={srn.return_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-stone-900">{srn.return_number}</p>
                  <p className="text-[11px] text-stone-600">
                    {formatDate(srn.return_date)} | {formatCurrency(Number(srn.total_amount))} |{" "}
                    {srn.creator.full_name}
                  </p>
                </div>
                {canDeleteReturns ? (
                  <DeleteSalesReturnButton
                    returnId={srn.return_id}
                    returnNumber={srn.return_number}
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-stone-500">No sales return notes linked yet.</p>
        )}
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
        <p className="whitespace-pre-wrap text-[13px] text-stone-700">
          {invoice.notes?.trim() ? invoice.notes : "No notes added."}
        </p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
          Record Metadata
        </h2>
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
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
