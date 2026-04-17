import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import ReceiptPrintButton from "./ReceiptPrintButton";

const METHOD_LABEL: Record<"CASH" | "CHEQUE" | "BANK_TRANSFER", string> = {
  CASH: "Cash",
  CHEQUE: "Cheque",
  BANK_TRANSFER: "Bank Transfer",
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
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Sales</p>
          <h1 className="text-[28px] leading-tight text-[#2b2d7e] [font-family:var(--font-playfair)] font-semibold">
            Receipt {receiptNo}
          </h1>
          <p className="text-[13px] text-stone-500">Detailed receipt record from backend data.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ReceiptPrintButton
            receiptNo={receiptNo}
            receiptDate={receipt.receipt_date.toISOString()}
            amountReceived={Number(receipt.amount_received)}
            paymentMethodLabel={METHOD_LABEL[receipt.payment_method]}
            collectedBy={receipt.collector.full_name}
            invoiceNo={receipt.invoice.invoice_number}
            invoiceDate={receipt.invoice.invoice_date.toISOString()}
            customerName={receipt.invoice.customer.name}
            salesRepName={receipt.invoice.rep.full_name}
            chequeNo={receipt.cheque_no ?? null}
            chequeDate={receipt.cheque_date ? receipt.cheque_date.toISOString() : null}
            bankName={receipt.bank_name ?? null}
          />
          <Link
            href={`/invoices/${receipt.invoice.invoice_id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a5c2e] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#2d7a42]"
          >
            View Invoice
          </Link>
          <Link
            href="/receipts"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
          >
            <ArrowLeft size={14} />
            Back to Receipts
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Receipt Date</p>
          <p className="mt-1 text-[16px] font-semibold text-stone-900">{formatDate(receipt.receipt_date)}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Amount Received</p>
          <p className="mt-1 text-[16px] font-semibold text-[#1a5c2e]">{formatCurrency(Number(receipt.amount_received))}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Payment Method</p>
          <p className="mt-1 text-[16px] font-semibold text-stone-900">{METHOD_LABEL[receipt.payment_method]}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Collected By</p>
          <p className="mt-1 text-[16px] font-semibold text-stone-900">{receipt.collector.full_name}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
        <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-playfair)]">Invoice Reference</h2>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Invoice #</p>
            <p className="mt-1 text-[14px] font-semibold text-stone-800">{receipt.invoice.invoice_number}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Invoice Date</p>
            <p className="mt-1 text-[14px] font-semibold text-stone-800">{formatDate(receipt.invoice.invoice_date)}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Customer</p>
            <p className="mt-1 text-[14px] font-semibold text-stone-800">{receipt.invoice.customer.name}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Sales Rep</p>
            <p className="mt-1 text-[14px] font-semibold text-stone-800">{receipt.invoice.rep.full_name}</p>
          </div>
        </div>
      </section>

      {(receipt.payment_method === "CHEQUE" || receipt.payment_method === "BANK_TRANSFER") && (
        <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
          <h2 className="text-[16px] font-semibold text-stone-900 [font-family:var(--font-playfair)]">Bank Details</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {receipt.payment_method === "CHEQUE" && (
              <>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Cheque No</p>
                  <p className="mt-1 text-[14px] font-semibold text-stone-800">{receipt.cheque_no ?? "-"}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Cheque Date</p>
                  <p className="mt-1 text-[14px] font-semibold text-stone-800">
                    {receipt.cheque_date ? formatDate(receipt.cheque_date) : "-"}
                  </p>
                </div>
              </>
            )}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Bank Name</p>
              <p className="mt-1 text-[14px] font-semibold text-stone-800">{receipt.bank_name ?? "-"}</p>
            </div>
          </div>
        </section>
      )}
    </section>
  );
};

export default ReceiptDetailPage;
