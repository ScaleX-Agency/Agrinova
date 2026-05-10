export type StockStatus = "ok" | "low" | "out";

export type MovementType =
  | "ISSUE"
  | "RETURN"
  | "RETURN_UNUSABLE"
  | "PURCHASE"
  | "ADJUSTMENT"
  | "ISSUE_REVERSAL"
  | "RETURN_REVERSAL"
  | "PURCHASE_REVERSAL"
  | "RETURN_UNUSABLE_REVERSAL";

export interface StockOverviewRow {
  stock_id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  category_name: string;
  pack_size: string;
  selling_price: number;
  quantity_on_hand: number;
  reorder_threshold: number;
  status: StockStatus;
  location_id: number;
  location_code: string;
  location_name: string;
}

export interface LocationSummary {
  location_id: number;
  code: string;
  name: string;
  total_products: number;
  total_units: number;
  low_count: number;
  out_count: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface MovementRow {
  movement_id: number;
  movement_date: string;
  movement_type: MovementType;
  product_name: string;
  product_code: string;
  location_code: string;
  movement_qty: number;
  qty_delta: number;
  notes?: string | null;
  created_by_name: string;
}

export interface StockFilter {
  location_id: number | null;
  search: string;
  status: "all" | StockStatus;
}

export interface CreateProductDto {
  product_name: string;
  pack_size: string;
  category_id: number;
  selling_price: number;
  initial_qty?: number;
  location_id?: number;
  reorder_threshold?: number;
}

export interface CreateMovementDto {
  stock_id: number;
  movement_type: MovementType;
  quantity: number;
  resulting_quantity?: number;
  notes?: string;
}

export type StockEntryType = "LOCAL_PURCHASE" | "FOREIGN_IMPORT";

export interface CreateStockEntryItemDto {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface CreateStockEntryDto {
  entry_type: StockEntryType;
  date: string;
  location_id: number;
  reference_no?: string | null;
  notes?: string | null;
  grn_number?: string | null;
  items: CreateStockEntryItemDto[];
}
