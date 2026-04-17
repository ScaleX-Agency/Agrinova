"use client";

import { useRef } from "react";
import PrintButton from "@/components/print/PrintButton";
import { PrintPage } from "@/components/print/PrintDocuments";

type GinPrintLine = {
  lineId: number;
  productName: string;
  packSize: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type GinPrintButtonProps = {
  ginNumber: string;
  ginDate: string;
  invoiceNo: string | null;
  customerName: string;
  locationCode: string;
  locationName: string;
  preparedBy: string;
  receivedBy: string;
  lines: GinPrintLine[];
  totalValue: number;
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

const GinPrintButton = ({
  ginNumber,
  ginDate,
  invoiceNo,
  customerName,
  locationCode,
  locationName,
  preparedBy,
  receivedBy,
  lines,
  totalValue,
}: GinPrintButtonProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <PrintButton contentRef={contentRef} documentTitle={ginNumber} label="Print GIN" />

      <div className="hidden" aria-hidden>
        <div ref={contentRef}>
          <PrintPage
            title={`Goods Issue Note ${ginNumber}`}
            subtitle="Stock issue document"
            rightHeader={
              <>
                <p>Date: {formatDate(ginDate)}</p>
                <p>Invoice: {invoiceNo ?? "Not Linked"}</p>
              </>
            }
          >
            <section className="mt-6 grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <p className="font-semibold text-stone-800">Customer</p>
                <p>{customerName}</p>
                <p className="mt-3 font-semibold text-stone-800">Location</p>
                <p>
                  {locationCode} - {locationName}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-stone-800">Prepared By</p>
                <p>{preparedBy}</p>
                <p className="mt-3 font-semibold text-stone-800">Received By</p>
                <p>{receivedBy}</p>
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
                      <td className="text-right">{formatCurrency(line.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="mt-6 ml-auto w-[320px] text-[14px] font-semibold">
              <div className="flex items-center justify-between border-t border-stone-300 pt-2 text-[#1a5c2e]">
                <span>Total Value</span>
                <span>{formatCurrency(totalValue)}</span>
              </div>
            </section>
          </PrintPage>
        </div>
      </div>
    </>
  );
};

export default GinPrintButton;
