"use client";

import { useRef } from "react";
import PrintButton from "@/components/print/PrintButton";
import { PrintPage } from "@/components/print/PrintDocuments";

type GrnPrintLine = {
  lineId: number;
  productCode: string;
  productName: string;
  packSize: string;
  quantity: number;
};

type GrnPrintButtonProps = {
  grnNumber: string;
  grnDate: string;
  entryType: "LOCAL_PURCHASE" | "FOREIGN_IMPORT";
  locationCode: string;
  locationName: string;
  referenceNo: string | null;
  notes: string | null;
  createdBy: string;
  createdByUsername: string;
  lines: GrnPrintLine[];
  totalQuantity: number;
};

const ENTRY_TYPE_LABEL: Record<"LOCAL_PURCHASE" | "FOREIGN_IMPORT", string> = {
  LOCAL_PURCHASE: "Local Purchase",
  FOREIGN_IMPORT: "Foreign Import",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // eslint-disable-next-line
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const GrnPrintButton = ({
  grnNumber,
  grnDate,
  entryType,
  locationCode,
  locationName,
  referenceNo,
  notes,
  createdBy,
  createdByUsername,
  lines,
  totalQuantity,
}: GrnPrintButtonProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <PrintButton
        contentRef={contentRef}
        documentTitle={grnNumber}
        label="Print GRN"
      />

      <div className="hidden" aria-hidden>
        <div ref={contentRef}>
          <PrintPage
            title={`Goods Receiving Note ${grnNumber}`}
            subtitle="Stock receiving document"
            rightHeader={
              <>
                <p>Date: {formatDate(grnDate)}</p>
                <p>Entry Type: {ENTRY_TYPE_LABEL[entryType]}</p>
                <p>Reference: {referenceNo ?? "-"}</p>
              </>
            }
          >
            <section className="mt-6 grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <p className="font-semibold text-stone-800">Location</p>
                <p>
                  {locationCode} - {locationName}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-stone-800">Created By</p>
                <p>{createdBy}</p>
                <p className="text-[12px] text-stone-500">
                  {createdByUsername}
                </p>
              </div>
            </section>

            <section className="mt-6">
              <table className="print-table w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    <th>Product Code</th>
                    <th>Product</th>
                    <th>Pack Size</th>
                    <th className="text-center">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.lineId}>
                      <td>{line.productCode}</td>
                      <td>{line.productName}</td>
                      <td>{line.packSize}</td>
                      <td className="text-center">{line.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="mt-6 ml-auto w-[320px] text-[14px] font-semibold">
              <div className="flex items-center justify-between border-t border-stone-300 pt-2 text-[#1a5c2e]">
                <span>Total Quantity</span>
                <span>{totalQuantity} units</span>
              </div>
            </section>

            {notes && (
              <section className="mt-6 text-[13px]">
                <p className="font-semibold text-stone-800">Notes</p>
                <p className="mt-1 whitespace-pre-wrap">{notes}</p>
              </section>
            )}
          </PrintPage>
        </div>
      </div>
    </>
  );
};

export default GrnPrintButton;
