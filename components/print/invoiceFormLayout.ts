/**
 * Field positions for the pre-printed continuous invoice form
 * (Agrinova (Pvt) Limited, 9.5in x 5.5in fan-fold incl. tractor strips).
 *
 * All values are in inches, measured from the top-left corner of the
 * full sheet (including the sprocket-hole strips). Only the data is
 * printed; the logo, labels, terms, bank details and signature lines are
 * already on the paper.
 *
 * Measured from the client's form artwork. Fine-tune per printer with the
 * X/Y offset and scale in the print settings rather than editing these numbers.
 *
 * Everything printed stays between x = 0.7in and x = 8.5in: narrow-carriage
 * dot-matrix printers (e.g. Epson LQ-310) only print an 8in-wide band, and the
 * first real test print was cut off past ~8.6in.
 */
export const INVOICE_FORM = {
  page: { width: 9.5, height: 5.5 },

  /** Line height for one row of text (dot-matrix 6 LPI ≈ 0.167in). */
  lineHeight: 0.18,
  fontSizePt: 10,

  customer: {
    /** Value column starts just after the ":" of the left-hand labels. */
    /** Name + address flow together from here down to the contact row. */
    name: { x: 1.42, y: 0.355, width: 1.8 },
    contact: { x: 1.42, y: 0.94, width: 1.8 },
  },

  details: {
    /** Value column starts just after the ":" of the right-hand labels. */
    invoiceNo: { x: 7.57, y: 0.355, width: 0.93 },
    date: { x: 7.57, y: 0.55, width: 0.93 },
    poNo: { x: 7.57, y: 0.75, width: 0.93 },
    vatNo: { x: 7.57, y: 0.94, width: 0.93 },
    receiptNo: { x: 7.57, y: 1.14, width: 0.93 },
  },

  /** Blank body between the header rule and the terms text. */
  items: { x: 0.72, y: 1.5, width: 7.78, bottom: 4.12 },

  /**
   * Max printed item lines per sheet (a wrapped product name counts as 2);
   * longer invoices continue on the next form.
   */
  maxRowsPerPage: 9,
} as const;

export type InvoicePrintMode = "form" | "plain";

export type InvoicePrintSettings = {
  mode: InvoicePrintMode;
  /** Shift everything right (+) / left (-), in millimetres. */
  offsetXmm: number;
  /** Shift everything down (+) / up (-), in millimetres. */
  offsetYmm: number;
  /**
   * Scale everything (percent, from the top-left corner). Only needed when the
   * printer driver insists on shrinking the page; normally 100.
   */
  scalePct: number;
};

export const DEFAULT_INVOICE_PRINT_SETTINGS: InvoicePrintSettings = {
  mode: "form",
  offsetXmm: 0,
  offsetYmm: 0,
  scalePct: 100,
};

const STORAGE_KEY = "agrinova.invoicePrintSettings";

/*
 * Settings are per-browser so each printer PC keeps its own calibration.
 * Exposed as a tiny external store for `useSyncExternalStore`.
 */
let cachedRaw: string | null | undefined;
let cachedSettings: InvoicePrintSettings = DEFAULT_INVOICE_PRINT_SETTINGS;
const listeners = new Set<() => void>();

const parseSettings = (raw: string | null): InvoicePrintSettings => {
  if (!raw) return DEFAULT_INVOICE_PRINT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<InvoicePrintSettings>;
    return {
      mode: parsed.mode === "plain" ? "plain" : "form",
      offsetXmm: Number.isFinite(parsed.offsetXmm) ? Number(parsed.offsetXmm) : 0,
      offsetYmm: Number.isFinite(parsed.offsetYmm) ? Number(parsed.offsetYmm) : 0,
      scalePct:
        Number.isFinite(parsed.scalePct) && Number(parsed.scalePct) >= 50 && Number(parsed.scalePct) <= 150
          ? Number(parsed.scalePct)
          : 100,
    };
  } catch {
    return DEFAULT_INVOICE_PRINT_SETTINGS;
  }
};

const readRaw = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cachedRaw ?? null;
  }
};

export const getInvoicePrintSettings = (): InvoicePrintSettings => {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSettings = parseSettings(raw);
  }
  return cachedSettings;
};

export const getServerInvoicePrintSettings = () => DEFAULT_INVOICE_PRINT_SETTINGS;

export const subscribeInvoicePrintSettings = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const saveInvoicePrintSettings = (settings: InvoicePrintSettings) => {
  const raw = JSON.stringify(settings);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // Storage unavailable (private mode etc.) — keep it for this page only.
  }
  cachedRaw = raw;
  cachedSettings = settings;
  listeners.forEach((listener) => listener());
};

/** Named page so it beats the generic 8.5in x 5.5in `@page` in globals.css. */
export const INVOICE_FORM_PAGE_NAME = "invoice-form";

export const invoiceFormPageStyle = `
  @page ${INVOICE_FORM_PAGE_NAME} {
    size: ${INVOICE_FORM.page.width}in ${INVOICE_FORM.page.height}in;
    margin: 0;
  }

  @media print {
    html,
    body {
      width: ${INVOICE_FORM.page.width}in;
      min-width: ${INVOICE_FORM.page.width}in;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
    }
  }
`;
