"use client";

import { useRef } from "react";
import Image from "next/image";
import PrintButton from "@/components/print/PrintButton";

type InvoicePrintLine = {
  lineId: number;
  productName: string;
  packSize: string;
  quantity: number;
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

const splitAmount = (value: number) => {
  const absoluteValue = Math.max(0, value);
  const rounded = Math.round(absoluteValue * 100) / 100;
  const rupees = Math.floor(rounded);
  const cents = Math.round((rounded - rupees) * 100);

  return {
    rupees: rupees.toLocaleString("en-LK"),
    cents: String(cents).padStart(2, "0"),
  };
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
          <header className="grid grid-cols-[1.25fr_1fr_1.25fr] items-start gap-4 border-b border-stone-300 pb-4">
            <section className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Customer Details</p>
              <p className="text-[14px] font-semibold text-[#2b2d7e]">{customerName}</p>
              {customerPhone && <p className="text-stone-700">{customerPhone}</p>}
              {customerAddress && <p className="text-stone-700">{customerAddress}</p>}
            </section>

            <section className="flex flex-col items-center justify-start gap-2 pt-0 text-center">
              <Image src="/agrinova-logo.jpeg" alt="Agrinova" width={160} height={48} className="h-12 w-auto object-contain" priority />
              <p className="text-[28px] font-semibold tracking-[0.18em] text-[#2b2d7e]">INVOICE</p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-stone-500">Official customer copy</p>
            </section>

            <section className="space-y-1 text-right">
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
                <col style={{ width: "27%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "6%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2}>Product</th>
                  <th rowSpan={2}>Pack Size</th>
                  <th rowSpan={2} className="text-center">
                    Qty
                  </th>
                  <th colSpan={2} className="text-center">
                    Unit Price
                  </th>
                  <th rowSpan={2} className="text-center">
                    Discount %
                  </th>
                  <th colSpan={2} className="text-center">
                    Sub total
                  </th>
                </tr>
                <tr>
                  <th className="text-right">Rs</th>
                  <th className="text-right">cts</th>
                  <th className="text-right">Rs</th>
                  <th className="text-right">cts</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.lineId}>
                    <td className="font-medium text-stone-900">{line.productName}</td>
                    <td>{line.packSize}</td>
                    <td className="text-center">{line.quantity}</td>
                    {(() => {
                      const unitPrice = splitAmount(line.unitPrice);
                      return (
                        <>
                          <td className="text-right tabular-nums">{unitPrice.rupees}</td>
                          <td className="text-right tabular-nums">{unitPrice.cents}</td>
                        </>
                      );
                    })()}
                    <td className="text-center">{line.discount.toFixed(2)}%</td>
                    {(() => {
                      const netLineTotal = splitAmount(line.netLineTotal);
                      return (
                        <>
                          <td className="text-right font-medium tabular-nums text-stone-900">{netLineTotal.rupees}</td>
                          <td className="text-right font-medium tabular-nums text-stone-900">{netLineTotal.cents}</td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="text-right text-[12px] font-semibold uppercase tracking-[0.08em] text-stone-700">
                    Total Amount
                  </td>
                  {(() => {
                    const total = splitAmount(totalAmount);
                    return (
                      <>
                        <td className="text-right text-[13px] font-semibold tabular-nums text-[#1a5c2e]">{total.rupees}</td>
                        <td className="text-right text-[13px] font-semibold tabular-nums text-[#1a5c2e]">{total.cents}</td>
                      </>
                    );
                  })()}
                </tr>
              </tfoot>
            </table>
          </section>

          <section className="mt-10 grid grid-cols-3 gap-8 text-[12px]">
            <div className="flex flex-col gap-10">
              <div className="border-b border-stone-400 pb-1" />
              <p className="text-center font-medium text-stone-700">Prepared By</p>
            </div>
            <div className="flex flex-col gap-10">
              <div className="border-b border-stone-400 pb-1" />
              <p className="text-center font-medium text-stone-700">Authorized By</p>
            </div>
            <div className="flex flex-col gap-10">
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
