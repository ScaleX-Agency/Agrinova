export type StockStatus = "ok" | "low" | "out";
export type MovementType = "ISSUE" | "RETURN" | "PURCHASE" | "ADJUSTMENT";

export interface StockOverviewRow {
  stock_id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  category_name: string;
  pack_size: string;
  selling_price: number;
  quantity_on_hand: number;
  reorder_threshold: number; // derive: use 20% of max stock or a fixed business rule
  status: StockStatus; // "ok" | "low" | "out" — computed, not stored
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
  movement_date: string; // ISO string
  movement_type: MovementType;
  product_name: string;
  product_code: string;
  location_code: string;
  qty_delta: number; // negative for ISSUE/ADJUSTMENT, positive for PURCHASE/RETURN
  notes: string | null;
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
  quantity: number; // always positive — sign is derived from type
  resulting_quantity?: number; // for ADJUSTMENT, sets stock to this value
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
