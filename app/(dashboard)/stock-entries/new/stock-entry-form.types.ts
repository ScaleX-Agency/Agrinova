export type StockEntryLine = {
  id: number;
  productId: number | null;
  qty: number;
};

export type ProductOption = {
  id: number;
  label: string;
  searchText: string;
};

export type StockEntryFieldErrors = {
  date?: string;
  grnNumber?: string;
  location?: string;
  lines?: string;
};

