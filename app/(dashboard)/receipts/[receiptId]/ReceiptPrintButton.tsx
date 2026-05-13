"use client";

import { useRef } from "react";
import Image from "next/image";
import PrintButton from "@/components/print/PrintButton";
import { numberToWords } from "@/lib/numberToWords";

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
        <div ref={contentRef} className="print-sheet [font-family:var(--font-dmsans)] text-stone-900 p-6">
          {/* Header */}
          <div className="flex flex-col items-center justify-center text-center pb-4 border-b-2 border-stone-800">
            <Image
              src="/agrinova-logo.jpeg"
              alt="Agrinova Logo"
              width={140}
              height={45}
              className="object-contain"
            />
            <p className="mt-4 text-[14px] font-medium">205 D Kalapaluwawa Road, Koswatta, Battaramulla</p>
            <p className="text-[14px]">Tel : 0115 635034/5, Fax : 0112 073605</p>
          </div>

          {/* Title Area */}
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-[14px]">Date: {formatDate(receiptDate)}</p>
            </div>
            <h1 className="text-[28px] font-bold tracking-widest text-stone-900 absolute left-1/2 -translate-x-1/2 uppercase">Receipt</h1>
            <div className="text-right">
              <p className="text-[16px] font-bold text-[#a32d2d]">NO: {receiptNo}</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
            <div className="flex items-end gap-3">
              <span className="whitespace-nowrap font-medium min-w-[220px]">Received with thanks from :</span>
              <div className="flex-1 border-b border-stone-400 pb-1 font-semibold text-[16px] px-2">{customerName}</div>
            </div>
            
            <div className="flex items-end gap-3">
              <span className="whitespace-nowrap font-medium min-w-[220px]">The sum of Rupees :</span>
              <div className="flex-1 border-b border-stone-400 pb-1 font-semibold px-2 uppercase text-[14px]">
                &nbsp;
              </div>
            </div>

            <div className="flex items-end gap-3">
              <span className="whitespace-nowrap font-medium min-w-[220px]">Payment of Invoice Nos :</span>
              <div className="flex-1 border-b border-stone-400 pb-1 font-semibold px-2">{invoiceNo}</div>
            </div>

            <div className="flex items-end gap-3">
              <span className="whitespace-nowrap font-medium min-w-[220px]">Cash / Cheque / Bank :</span>
              <div className="flex-1 border-b border-stone-400 pb-1 font-semibold px-2">
                {paymentMethodLabel}
                {chequeNo ? ` (Cheque No: ${chequeNo}${chequeDate ? ` | Date: ${formatDate(chequeDate)}` : ""})` : ""}
                {bankName ? ` | Bank: ${bankName}` : ""}
              </div>
            </div>
          </div>

          {/* Footer Area */}
          <div className="mt-12 flex items-end justify-between">
            <div className="w-[200px] border border-stone-400 p-3 bg-stone-50">
              <p className="text-[18px] font-bold text-center">Rs. {formatCurrency(amountReceived).replace("LKR", "").trim()}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-[160px] h-[80px] border border-dashed border-stone-300 flex items-center justify-center text-stone-400 text-[13px] mb-2">
                Stamp
              </div>
              <div className="w-[200px] border-b border-stone-400" />
              <p className="mt-2 text-[14px]">Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReceiptPrintButton;
