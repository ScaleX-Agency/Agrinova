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

const invoicePrintPageStyle = `
  @page {
    size: 8.5in 5.5in;
    margin: 0;
  }

  @media print {
    html,
    body {
      width: 8.5in;
      min-width: 8.5in;
      height: 5.5in;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
    }

    .invoice-print-company-name {
      font-size: 15px !important;
      line-height: 1 !important;
    }

    .invoice-print-company-details,
    .invoice-print-company-details p {
      font-size: 7px !important;
      line-height: 1.05 !important;
    }

    .invoice-print-title {
      font-size: 25px !important;
      line-height: 1 !important;
    }
  }
`;

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
      <PrintButton
        contentRef={contentRef}
        documentTitle={invoiceNo}
        label="Print Invoice"
        pageStyle={invoicePrintPageStyle}
      />

      <div className="hidden" aria-hidden>
        <div ref={contentRef} className="print-sheet invoice-print-sheet [font-family:var(--font-dmsans)] text-[12px] text-stone-900">
          <header className="invoice-print-header grid grid-cols-[1fr_1.45fr_1fr] items-start gap-3 border-b border-stone-300 pb-3">
            <section className="space-y-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Customer Details</p>
              <p className="text-[13px] font-semibold leading-tight text-[#2b2d7e]">{customerName}</p>
              {customerPhone && <p className="text-stone-700">{customerPhone}</p>}
              {customerAddress && <p className="line-clamp-2 text-stone-700">{customerAddress}</p>}
            </section>

            <section className="invoice-print-brand flex flex-col items-center justify-start pt-0">
              <div className="flex items-center justify-center gap-2">
                <Image src="/agrinova-logo.jpeg" alt="Agrinova" width={42} height={42} className="h-8 w-8 shrink-0 object-contain" priority />
                <p className="invoice-print-company-name text-[18px] font-semibold leading-none text-[#2b2d7e]">Agrinova (Pvt) Limited</p>
              </div>
              <div className="invoice-print-company-details mt-1 space-y-0.5 text-center text-stone-700">
                <p>205 D, Kalapaluwawa Road, Koswatta, Battaramulla</p>
                <p>Tel: 0115 635034/5, 0777 687897</p>
                <p>Fax: 0112 073605</p>
              </div>
              <p className="invoice-print-title mt-1 text-center font-semibold text-stone-900">Invoice</p>
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

          <section className="mt-3 flex justify-start">
            <div className="w-[4.8in] space-y-1 text-left text-[7.5px] font-medium leading-tight text-stone-800">
              <p>Maximum Credit Period is 30 Days</p>
              <p>
                All cheques should be crossed <span className="font-bold">&quot;Account Payee Only&quot;</span> and drawn in favour of
                <span className="font-bold"> &quot;Agrinova (PVT) Ltd&quot;</span>
              </p>
              <p>
                Please collect a <span className="font-bold">RECEIPT</span> for your Cheque or cash
              </p>
            </div>
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
