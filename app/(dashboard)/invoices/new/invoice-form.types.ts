export type InvoiceLine = {
  id: number;
  productId: number | null;
  qty: number;
  unitPrice: number;
  unitPriceEdited: boolean;
  discount: number;
  lineTotal: number;
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
