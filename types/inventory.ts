// ============================================================
//  Agrinova IMS — Inventory Module Types
//  Derived from prisma/schema.prisma
// ============================================================

// ── Enums ────────────────────────────────────────────────────
export type MovementType = "ISSUE" | "RETURN" | "PURCHASE" | "ADJUSTMENT";
export type InvoiceStatus = "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
export type PaymentMethod = "CASH" | "CHEQUE" | "BANK_TRANSFER";
export type ReminderStatus = "PENDING" | "COMPLETED";

// ── DB Models ────────────────────────────────────────────────
export interface Category {
  category_id: number;
  name: string;
  tag: string;
}

export interface Product {
  product_id: number;
  category_id: number;
  product_code: string;
  product_name: string;
  pack_size: string;
  selling_price: number;
  category?: Category;
}

export interface InventoryLocation {
  location_id: number;
  code: string; // IGRN1 | IGRN2 | IGRN3 | IGRN4
  name: string;
}

export interface Stock {
  stock_id: number;
  product_id: number;
  location_id: number;
  quantity_on_hand: number;
  product?: Product;
  location?: InventoryLocation;
}

export interface StockMovement {
  movement_id: number;
  stock_id: number;
  product_id: number;
  created_by: number;
  movement_type: MovementType;
  quantity: number;
  movement_date: string; // ISO date string
  notes?: string | null;
  // joined fields
  product?: Product;
  stock?: Stock;
  creator?: { full_name: string };
}

// ── API Request / Response DTOs ──────────────────────────────

/** POST /api/products */
export interface CreateProductDto {
  category_id: number;
  product_name: string;
  pack_size: string;
  selling_price: number;
  // product_code is auto-generated server-side
}

/** PATCH /api/products/[productId] */
export interface UpdateProductDto {
  product_name?: string;
  pack_size?: string;
  selling_price?: number;
  category_id?: number;
}

/** POST /api/stock-movements */
export interface CreateMovementDto {
  stock_id: number;
  product_id: number;
  movement_type: MovementType;
  quantity: number;
  notes?: string;
  /** ISO date string — defaults to today if omitted */
  movement_date?: string;
}

/** POST /api/stock  — New Stock Entry (Purchase / Import) */
export interface StockEntryDto {
  entry_type: "LOCAL_PURCHASE" | "FOREIGN_IMPORT";
  location_id: number;
  date: string; // ISO
  reference_no?: string;
  notes?: string;
  items: {
    product_id: number;
    quantity: number;
    unit_price: number;
  }[];
}

// ── View Models (enriched for UI) ────────────────────────────

export interface StockOverviewRow {
  stock_id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  pack_size: string;
  selling_price: number;
  category_name: string;
  location_id: number;
  location_code: string;
  location_name: string;
  quantity_on_hand: number;
  reorder_threshold: number; // derived from category default or product setting
  status: StockStatus;
}

export type StockStatus = "ok" | "low" | "out";

export interface LocationSummary {
  location_id: number;
  code: string;
  name: string;
  total_products: number;
  total_units: number;
  low_count: number;
  out_count: number;
}

export interface MovementRow extends StockMovement {
  product_name: string;
  location_code: string;
  created_by_name: string;
  qty_delta: number; // negative for ISSUE, positive for RETURN/PURCHASE
}

// ── Filter State ─────────────────────────────────────────────
export interface StockFilter {
  location_id: number | null;
  search: string;
  status: StockStatus | "all";
}

export interface MovementFilter {
  movement_type: MovementType | "ALL";
  location_id: number | null;
  date_from?: string;
  date_to?: string;
}

// ── API Response wrapper ─────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  error?: string;
}
