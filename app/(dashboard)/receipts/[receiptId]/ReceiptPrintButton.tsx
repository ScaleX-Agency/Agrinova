"use client";

import { useRef } from "react";
import PrintButton from "@/components/print/PrintButton";
import { PrintPage } from "@/components/print/PrintDocuments";

type ReceiptPrintButtonProps = {
  receiptNo: string;
  receiptDate: string;
  amountReceived: number;
  paymentMethodLabel: string;
  collectedBy: string;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  salesRepName: string;
  chequeNo: string | null;
  chequeDate: string | null;
  bankName: string | null;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
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

const ReceiptPrintButton = ({
  receiptNo,
  receiptDate,
  amountReceived,
  paymentMethodLabel,
  collectedBy,
  invoiceNo,
  invoiceDate,
  customerName,
  salesRepName,
  chequeNo,
  chequeDate,
  bankName,
}: ReceiptPrintButtonProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <PrintButton contentRef={contentRef} documentTitle={receiptNo} label="Print Receipt" />

      <div className="hidden" aria-hidden>
        <div ref={contentRef}>
          <PrintPage
            title={`Receipt ${receiptNo}`}
            subtitle="Payment acknowledgment"
            rightHeader={<p>Date: {formatDate(receiptDate)}</p>}
          >
            <section className="mt-6 grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <p className="font-semibold text-stone-800">Received From</p>
                <p>{customerName}</p>
                <p className="mt-3 font-semibold text-stone-800">Collected By</p>
                <p>{collectedBy}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-stone-800">Payment Method</p>
                <p>{paymentMethodLabel}</p>
                <p className="mt-3 text-[18px] font-semibold text-[#1a5c2e]">{formatCurrency(amountReceived)}</p>
              </div>
            </section>

            <section className="mt-6">
              <table className="print-table w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Invoice Date</th>
                    <th>Sales Rep</th>
                    <th className="text-right">Amount Received</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{invoiceNo}</td>
                    <td>{formatDate(invoiceDate)}</td>
                    <td>{salesRepName}</td>
                    <td className="text-right">{formatCurrency(amountReceived)}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {(chequeNo || chequeDate || bankName) && (
              <section className="mt-6 text-[13px]">
                <p className="font-semibold text-stone-800">Bank Details</p>
                <div className="mt-2 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-stone-500">Cheque No</p>
                    <p>{chequeNo ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-stone-500">Cheque Date</p>
                    <p>{chequeDate ? formatDate(chequeDate) : "-"}</p>
                  </div>
                  <div>
                    <p className="text-stone-500">Bank Name</p>
                    <p>{bankName ?? "-"}</p>
                  </div>
                </div>
              </section>
            )}
          </PrintPage>
        </div>
      </div>
    </>
  );
};

export default ReceiptPrintButton;
