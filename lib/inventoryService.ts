import { prisma } from "./prisma"; 
import type { 
  StockOverviewRow, LocationSummary, MovementRow, 
  CreateMovementDto, CreateStockEntryDto, CreateProductDto, 
} from "@/types/inventory"; 

// ── Reorder threshold rule: LOW if qty < 20% of (threshold * 3), OUT if 0 ── 
const LOW_THRESHOLD = 20; // default if no threshold stored 

function computeStatus(qty: number, threshold = LOW_THRESHOLD) { 
  if (qty <= 0) return "out"; 
  if (qty < threshold) return "low"; 
  return "ok"; 
} 

function computeQtyDelta(type: string, qty: number): number { 
  return type === "ISSUE" || type === "ADJUSTMENT" ? -qty : qty; 
} 

// ── Stock ───────────────────────────────────────────────────── 

export async function getAllStock(): Promise<StockOverviewRow[]> { 
  const stocks = await prisma.stock.findMany({ 
    include: { 
      product: { include: { category: true } }, 
      location: true, 
    }, 
    orderBy: [{ location: { location_id: "asc" } }, { product: { product_name: "asc" } }], 
  }); 

  return stocks.map((s) => ({ 
    stock_id:         s.stock_id, 
    product_id:       s.product_id, 
    product_code:     s.product.product_code, 
    product_name:     s.product.product_name, 
    category_name:    s.product.category.name, 
    pack_size:        s.product.pack_size, 
    quantity_on_hand: s.quantity_on_hand, 
    reorder_threshold: LOW_THRESHOLD, 
    status:           computeStatus(s.quantity_on_hand), 
    location_id:      s.location_id, 
    location_code:    s.location.code, 
    location_name:    s.location.name, 
  })); 
} 

export async function getStockByLocation(locationId: number): Promise<StockOverviewRow[]> { 
  const stocks = await prisma.stock.findMany({ 
    where: { location_id: locationId }, 
    include: { 
      product: { include: { category: true } }, 
      location: true, 
    }, 
    orderBy: { product: { product_name: "asc" } }, 
  }); 

  return stocks.map((s) => ({ 
    stock_id:         s.stock_id, 
    product_id:       s.product_id, 
    product_code:     s.product.product_code, 
    product_name:     s.product.product_name, 
    category_name:    s.product.category.name, 
    pack_size:        s.product.pack_size, 
    quantity_on_hand: s.quantity_on_hand, 
    reorder_threshold: LOW_THRESHOLD, 
    status:           computeStatus(s.quantity_on_hand), 
    location_id:      s.location_id, 
    location_code:    s.location.code, 
    location_name:    s.location.name, 
  })); 
} 

export async function getLocationSummaries(): Promise<LocationSummary[]> { 
  const locations = await prisma.inventoryLocation.findMany({ 
    include: { stocks: true }, 
    orderBy: { location_id: "asc" }, 
  }); 

  return locations.map((loc) => ({ 
    location_id:    loc.location_id, 
    code:           loc.code, 
    name:           loc.name, 
    total_products: loc.stocks.length, 
    total_units:    loc.stocks.reduce((s, st) => s + st.quantity_on_hand, 0), 
    low_count:      loc.stocks.filter((s) => computeStatus(s.quantity_on_hand) === "low").length, 
    out_count:      loc.stocks.filter((s) => s.quantity_on_hand <= 0).length, 
  })); 
} 

// ── Movements ───────────────────────────────────────────────── 

export async function getAllMovements(): Promise<MovementRow[]> { 
  const movs = await prisma.stockMovement.findMany({ 
    include: { 
      stock:   { include: { location: true } }, 
      product: true, 
      creator: true, 
    }, 
    orderBy: { movement_date: "desc" }, 
    take: 200, 
  }); 

  return movs.map((m) => ({ 
    movement_id:    m.movement_id, 
    movement_date:  m.movement_date.toISOString(), 
    movement_type:  m.movement_type as MovementRow["movement_type"], 
    product_name:   m.product.product_name, 
    product_code:   m.product.product_code, 
    location_code:  m.stock.location.code, 
    qty_delta:      computeQtyDelta(m.movement_type, m.quantity), 
    notes:          m.notes, 
    created_by_name: m.creator.full_name, 
  })); 
} 

export async function getMovementsByLocation(locationId: number): Promise<MovementRow[]> { 
  const movs = await prisma.stockMovement.findMany({ 
    where: { stock: { location_id: locationId } }, 
    include: { 
      stock:   { include: { location: true } }, 
      product: true, 
      creator: true, 
    }, 
    orderBy: { movement_date: "desc" }, 
  }); 

  return movs.map((m) => ({ 
    movement_id:    m.movement_id, 
    movement_date:  m.movement_date.toISOString(), 
    movement_type:  m.movement_type as MovementRow["movement_type"], 
    product_name:   m.product.product_name, 
    product_code:   m.product.product_code, 
    location_code:  m.stock.location.code, 
    qty_delta:      computeQtyDelta(m.movement_type, m.quantity), 
    notes:          m.notes, 
    created_by_name: m.creator.full_name, 
  })); 
} 

export async function createMovement( 
  dto: CreateMovementDto, 
  userId: number 
): Promise<{ updatedStock: { stock_id: number; quantity_on_hand: number }; movement_id: number }> { 
  const stock = await prisma.stock.findUniqueOrThrow({ where: { stock_id: dto.stock_id } }); 

  const delta = computeQtyDelta(dto.movement_type, dto.quantity); 
  const newQty = stock.quantity_on_hand + delta; 

  if (newQty < 0) throw new Error("Insufficient stock for this movement"); 

  const [updatedStock, movement] = await prisma.$transaction([ 
    prisma.stock.update({ 
      where: { stock_id: dto.stock_id }, 
      data:  { quantity_on_hand: newQty }, 
    }), 
    prisma.stockMovement.create({ 
      data: { 
        stock_id:      dto.stock_id, 
        product_id:    stock.product_id, 
        created_by:    userId, 
        movement_type: dto.movement_type, 
        quantity:      dto.quantity, 
        movement_date: new Date(), 
        notes:         dto.notes ?? null, 
      }, 
    }), 
  ]); 

  return { updatedStock: { stock_id: updatedStock.stock_id, quantity_on_hand: updatedStock.quantity_on_hand }, movement_id: movement.movement_id }; 
} 

// ── Products ────────────────────────────────────────────────── 

export async function getAllProducts() { 
  return prisma.product.findMany({ 
    include: { category: true }, 
    orderBy: { product_name: "asc" }, 
  }); 
} 

export async function createProduct(dto: CreateProductDto) { 
  // Auto-generate product_code: TAG-XXXX 
  const category = await prisma.category.findUniqueOrThrow({ where: { category_id: dto.category_id } }); 
  const count = await prisma.product.count({ where: { category_id: dto.category_id } }); 
  const product_code = `${category.tag}-${String(count + 1).padStart(4, "0")}`; 

  return prisma.product.create({ 
    data: { 
      product_name:  dto.product_name, 
      pack_size:     dto.pack_size, 
      category_id:   dto.category_id, 
      selling_price: dto.selling_price, 
      product_code, 
    }, 
    include: { category: true }, 
  }); 
} 

export async function deleteProduct(productId: number) { 
  const hasStock = await prisma.stock.findFirst({ where: { product_id: productId } }); 
  if (hasStock) throw new Error("Cannot delete product with existing stock entries"); 
  return prisma.product.delete({ where: { product_id: productId } }); 
} 

// ── Stock Entries ───────────────────────────────────────────── 

export async function createStockEntry(dto: CreateStockEntryDto, userId: number) { 
  const existing = await prisma.stock.findFirst({ 
    where: { product_id: dto.product_id, location_id: dto.location_id }, 
  }); 

  let stock; 
  if (existing) { 
    stock = await prisma.stock.update({ 
      where: { stock_id: existing.stock_id }, 
      data:  { quantity_on_hand: { increment: dto.quantity } }, 
    }); 
  } else { 
    stock = await prisma.stock.create({ 
      data: { product_id: dto.product_id, location_id: dto.location_id, quantity_on_hand: dto.quantity }, 
    }); 
  } 

  await prisma.stockMovement.create({ 
    data: { 
      stock_id:      stock.stock_id, 
      product_id:    dto.product_id, 
      created_by:    userId, 
      movement_type: "PURCHASE", 
      quantity:      dto.quantity, 
      movement_date: new Date(), 
      notes:         "Initial stock entry", 
    }, 
  }); 

  return stock; 
} 
