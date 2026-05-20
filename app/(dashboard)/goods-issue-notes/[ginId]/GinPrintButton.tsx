"use client";

import { useRef } from "react";
import PrintButton from "@/components/print/PrintButton";
import { PrintPage } from "@/components/print/PrintDocuments";

type GinPrintLine = {
  lineId: number;
  productName: string;
  packSize: string;
  quantity: number;
};

type GinPrintButtonProps = {
  ginNumber: string;
  ginDate: string;
  invoiceNo: string | null;
  customerName: string;
  locationCode: string;
  locationName: string;
  notes: string | null;
  lines: GinPrintLine[];
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const GinPrintButton = ({
  ginNumber,
  ginDate,
  invoiceNo,
  customerName,
  locationCode,
  locationName,
  notes,
  lines,
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
                <p className="font-semibold text-stone-800">Notes</p>
                <p>{notes?.trim() ? notes : "-"}</p>
              </div>
            </section>

            <section className="mt-6">
              <table className="print-table w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Pack Size</th>
                    <th className="text-center">Qty</th>
                    <th>Movement</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.lineId}>
                      <td>{line.productName}</td>
                      <td>{line.packSize}</td>
                      <td className="text-center">{line.quantity}</td>
                      <td>Issued</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </PrintPage>
        </div>
      </div>
    </>
  );
};

export default GinPrintButton;
