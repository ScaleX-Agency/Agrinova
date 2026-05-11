"use client";

import { useRef } from "react";
import PrintButton from "@/components/print/PrintButton";
import { PrintPage } from "@/components/print/PrintDocuments";

type SalesReturnPrintLine = {
  lineId: number;
  productCode: string;
  productName: string;
  packSize: string;
  usableQty: number;
  unusableQty: number;
  totalQty: number;
  condition: string;
  reasonForReturn: string;
  lineTotal: number;
};

type SalesReturnPrintButtonProps = {
  srnNumber: string;
  srnDate: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  locationCode: string;
  locationName: string;
  createdBy: string;
  notes: string | null;
  lines: SalesReturnPrintLine[];
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

const SalesReturnPrintButton = ({
  srnNumber,
  srnDate,
  invoiceNumber,
  invoiceDate,
  customerName,
  locationCode,
  locationName,
  createdBy,
  notes,
  lines,
}: SalesReturnPrintButtonProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <PrintButton contentRef={contentRef} documentTitle={srnNumber} label="Print" />
      <div className="hidden" aria-hidden>
        <div ref={contentRef}>
          <PrintPage
            title={`Sales Return Note ${srnNumber}`}
            subtitle="Return adjustment document"
            rightHeader={
              <>
                <p>SRN Date: {formatDate(srnDate)}</p>
                <p>Invoice: {invoiceNumber}</p>
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
                <p className="font-semibold text-stone-800">Created By</p>
                <p>{createdBy}</p>
                <p className="mt-3 font-semibold text-stone-800">Invoice Date</p>
                <p>{formatDate(invoiceDate)}</p>
              </div>
            </section>

            <section className="mt-6">
              <table className="print-table w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    <th>Product Code</th>
                    <th>Product</th>
                    <th>Pack Size</th>
                    <th className="text-right">Usable Qty</th>
                    <th className="text-right">Unusable Qty</th>
                    <th className="text-right">Total Qty</th>
                    <th>Condition</th>
                    <th>Reason</th>
                    <th className="text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.lineId}>
                      <td>{line.productCode}</td>
                      <td>{line.productName}</td>
                      <td>{line.packSize}</td>
                      <td className="text-right">{line.usableQty}</td>
                      <td className="text-right">{line.unusableQty}</td>
                      <td className="text-right">{line.totalQty}</td>
                      <td>{line.condition}</td>
                      <td>{line.reasonForReturn}</td>
                      <td className="text-right text-red-700">- {formatCurrency(line.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="mt-6 text-[13px]">
              <p className="font-semibold text-stone-800">Notes</p>
              <p className="mt-1 whitespace-pre-wrap">{notes?.trim() ? notes : "No notes added."}</p>
            </section>
          </PrintPage>
        </div>
      </div>
    </>
  );
};

export default SalesReturnPrintButton;

