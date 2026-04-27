import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  CreditCard,
  User,
  FileText,
  DollarSign,
  Receipt,
  Building2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import BackNavigationLink from "@/components/ui/BackNavigationLink";
import ReceiptPrintButton from "./ReceiptPrintButton";

const METHOD_LABEL: Record<"CASH" | "CHEQUE" | "BANK_TRANSFER", string> = {
  CASH: "Cash",
  CHEQUE: "Cheque",
  BANK_TRANSFER: "Bank Transfer",
};

const METHOD_BADGE_STYLE: Record<
  "CASH" | "CHEQUE" | "BANK_TRANSFER",
  { bg: string; text: string; icon: React.ReactNode }
> = {
  CASH: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    icon: <DollarSign size={14} className="shrink-0" />,
  },
  CHEQUE: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    icon: <CreditCard size={14} className="shrink-0" />,
  },
  BANK_TRANSFER: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    icon: <Building2 size={14} className="shrink-0" />,
  },
};

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

const ReceiptDetailPage = async ({
  params,
}: {
  params: Promise<{ receiptId: string }>;
}) => {
  const receiptId = Number((await params).receiptId);

  if (!Number.isInteger(receiptId) || receiptId <= 0) {
    notFound();
  }

  const receipt = await prisma.receipt.findUnique({
    where: { receipt_id: receiptId },
    select: {
      receipt_id: true,
      receipt_date: true,
      amount_received: true,
      payment_method: true,
      cheque_no: true,
      cheque_date: true,
      bank_name: true,
      collector: {
        select: {
          full_name: true,
        },
      },
      invoice: {
        select: {
          invoice_id: true,
          invoice_number: true,
          invoice_date: true,
          customer: {
            select: {
              name: true,
            },
          },
          rep: {
            select: {
              full_name: true,
            },
          },
        },
      },
    },
  });

  if (!receipt) {
    notFound();
  }

  const year = receipt.receipt_date.getFullYear();
  const month = String(receipt.receipt_date.getMonth() + 1).padStart(2, "0");
  const receiptNo = `RCP-${year}${month}-${String(receipt.receipt_id).padStart(3, "0")}`;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <BackNavigationLink
              href="/receipts"
              label="Back to Receipts"
              className="mb-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-700 [font-family:var(--font-dmsans)]"
            />
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-500">
              Sales Document
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-dmsans)] font-semibold">
                Receipt {receiptNo}
              </h1>
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  METHOD_BADGE_STYLE[receipt.payment_method as "CASH" | "CHEQUE" | "BANK_TRANSFER"].bg
                } ${METHOD_BADGE_STYLE[receipt.payment_method as "CASH" | "CHEQUE" | "BANK_TRANSFER"].text}`}
              >
                {METHOD_BADGE_STYLE[receipt.payment_method as "CASH" | "CHEQUE" | "BANK_TRANSFER"].icon}
                {METHOD_LABEL[receipt.payment_method as "CASH" | "CHEQUE" | "BANK_TRANSFER"]}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ReceiptPrintButton
            receiptNo={receiptNo}
            receiptDate={receipt.receipt_date.toISOString()}
            amountReceived={Number(receipt.amount_received)}
            paymentMethodLabel={METHOD_LABEL[receipt.payment_method as "CASH" | "CHEQUE" | "BANK_TRANSFER"]}
            collectedBy={receipt.collector.full_name}
            invoiceNo={receipt.invoice.invoice_number}
            invoiceDate={receipt.invoice.invoice_date.toISOString()}
            customerName={receipt.invoice.customer.name}
            salesRepName={receipt.invoice.rep.full_name}
            chequeNo={receipt.cheque_no ?? null}
            chequeDate={receipt.cheque_date ? receipt.cheque_date.toISOString() : null}
            bankName={receipt.bank_name ?? null}
          />
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
              <Calendar size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Receipt Date</p>
              <p className="mt-1 text-[14px] font-semibold text-stone-900">{formatDate(receipt.receipt_date)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-700">
              <CreditCard size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Payment Method</p>
              <p className="mt-1 text-[14px] font-semibold text-stone-900">{METHOD_LABEL[receipt.payment_method as "CASH" | "CHEQUE" | "BANK_TRANSFER"]}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-purple-100 bg-purple-50 text-purple-700">
              <User size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Collected By</p>
              <p className="mt-1 text-[14px] font-semibold text-stone-900">{receipt.collector.full_name}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-purple-100 bg-purple-50 text-purple-700">
              <User size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Customer</p>
              <p className="mt-1 text-[14px] font-semibold text-stone-900">{receipt.invoice.customer.name}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-100 bg-violet-50 text-violet-700">
              <User size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Sales Rep</p>
              <p className="mt-1 text-[14px] font-semibold text-stone-900">{receipt.invoice.rep.full_name}</p>
            </div>
          </div>
        </div>
      </section>

      {(receipt.payment_method === "CHEQUE" || receipt.payment_method === "BANK_TRANSFER") && (
        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
              <Building2 size={14} />
            </span>
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
              Bank Details
            </h2>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {receipt.payment_method === "CHEQUE" && (
              <>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Cheque No</p>
                  <p className="mt-1 text-[14px] font-semibold text-stone-800">{receipt.cheque_no ?? "-"}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Cheque Date</p>
                  <p className="mt-1 text-[14px] font-semibold text-stone-800">
                    {receipt.cheque_date ? formatDate(receipt.cheque_date) : "-"}
                  </p>
                </div>
              </>
            )}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Bank Name</p>
              <p className="mt-1 text-[14px] font-semibold text-stone-800">{receipt.bank_name ?? "-"}</p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-green-700">Amount Received</p>
            <p className="mt-1.5 text-[30px] leading-none font-bold text-[#1a5c2e] [font-family:var(--font-dmsans)]">
              {formatCurrency(Number(receipt.amount_received))}
            </p>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-green-200 bg-white text-green-700">
            <Receipt size={18} />
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700">
            <FileText size={14} />
          </span>
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
            Linked Invoice
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/invoices/${receipt.invoice.invoice_id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[12px] font-medium text-indigo-900 transition-colors hover:bg-indigo-100"
          >
            <FileText size={13} className="text-indigo-700" />
            {receipt.invoice.invoice_number}
          </Link>
        </div>
      </section>
    </section>
  );
};

export default ReceiptDetailPage;
