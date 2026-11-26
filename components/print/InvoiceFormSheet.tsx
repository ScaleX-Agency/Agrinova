import type { CSSProperties, ReactNode } from "react";
import { INVOICE_FORM, INVOICE_FORM_PAGE_NAME } from "./invoiceFormLayout";

export type InvoiceFormLine = {
  lineId: number;
  productName: string;
  packSize: string;
  quantity: number;
  freeQuantity: number;
  unitPrice: number;
  discount: number;
  netLineTotal: number;
};

export type InvoiceFormSheetProps = {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  lines: InvoiceFormLine[];
  totalAmount: number;
  vatPercentage?: number;
  poNumber?: string | null;
  vatNumber?: string | null;
  receiptNo?: string | null;
  offsetXmm?: number;
  offsetYmm?: number;
  scalePct?: number;
  /** Screen-only: image of the blank form drawn behind the data (never printed). */
  backgroundSrc?: string;
};

const L = INVOICE_FORM;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatAmount = (value: number) =>
  (Math.round(Math.max(0, value) * 100) / 100).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Shrink long values so they stay inside the blank space on the form. */
const fitFontSize = (text: string, maxChars: number) => {
  if (text.length <= maxChars) return L.fontSizePt;
  return Math.max(8, Math.floor((L.fontSizePt * maxChars) / text.length * 2) / 2);
};

/**
 * Approximate Arial glyph widths (in em) so we can predict wrapping without
 * measuring the DOM. Deliberately rounded up so a row we count as 1 line
 * never wraps to 2 when printed.
 */
const glyphEm = (ch: string) => {
  if (ch === " ") return 0.28;
  if ("WM@%".includes(ch)) return 0.94;
  if (/[A-Z]/.test(ch)) return 0.72;
  if (/[0-9]/.test(ch)) return 0.56;
  if ("mw".includes(ch)) return 0.84;
  if ("iljtf.,:;'|!()[]/".includes(ch)) return 0.3;
  if (/[a-z]/.test(ch)) return 0.56;
  return 0.6;
};
const textEm = (text: string) => [...text].reduce((sum, ch) => sum + glyphEm(ch), 0);

/** Usable column width in em at 9.5pt (column width minus cell padding), with ~5% slack. */
const PRODUCT_LINE_EM = 20;
const PACK_LINE_EM = 6.7;
const MAX_LINES_PER_ROW = 2;

/** How many printed text lines a product row takes (1 or 2). */
const rowLines = (line: InvoiceFormLine) =>
  Math.min(
    MAX_LINES_PER_ROW,
    Math.max(
      1,
      Math.ceil(textEm(line.productName) / PRODUCT_LINE_EM),
      Math.ceil(textEm(line.packSize) / PACK_LINE_EM),
    ),
  );

type TextBlock = { fontPt: number; lines: number; lineHeightIn: number };

const PT_PER_IN = 72;
const LINE_SPACING = 1.15;
/** Word-wrapping wastes part of each wrapped line. */
const WRAP_SLACK = 0.92;

/** Arial / Arial Bold advance widths (1/1000 em) for printable ASCII from " " (32) to "~" (126). */
const ARIAL = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const ARIAL_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];
const arialEm = (text: string, bold = false) => {
  const table = bold ? ARIAL_BOLD : ARIAL;
  let width = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    width += code >= 32 && code <= 126 ? table[code - 32] : 600;
  }
  return width / 1000;
};

const linesNeeded = (em: number, fontPt: number, widthPt: number, slack = WRAP_SLACK) =>
  Math.max(1, Math.ceil((em * fontPt) / (widthPt * slack)));
/** Addresses have more short words / commas, so wrapping wastes more space. */
const ADDRESS_WRAP_SLACK = 0.82;

/**
 * Fit the customer name and address into the blank space beside the
 * "Customer" and "Address" labels (down to the "Contact No." row).
 * The name is never cut: it shrinks a little, then wraps onto a second
 * (or, for extreme names, third) line, and the address gets what's left.
 */
const layoutCustomerBlock = (name: string, address: string | null) => {
  const top = L.customer.name.y;
  const height = L.customer.contact.y - top - 0.02;
  const widthPt = L.customer.name.width * PT_PER_IN;
  const nameEm = arialEm(name, true);

  // One line if it fits at >= 8.5pt; otherwise wrap to 2 lines (3 when there is
  // no address) from 9pt down to 7pt, and only extreme names go beyond that.
  const oneLinePt = Math.min(L.fontSizePt, Math.floor(((widthPt * 0.97) / nameEm) * 2) / 2);
  const maxNameLines = address ? 2 : 3;
  let nameBlock: TextBlock;
  if (oneLinePt >= 8.5) {
    nameBlock = { fontPt: oneLinePt, lines: 1, lineHeightIn: L.lineHeight };
  } else {
    let fontPt = 9;
    while (fontPt > 7 && linesNeeded(nameEm, fontPt, widthPt) > maxNameLines) fontPt -= 0.5;
    nameBlock = { fontPt, lines: linesNeeded(nameEm, fontPt, widthPt), lineHeightIn: (fontPt * LINE_SPACING) / PT_PER_IN };
  }

  const remaining = height - nameBlock.lines * nameBlock.lineHeightIn;
  let addressBlock: TextBlock = { fontPt: 9, lines: 0, lineHeightIn: 0 };
  if (address && remaining > 0.1) {
    const addressEm = arialEm(address);
    for (const fontPt of [9, 8.5, 8, 7.5, 7]) {
      const lineHeightIn = (fontPt * LINE_SPACING) / PT_PER_IN;
      const fits = Math.floor(remaining / lineHeightIn + 0.01);
      const needed = linesNeeded(addressEm, fontPt, widthPt, ADDRESS_WRAP_SLACK);
      addressBlock = { fontPt, lines: Math.min(needed, fits), lineHeightIn };
      if (needed <= fits) break;
    }
  }

  return { top, height, name: nameBlock, address: addressBlock };
};

/** Split rows into sheets so no sheet holds more than `capacity` printed lines. */
const paginate = (items: InvoiceFormLine[], capacity: number): InvoiceFormLine[][] => {
  const pages: InvoiceFormLine[][] = [[]];
  let used = 0;
  for (const item of items) {
    const size = rowLines(item);
    if (used + size > capacity && pages[pages.length - 1].length > 0) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(item);
    used += size;
  }
  return pages;
};

type Box = { x: number; y: number; width: number };

const Field = ({ box, children, style }: { box: Box; children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      position: "absolute",
      left: `${box.x}in`,
      top: `${box.y}in`,
      width: `${box.width}in`,
      height: `${L.lineHeight}in`,
      lineHeight: `${L.lineHeight}in`,
      whiteSpace: "nowrap",
      overflow: "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);

const cell: CSSProperties = {
  padding: "0 0.04in",
  height: `${L.lineHeight}in`,
  lineHeight: `${L.lineHeight}in`,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontWeight: "normal",
};
const right: CSSProperties = { ...cell, textAlign: "right" };
const center: CSSProperties = { ...cell, textAlign: "center" };
/** Product / pack cells may wrap onto a second line instead of being cut off. */
const wrapCell: CSSProperties = {
  ...cell,
  height: "auto",
  verticalAlign: "top",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
};
const clamp2: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: MAX_LINES_PER_ROW,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};
const topRight: CSSProperties = { ...right, verticalAlign: "top" };
const topCenter: CSSProperties = { ...center, verticalAlign: "top" };

const InvoiceFormSheet = ({
  invoiceNo,
  invoiceDate,
  customerName,
  customerPhone,
  customerAddress,
  lines,
  totalAmount,
  vatPercentage = 0,
  poNumber,
  vatNumber,
  receiptNo,
  offsetXmm = 0,
  offsetYmm = 0,
  scalePct = 100,
  backgroundSrc,
}: InvoiceFormSheetProps) => {
  const pages = paginate(lines, L.maxRowsPerPage);
  const customerBlock = layoutCustomerBlock(customerName, customerAddress);
  const subtotal = vatPercentage > 0 ? totalAmount / (1 + vatPercentage / 100) : totalAmount;

  return (
    <>
      {pages.map((pageLines, pageIndex) => {
        const isLast = pageIndex === pages.length - 1;
        return (
          <div
            key={pageIndex}
            className="invoice-form-page"
            style={{
              position: "relative",
              width: `${L.page.width}in`,
              height: `${L.page.height}in`,
              overflow: "hidden",
              boxSizing: "border-box",
              background: "#fff",
              color: "#000",
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: `${L.fontSizePt}pt`,
              page: INVOICE_FORM_PAGE_NAME,
              breakAfter: isLast ? "auto" : "page",
              pageBreakAfter: isLast ? "auto" : "always",
            }}
          >
            {backgroundSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={backgroundSrc}
                alt=""
                className="no-print"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.9 }}
              />
            )}

            <div style={{ position: "absolute", inset: 0, transform: `translate(${offsetXmm}mm, ${offsetYmm}mm) scale(${scalePct / 100})`, transformOrigin: "0 0" }}>
              {/* Customer details */}
              {/* Name + address share the space between the "Customer" and "Contact No." rows. */}
              <div
                className="invoice-form-customer"
                style={{
                  position: "absolute",
                  left: `${L.customer.name.x}in`,
                  top: `${customerBlock.top}in`,
                  width: `${L.customer.name.width}in`,
                  height: `${customerBlock.height}in`,
                  overflow: "hidden",
                  overflowWrap: "anywhere",
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: `${customerBlock.name.fontPt}pt`,
                    lineHeight: `${customerBlock.name.lineHeightIn}in`,
                  }}
                >
                  {customerName}
                </div>
                {customerAddress && customerBlock.address.lines > 0 && (
                  <div
                    style={{
                      fontSize: `${customerBlock.address.fontPt}pt`,
                      lineHeight: `${customerBlock.address.lineHeightIn}in`,
                      display: "-webkit-box",
                      WebkitLineClamp: customerBlock.address.lines,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {customerAddress}
                  </div>
                )}
              </div>
              {customerPhone && <Field box={L.customer.contact}>{customerPhone}</Field>}

              {/* Invoice details */}
              <Field box={L.details.invoiceNo} style={{ fontWeight: "bold", fontSize: `${fitFontSize(invoiceNo, 11)}pt` }}>
                {invoiceNo}
              </Field>
              <Field box={L.details.date}>{formatDate(invoiceDate)}</Field>
              {poNumber && <Field box={L.details.poNo} style={{ fontSize: `${fitFontSize(poNumber, 12)}pt` }}>{poNumber}</Field>}
              {vatNumber && <Field box={L.details.vatNo} style={{ fontSize: `${fitFontSize(vatNumber, 12)}pt` }}>{vatNumber}</Field>}
              {receiptNo && <Field box={L.details.receiptNo} style={{ fontSize: `${fitFontSize(receiptNo, 12)}pt` }}>{receiptNo}</Field>}

              {/* Line items */}
              <div
                className="invoice-form-items"
                style={{
                  position: "absolute",
                  left: `${L.items.x}in`,
                  top: `${L.items.y}in`,
                  width: `${L.items.width}in`,
                  height: `${L.items.bottom - L.items.y}in`,
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: "9.5pt" }}>
                  <colgroup>
                    <col style={{ width: "37%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "15%" }} />
                  </colgroup>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #000", fontSize: "8.5pt" }}>
                      <th style={{ ...cell, textAlign: "left", fontWeight: "bold" }}>Product</th>
                      <th style={{ ...cell, textAlign: "left", fontWeight: "bold" }}>Pack</th>
                      <th style={{ ...right, fontWeight: "bold" }}>Qty</th>
                      <th style={{ ...right, fontWeight: "bold" }}>Free</th>
                      <th style={{ ...right, fontWeight: "bold" }}>Unit Rs.</th>
                      <th style={{ ...center, fontWeight: "bold" }}>Disc.</th>
                      <th style={{ ...right, fontWeight: "bold" }}>Amount Rs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageLines.map((line) => (
                      <tr key={line.lineId}>
                        <td style={wrapCell}>
                          <div style={clamp2}>{line.productName}</div>
                        </td>
                        <td style={wrapCell}>
                          <div style={clamp2}>{line.packSize}</div>
                        </td>
                        <td style={topRight}>{line.quantity}</td>
                        <td style={topRight}>{line.freeQuantity > 0 ? line.freeQuantity : "-"}</td>
                        <td style={topRight}>{formatAmount(line.unitPrice)}</td>
                        <td style={topCenter}>{line.discount > 0 ? `${line.discount.toFixed(2)}%` : "-"}</td>
                        <td style={topRight}>{formatAmount(line.netLineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: "0.06in", borderTop: "1px solid #000", paddingTop: "0.02in" }}>
                  {isLast ? (
                    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: "9.5pt" }}>
                      <colgroup>
                        <col style={{ width: "85%" }} />
                        <col style={{ width: "15%" }} />
                      </colgroup>
                      <tbody>
                        {vatPercentage > 0 && (
                          <>
                            <tr>
                              <td style={right}>Subtotal Rs.</td>
                              <td style={right}>{formatAmount(subtotal)}</td>
                            </tr>
                            <tr>
                              <td style={right}>VAT ({vatPercentage}%) Rs.</td>
                              <td style={right}>{formatAmount(totalAmount - subtotal)}</td>
                            </tr>
                          </>
                        )}
                        <tr style={{ fontWeight: "bold" }}>
                          <td style={{ ...right, fontWeight: "bold" }}>{vatPercentage > 0 ? "Grand Total Rs." : "Total Amount Rs."}</td>
                          <td style={{ ...right, fontWeight: "bold" }}>{formatAmount(totalAmount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ ...right, fontStyle: "italic" }}>Continued on next page…</div>
                  )}
                </div>
              </div>

              {pages.length > 1 && (
                <Field box={{ x: L.items.x, y: L.items.bottom - L.lineHeight, width: 1.5 }} style={{ fontSize: "8pt" }}>
                  Page {pageIndex + 1} of {pages.length}
                </Field>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default InvoiceFormSheet;
