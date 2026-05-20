export type LinePromotionType = "NONE" | "DISCOUNT" | "FREE_QTY";

export type InvoiceLine = {
  id: number;
  productId: number | null;
  qty: number;
  unitPrice: number;
  unitPriceEdited: boolean;
  /** line_total = qty × unitPrice (before any promotion) */
  lineTotal: number;
  promotionType: LinePromotionType;
  /** Percentage discount (0–100). Active only when promotionType === "DISCOUNT" */
  discount: number;
  /** Free units given. Active only when promotionType === "FREE_QTY". Bounded: qty + freeQty <= stock */
  freeQty: number;
  /** net_line_total = lineTotal after promotion (what the customer actually pays) */
  netLineTotal: number;
};

export type AvailableProduct = {
  id: number;
  name: string;
  packSize: string;
  sellingPrice: number;
  quantityOnHand: number;
};

export type FieldErrors = {
  invoiceNo?: string;
  invoiceDate?: string;
  salesRep?: string;
  customer?: string;
  location?: string;
  lines?: string;
};
