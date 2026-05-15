"use client";

import { useRef } from "react";
import Image from "next/image";
import PrintButton from "@/components/print/PrintButton";

type InvoicePrintLine = {
  lineId: number;
  productName: string;
  packSize: string;
  quantity: number;
  freeQuantity: number;
  unitPrice: number;
  discount: number;
  netLineTotal: number;
};

type InvoicePrintButtonProps = {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  lines: InvoicePrintLine[];
  totalAmount: number;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatPrintAmount = (value: number) => {
  const absoluteValue = Math.max(0, value);
  const rounded = Math.round(absoluteValue * 100) / 100;

  return rounded.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const InvoicePrintButton = ({
  invoiceNo,
  invoiceDate,
  customerName,
  customerPhone,
  customerAddress,
  lines,
  totalAmount,
}: InvoicePrintButtonProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <PrintButton contentRef={contentRef} documentTitle={invoiceNo} label="Print Invoice" />

      <div className="hidden" aria-hidden>
        <div ref={contentRef} className="print-sheet invoice-print-sheet [font-family:var(--font-dmsans)] text-[12px] text-stone-900">
          <header className="invoice-print-header grid grid-cols-[1.35fr_0.8fr_1fr] items-start gap-3 border-b border-stone-300 pb-3">
            <section className="space-y-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Customer Details</p>
              <p className="text-[13px] font-semibold leading-tight text-[#2b2d7e]">{customerName}</p>
              {customerPhone && <p className="text-stone-700">{customerPhone}</p>}
              {customerAddress && <p className="line-clamp-2 text-stone-700">{customerAddress}</p>}
            </section>

            <section className="invoice-print-brand flex flex-col items-center justify-start gap-1 pt-0 text-center">
              <Image src="/agrinova-logo.jpeg" alt="Agrinova" width={144} height={42} className="h-10 w-auto object-contain" priority />
              <p className="text-[24px] font-semibold leading-none tracking-[0.16em] text-[#2b2d7e]">INVOICE</p>
              <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">Customer copy</p>
            </section>

            <section className="space-y-0.5 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Invoice Details</p>
              <p>
                <span className="font-semibold text-stone-700">Invoice No:</span> #{invoiceNo}
              </p>
              <p>
                <span className="font-semibold text-stone-700">Date:</span> {formatDate(invoiceDate)}
              </p>
            </section>
          </header>

          <section className="mt-5">
            <table className="print-table invoice-table w-full border-collapse text-[11px]">
              <colgroup>
                <col style={{ width: "34%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "17%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Pack</th>
                  <th className="text-center">Qty</th>
                  <th className="text-center">Free</th>
                  <th className="text-right">Unit Rs.</th>
                  <th className="text-center">Disc.</th>
                  <th className="text-right">Amount Rs.</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.lineId}>
                    <td className="font-medium text-stone-900">{line.productName}</td>
                    <td>{line.packSize}</td>
                    <td className="text-center">{line.quantity}</td>
                    <td className="text-center font-medium text-[#1a5c2e]">{line.freeQuantity > 0 ? line.freeQuantity : "-"}</td>
                    <td className="text-right tabular-nums">{formatPrintAmount(line.unitPrice)}</td>
                    <td className="text-center">{line.discount > 0 ? `${line.discount.toFixed(2)}%` : "-"}</td>
                    <td className="text-right font-medium tabular-nums text-stone-900">{formatPrintAmount(line.netLineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-700">
                    Total Amount Rs.
                  </td>
                  <td className="text-right text-[13px] font-semibold tabular-nums text-[#1a5c2e]">{formatPrintAmount(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section className="invoice-print-signatures mt-8 grid grid-cols-3 gap-7 text-[11px]">
            <div className="flex flex-col gap-7">
              <div className="border-b border-stone-400 pb-1" />
              <p className="text-center font-medium text-stone-700">Prepared By</p>
            </div>
            <div className="flex flex-col gap-7">
              <div className="border-b border-stone-400 pb-1" />
              <p className="text-center font-medium text-stone-700">Authorized By</p>
            </div>
            <div className="flex flex-col gap-7">
              <div className="border-b border-stone-400 pb-1" />
              <p className="text-center font-medium text-stone-700">Customer</p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default InvoicePrintButton;
