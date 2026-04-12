export type StockStatus = "ok" | "low" | "out"; 
export type MovementType = "ISSUE" | "RETURN" | "PURCHASE" | "ADJUSTMENT"; 

export interface StockOverviewRow { 
  stock_id: number; 
  product_id: number; 
  product_code: string; 
  product_name: string; 
  category_name: string; 
  pack_size: string; 
  quantity_on_hand: number; 
  reorder_threshold: number;   // derive: use 20% of max stock or a fixed business rule 
  status: StockStatus;         // "ok" | "low" | "out" — computed, not stored 
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

export interface MovementRow { 
  movement_id: number; 
  movement_date: string;       // ISO string 
  movement_type: MovementType; 
  product_name: string; 
  product_code: string; 
  location_code: string; 
  qty_delta: number;           // negative for ISSUE/ADJUSTMENT, positive for PURCHASE/RETURN 
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
} 

export interface CreateMovementDto { 
  stock_id: number; 
  movement_type: MovementType; 
  quantity: number;            // always positive — sign is derived from type 
  notes?: string; 
} 

export interface CreateStockEntryDto { 
  product_id: number; 
  location_id: number; 
  quantity: number; 
} 
