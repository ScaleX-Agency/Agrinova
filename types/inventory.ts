export type StockStatus = "ok" | "low" | "out";

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
  is_aggregate?: boolean;
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

export interface StockTransferRecord {
  transfer_id: number;
  transfer_no: string;
  transfer_date: string;
  from_location_id: number;
  from_location_code: string;
  from_location_name: string;
  to_location_id: number;
  to_location_code: string;
  to_location_name: string;
  line_count: number;
  total_qty: number;
  notes: string | null;
  created_by_name: string;
}

export interface CreateStockTransferItemDto {
  product_id: number;
  quantity: number;
}

export interface CreateStockTransferDto {
  transfer_date: string;
  from_location_id: number;
  to_location_id: number;
  notes?: string | null;
  items: CreateStockTransferItemDto[];
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
