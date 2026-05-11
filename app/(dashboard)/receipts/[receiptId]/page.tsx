import Link from "next/link";
import { notFound } from "next/navigation";
import { CreditCard, DollarSign, Building2, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import BackNavigationLink from "@/components/ui/BackNavigationLink";
import ReceiptPrintButton from "./ReceiptPrintButton";
import DeleteReceiptButton from "../DeleteReceiptButton";

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

const ReceiptDetailPage = async ({
  params,
}: {
  params: Promise<{ receiptId: string }>;
}) => {
  const receiptId = Number((await params).receiptId);

  if (!Number.isInteger(receiptId) || receiptId <= 0) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const canDeleteReceipt = isAdminUser(currentUser);

  const receipt = await prisma.receipt.findUnique({
    where: { receipt_id: receiptId },
    select: {
      receipt_id: true,
      is_active: true,
      receipt_date: true,
      amount: true,
      payment_method: true,
      cheque_no: true,
      cheque_date: true,
      bank_name: true,
      created_at: true,
      updated_at: true,
      notes: true,
      creator: {
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

  if (!receipt || !receipt.is_active) {
    notFound();
  }

  const year = receipt.receipt_date.getFullYear();
  const month = String(receipt.receipt_date.getMonth() + 1).padStart(2, "0");
  const receiptNo = `RCP-${year}${month}-${String(receipt.receipt_id).padStart(3, "0")}`;
  const method = receipt.payment_method as "CASH" | "CHEQUE" | "BANK_TRANSFER";

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <BackNavigationLink
              href="/receipts"
              label="Back to Receipts"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-700 [font-family:var(--font-dmsans)]"
            />
            <div className="flex flex-wrap items-end gap-2">
              <h1 className="text-[26px] leading-tight font-semibold text-[#2b2d7e] [font-family:var(--font-dmsans)]">
                Receipt {receiptNo}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${METHOD_BADGE_STYLE[method].bg} ${METHOD_BADGE_STYLE[method].text}`}
              >
                {METHOD_BADGE_STYLE[method].icon}
                {METHOD_LABEL[method]}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ReceiptPrintButton
              receiptNo={receiptNo}
              receiptDate={receipt.receipt_date.toISOString()}
              amountReceived={Number(receipt.amount)}
              paymentMethodLabel={METHOD_LABEL[method]}
              collectedBy={receipt.creator.full_name}
              invoiceNo={receipt.invoice.invoice_number}
              invoiceDate={receipt.invoice.invoice_date.toISOString()}
              customerName={receipt.invoice.customer.name}
              salesRepName={receipt.invoice.rep.full_name}
              chequeNo={receipt.cheque_no ?? null}
              chequeDate={receipt.cheque_date ? receipt.cheque_date.toISOString() : null}
              bankName={receipt.bank_name ?? null}
            />
            {canDeleteReceipt ? (
              <DeleteReceiptButton receiptId={receipt.receipt_id} receiptNo={receiptNo} />
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
                Receipt Voucher
              </h2>
              <p className="mt-0.5 text-[12px] text-stone-600">
                205D, Kalapaluwawa Road, Koswatta, Battaramulla
              </p>
            </div>
            <div className="text-right text-[12px] text-stone-600">
              <p>
                <span className="font-medium text-stone-800">Receipt No:</span> {receiptNo}
              </p>
              <p>
                <span className="font-medium text-stone-800">Receipt Date:</span> {formatDate(receipt.receipt_date)}
              </p>
              <p>
                <span className="font-medium text-stone-800">Payment Method:</span> {METHOD_LABEL[method]}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 border-b border-stone-200 px-5 py-4 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-stone-500">Received From</p>
            <p className="mt-1 text-[14px] font-semibold text-stone-900">{receipt.invoice.customer.name}</p>
            <p className="text-[13px] text-stone-700">Invoice: {receipt.invoice.invoice_number}</p>
            <p className="text-[13px] text-stone-700">Invoice Date: {formatDate(receipt.invoice.invoice_date)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-stone-500">Collected By</p>
            <p className="mt-1 text-[14px] font-semibold text-stone-900">{receipt.creator.full_name}</p>
            <p className="text-[13px] text-stone-700">Sales Rep: {receipt.invoice.rep.full_name}</p>
          </div>
        </div>

        {(receipt.payment_method === "CHEQUE" || receipt.payment_method === "BANK_TRANSFER") && (
          <div className="border-b border-stone-200 px-5 py-4">
            <h3 className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Bank Details</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-[13px]">
              {receipt.payment_method === "CHEQUE" ? (
                <>
                  <p className="text-stone-700">
                    Cheque No: <span className="font-medium text-stone-900">{receipt.cheque_no ?? "-"}</span>
                  </p>
                  <p className="text-stone-700">
                    Cheque Date:{" "}
                    <span className="font-medium text-stone-900">
                      {receipt.cheque_date ? formatDate(receipt.cheque_date) : "-"}
                    </span>
                  </p>
                </>
              ) : null}
              <p className="text-stone-700">
                Bank Name: <span className="font-medium text-stone-900">{receipt.bank_name ?? "-"}</span>
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end px-5 py-4">
          <div className="w-full max-w-[360px] rounded-xl border border-stone-200 bg-stone-50 p-4 text-[13px]">
            <div className="flex items-center justify-between text-[15px] font-semibold text-[#1a5c2e]">
              <span>Amount Received</span>
              <span>{formatCurrency(Number(receipt.amount))}</span>
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
          href={`/invoices/${receipt.invoice.invoice_id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[12px] font-medium text-indigo-900 transition-colors hover:bg-indigo-100"
        >
          <FileText size={13} className="text-indigo-700" />
          {receipt.invoice.invoice_number}
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
        <p className="whitespace-pre-wrap text-[13px] text-stone-700">{receipt.notes?.trim() ? receipt.notes : "No notes added."}</p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-stone-500 [font-family:var(--font-dmsans)]">
          Record Metadata
        </h2>
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-[11px] text-stone-500">Created By</p>
            <p className="mt-0.5 text-[13px] font-medium text-stone-900">{receipt.creator.full_name}</p>
          </div>
          <div>
            <p className="text-[11px] text-stone-500">Created At</p>
            <p className="mt-0.5 text-[13px] font-medium text-stone-900">{formatDateTime(receipt.created_at)}</p>
          </div>
          <div>
            <p className="text-[11px] text-stone-500">Last Updated</p>
            <p className="mt-0.5 text-[13px] font-medium text-stone-900">{formatDateTime(receipt.updated_at)}</p>
          </div>
        </div>
      </section>
    </section>
  );
};

export default ReceiptDetailPage;
