// src/lib/inventoryService.ts
import { prisma } from "./prisma";
import { unstable_cache, revalidateTag } from "next/cache";
import type {
  StockOverviewRow,
  LocationSummary,
  MovementRow,
  CreateMovementDto,
  CreateStockEntryDto,
  CreateProductDto,
} from "@/types/inventory";

const LOW_THRESHOLD = 20;

function computeStatus(qty: number, threshold = LOW_THRESHOLD): "ok" | "low" | "out" {
  if (qty <= 0) return "out";
  if (qty < threshold) return "low";
  return "ok";
}

function computeQtyDelta(type: string, qty: number): number {
  return type === "ISSUE" || type === "ADJUSTMENT" ? -qty : qty;
}

// ── Stock ─────────────────────────────────────────────────────
// unstable_cache: serves repeated page loads from memory, not Supabase.
// revalidateTag("inventory") in mutation routes busts this immediately.

export const getAllStock = unstable_cache(
  async (): Promise<StockOverviewRow[]> => {
    const stocks = await prisma.stock.findMany({
      include: {
        product: { include: { category: true } },
        location: true,
      },
      orderBy: [
        { location: { location_id: "asc" } },
        { product: { product_name: "asc" } },
      ],
    });

    return stocks.map((s) => ({
      stock_id:          s.stock_id,
      product_id:        s.product_id,
      product_code:      s.product.product_code,
      product_name:      s.product.product_name,
      category_name:     s.product.category.name,
      pack_size:         s.product.pack_size,
      quantity_on_hand:  s.quantity_on_hand,
      reorder_threshold: LOW_THRESHOLD,
      status:            computeStatus(s.quantity_on_hand),
      location_id:       s.location_id,
      location_code:     s.location.code,
      location_name:     s.location.name,
    }));
  },
  ["all-stock"],
  { revalidate: 30, tags: ["inventory", "stock"] },
);

export const getStockByLocation = unstable_cache(
  async (locationId: number): Promise<StockOverviewRow[]> => {
    const stocks = await prisma.stock.findMany({
      where: { location_id: locationId },
      include: {
        product: { include: { category: true } },
        location: true,
      },
      orderBy: { product: { product_name: "asc" } },
    });

    return stocks.map((s) => ({
      stock_id:          s.stock_id,
      product_id:        s.product_id,
      product_code:      s.product.product_code,
      product_name:      s.product.product_name,
      category_name:     s.product.category.name,
      pack_size:         s.product.pack_size,
      quantity_on_hand:  s.quantity_on_hand,
      reorder_threshold: LOW_THRESHOLD,
      status:            computeStatus(s.quantity_on_hand),
      location_id:       s.location_id,
      location_code:     s.location.code,
      location_name:     s.location.name,
    }));
  },
  ["stock-by-location"],
  { revalidate: 30, tags: ["inventory", "stock"] },
);

export const getLocationSummaries = unstable_cache(
  async (): Promise<LocationSummary[]> => {
    const rows = await prisma.$queryRaw<
      Array<{
        location_id: number;
        code:        string;
        name:        string;
        total_products: bigint;
        total_units:    bigint;
        low_count:      bigint;
        out_count:      bigint;
      }>
    >`
      SELECT
        l.location_id,
        l.code,
        l.name,
        COUNT(s.stock_id)                                                     AS total_products,
        COALESCE(SUM(s.quantity_on_hand), 0)                                  AS total_units,
        COUNT(CASE WHEN s.quantity_on_hand > 0
                    AND s.quantity_on_hand < ${LOW_THRESHOLD} THEN 1 END)     AS low_count,
        COUNT(CASE WHEN s.quantity_on_hand <= 0              THEN 1 END)      AS out_count
      FROM "INVENTORY_LOCATION" l
      LEFT JOIN "STOCK" s ON s.location_id = l.location_id
      GROUP BY l.location_id, l.code, l.name
      ORDER BY l.location_id
    `;

    return rows.map((r) => ({
      location_id:    r.location_id,
      code:           r.code,
      name:           r.name,
      total_products: Number(r.total_products),
      total_units:    Number(r.total_units),
      low_count:      Number(r.low_count),
      out_count:      Number(r.out_count),
    }));
  },
  ["location-summaries-sql"],
  { revalidate: 30, tags: ["inventory", "summaries"] },
);

// ── Movements ─────────────────────────────────────────────────

export const getAllMovements = unstable_cache(
  async (): Promise<MovementRow[]> => {
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
      movement_id:     m.movement_id,
      movement_date:   m.movement_date.toISOString(),
      movement_type:   m.movement_type as MovementRow["movement_type"],
      product_name:    m.product.product_name,
      product_code:    m.product.product_code,
      location_code:   m.stock.location.code,
      qty_delta:       computeQtyDelta(m.movement_type, m.quantity),
      notes:           m.notes,
      created_by_name: m.creator.full_name,
    }));
  },
  ["all-movements"],
  { revalidate: 30, tags: ["inventory", "movements"] },
);

export const getMovementsByLocation = unstable_cache(
  async (locationId: number): Promise<MovementRow[]> => {
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
      movement_id:     m.movement_id,
      movement_date:   m.movement_date.toISOString(),
      movement_type:   m.movement_type as MovementRow["movement_type"],
      product_name:    m.product.product_name,
      product_code:    m.product.product_code,
      location_code:   m.stock.location.code,
      qty_delta:       computeQtyDelta(m.movement_type, m.quantity),
      notes:           m.notes,
      created_by_name: m.creator.full_name,
    }));
  },
  ["movements-by-location"],
  { revalidate: 30, tags: ["inventory", "movements"] },
);

// ── Mutations (NOT cached — always hit DB) ────────────────────

export async function createMovement(
  dto: CreateMovementDto,
  userId: number,
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

  // Bust server-side cache so next RSC render gets fresh data
  revalidateTag("inventory");

  return {
    updatedStock: {
      stock_id:         updatedStock.stock_id,
      quantity_on_hand: updatedStock.quantity_on_hand,
    },
    movement_id: movement.movement_id,
  };
}

export async function getAllProducts() {
  return prisma.product.findMany({
    include: { category: true },
    orderBy: { product_name: "asc" },
  });
}

export async function createProduct(dto: CreateProductDto) {
  const category = await prisma.category.findUniqueOrThrow({ where: { category_id: dto.category_id } });
  const count    = await prisma.product.count({ where: { category_id: dto.category_id } });
  const product_code = `${category.tag}-${String(count + 1).padStart(4, "0")}`;

  const product = await prisma.product.create({
    data: {
      product_name:  dto.product_name,
      pack_size:     dto.pack_size,
      category_id:   dto.category_id,
      selling_price: dto.selling_price,
      product_code,
    },
    include: { category: true },
  });

  revalidateTag("inventory");
  return product;
}

export async function deleteProduct(productId: number) {
  const hasStock = await prisma.stock.findFirst({ where: { product_id: productId } });
  if (hasStock) throw new Error("Cannot delete product with existing stock entries");

  const product = await prisma.product.delete({ where: { product_id: productId } });
  revalidateTag("inventory");
  return product;
}

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

  revalidateTag("inventory");
  return stock;
}

export async function getAllCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

export async function updateProduct(productId: number, dto: Partial<CreateProductDto>) {
  const product = await prisma.product.update({
    where: { product_id: productId },
    data: {
      product_name: dto.product_name,
      pack_size: dto.pack_size,
      category_id: dto.category_id,
      selling_price: dto.selling_price,
    },
    include: { category: true },
  });

  revalidateTag("inventory");
  return product;
}

export async function importStock(data: any[], userId: number) {
  const imported = [];
  for (const row of data) {
    const product = await prisma.product.findFirst({ where: { product_code: row.product_code } });
    const location = await prisma.inventoryLocation.findFirst({ where: { code: row.location_code } });

    if (!product || !location) {
      throw new Error(`Product ${row.product_code} or location ${row.location_code} not found`);
    }

    const qty = parseInt(row.quantity);
    if (isNaN(qty) || qty <= 0) throw new Error("Invalid quantity");

    const existing = await prisma.stock.findFirst({
      where: { product_id: product.product_id, location_id: location.location_id },
    });

    let stock;
    if (existing) {
      stock = await prisma.stock.update({
        where: { stock_id: existing.stock_id },
        data: { quantity_on_hand: { increment: qty } },
      });
    } else {
      stock = await prisma.stock.create({
        data: { product_id: product.product_id, location_id: location.location_id, quantity_on_hand: qty },
      });
    }

    await prisma.stockMovement.create({
      data: {
        stock_id: stock.stock_id,
        product_id: product.product_id,
        created_by: userId,
        movement_type: row.entry_type || "PURCHASE",
        quantity: qty,
        movement_date: row.date ? new Date(row.date) : new Date(),
        notes: row.notes || "Imported stock",
      },
    });

    imported.push(stock);
  }

  revalidateTag("inventory");
  return imported;
}

export async function deleteMovement(movementId: number) {
  const movement = await prisma.stockMovement.findUnique({ where: { movement_id: movementId } });
  if (!movement) throw new Error("Movement not found");

  const stock = await prisma.stock.findUnique({ where: { stock_id: movement.stock_id } });
  if (!stock) throw new Error("Stock not found");

  // Revert the quantity change
  let qtyDelta = movement.quantity;
  if (movement.movement_type === "ISSUE" || movement.movement_type === "ADJUSTMENT") {
    qtyDelta = -qtyDelta;
  }

  // We are deleting the movement, so we do the opposite of what it did
  await prisma.stock.update({
    where: { stock_id: stock.stock_id },
    data: { quantity_on_hand: stock.quantity_on_hand - qtyDelta },
  });

  await prisma.stockMovement.delete({ where: { movement_id: movementId } });

  revalidateTag("inventory");
  return movement;
}
