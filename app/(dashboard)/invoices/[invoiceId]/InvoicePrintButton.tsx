"use client";

import { useRef } from "react";
import PrintButton from "@/components/print/PrintButton";
import { PrintPage } from "@/components/print/PrintDocuments";

type InvoicePrintLine = {
  lineId: number;
  productName: string;
  packSize: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
};

type InvoicePrintButtonProps = {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  repName: string;
  statusLabel: string;
  lines: InvoicePrintLine[];
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
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

const InvoicePrintButton = ({
  invoiceNo,
  invoiceDate,
  customerName,
  customerPhone,
  customerAddress,
  repName,
  statusLabel,
  lines,
  subtotal,
  discountTotal,
  grandTotal,
}: InvoicePrintButtonProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <PrintButton contentRef={contentRef} documentTitle={invoiceNo} label="Print Invoice" />

      <div className="hidden" aria-hidden>
        <div ref={contentRef}>
          <PrintPage
            title={`Invoice ${invoiceNo}`}
            subtitle="Official customer copy"
            rightHeader={
              <>
                <p>Date: {formatDate(invoiceDate)}</p>
                <p>Status: {statusLabel}</p>
              </>
            }
          >
            <section className="mt-6 grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <p className="font-semibold text-stone-800">Customer</p>
                <p>{customerName}</p>
                {customerPhone && <p>{customerPhone}</p>}
                {customerAddress && <p>{customerAddress}</p>}
              </div>
              <div className="text-right">
                <p className="font-semibold text-stone-800">Sales Representative</p>
                <p>{repName}</p>
              </div>
            </section>

            <section className="mt-6">
              <table className="print-table w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Pack Size</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-center">Discount (%)</th>
                    <th className="text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.lineId}>
                      <td>{line.productName}</td>
                      <td>{line.packSize}</td>
                      <td className="text-center">{line.quantity}</td>
                      <td className="text-right">{formatCurrency(line.unitPrice)}</td>
                      <td className="text-center">{line.discount.toFixed(2)}</td>
                      <td className="text-right">{formatCurrency(line.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="mt-6 ml-auto w-[320px] space-y-1 text-[13px]">
              <div className="flex items-center justify-between border-b border-stone-200 pb-1">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-stone-200 pb-1">
                <span>Discount</span>
                <span>- {formatCurrency(discountTotal)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 text-[15px] font-semibold text-[#1a5c2e]">
                <span>Grand Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </section>
          </PrintPage>
        </div>
      </div>
    </>
  );
};

export default InvoicePrintButton;
