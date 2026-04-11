// src/lib/inventoryService.ts
// All database operations for the Inventory module.
// Every function maps 1-to-1 with an API route.

import { prisma } from "./prisma";
import {
  StockOverviewRow,
  LocationSummary,
  MovementRow,
  StockStatus,
  CreateProductDto,
  UpdateProductDto,
  CreateMovementDto,
  StockEntryDto,
} from "../types/inventory";

// ── Helpers ──────────────────────────────────────────────────

/** Reorder threshold per category tag (adjust as needed) */
const REORDER_THRESHOLDS: Record<string, number> = {
  fertilizer: 20,
  fungicide: 15,
  herbicide: 8,
  insecticide: 12,
  nematicide: 5,
  supplement: 10,
  soil: 25,
  other: 10,
};

function getThreshold(categoryTag: string): number {
  return REORDER_THRESHOLDS[categoryTag.toLowerCase()] ?? 10;
}

function stockStatus(qty: number, threshold: number): StockStatus {
  if (qty === 0) return "out";
  if (qty < threshold) return "low";
  return "ok";
}

function qtyDelta(type: string, qty: number): number {
  return type === "ISSUE" || (type === "ADJUSTMENT" && qty < 0) ? -Math.abs(qty) : Math.abs(qty);
}

// ── STOCK OVERVIEW ───────────────────────────────────────────

/**
 * GET /api/inventory
 * Returns all stock rows enriched with product, category, location info.
 */
export async function getAllStock(): Promise<StockOverviewRow[]> {
  const rows = await prisma.stock.findMany({
    include: {
      product: { include: { category: true } },
      location: true,
    },
    orderBy: [{ location: { code: "asc" } }, { product: { product_name: "asc" } }],
  });

  return rows.map((s) => {
    const threshold = getThreshold(s.product.category.tag);
    return {
      stock_id: s.stock_id,
      product_id: s.product_id,
      product_code: s.product.product_code,
      product_name: s.product.product_name,
      pack_size: s.product.pack_size,
      selling_price: Number(s.product.selling_price),
      category_name: s.product.category.name,
      location_id: s.location_id,
      location_code: s.location.code,
      location_name: s.location.name,
      quantity_on_hand: s.quantity_on_hand,
      reorder_threshold: threshold,
      status: stockStatus(s.quantity_on_hand, threshold),
    };
  });
}

/**
 * GET /api/inventory/[locationId]
 * Returns stock for a single location.
 */
export async function getStockByLocation(locationId: number): Promise<StockOverviewRow[]> {
  const all = await getAllStock();
  return all.filter((r) => r.location_id === locationId);
}

/**
 * Location summary cards (total, low, out counts per location).
 */
export async function getLocationSummaries(): Promise<LocationSummary[]> {
  const locations = await prisma.inventoryLocation.findMany({
    include: { stocks: { include: { product: { include: { category: true } } } } },
    orderBy: { code: "asc" },
  });

  return locations.map((loc) => {
    const rows = loc.stocks.map((s) => {
      const threshold = getThreshold(s.product.category.tag);
      return stockStatus(s.quantity_on_hand, threshold);
    });
    return {
      location_id: loc.location_id,
      code: loc.code,
      name: loc.name,
      total_products: loc.stocks.length,
      total_units: loc.stocks.reduce((a, s) => a + s.quantity_on_hand, 0),
      low_count: rows.filter((s) => s === "low").length,
      out_count: rows.filter((s) => s === "out").length,
    };
  });
}

// ── PRODUCTS ─────────────────────────────────────────────────

/**
 * GET /api/products
 * Full product list with category.
 */
export async function getAllProducts() {
  return prisma.product.findMany({
    include: { category: true },
    orderBy: { product_name: "asc" },
  });
}

/**
 * GET /api/products/[productId]
 */
export async function getProduct(productId: number) {
  return prisma.product.findUnique({
    where: { product_id: productId },
    include: { category: true, stocks: { include: { location: true } } },
  });
}

/**
 * POST /api/products
 * Auto-generates product_code from category tag + sequential number.
 */
export async function createProduct(dto: CreateProductDto) {
  const category = await prisma.category.findUnique({
    where: { category_id: dto.category_id },
  });
  if (!category) throw new Error("Category not found");

  // Generate product_code: e.g. FERT-0012
  const count = await prisma.product.count({ where: { category_id: dto.category_id } });
  const product_code = `${category.tag.toUpperCase()}-${String(count + 1).padStart(4, "0")}`;

  return prisma.product.create({
    data: {
      category_id: dto.category_id,
      product_code,
      product_name: dto.product_name,
      pack_size: dto.pack_size,
      selling_price: dto.selling_price,
    },
    include: { category: true },
  });
}

/**
 * PATCH /api/products/[productId]
 */
export async function updateProduct(productId: number, dto: UpdateProductDto) {
  return prisma.product.update({
    where: { product_id: productId },
    data: dto,
    include: { category: true },
  });
}

/**
 * DELETE /api/products/[productId]
 * Only allowed if no stock exists for this product.
 */
export async function deleteProduct(productId: number) {
  const hasStock = await prisma.stock.findFirst({ where: { product_id: productId } });
  if (hasStock) {
    throw new Error("Cannot delete product with existing stock entries. Remove stock first.");
  }
  return prisma.product.delete({ where: { product_id: productId } });
}

// ── STOCK MOVEMENTS ───────────────────────────────────────────

/**
 * GET /api/stock-movements
 * Full movement log, newest first.
 */
export async function getAllMovements(locationId?: number): Promise<MovementRow[]> {
  const rows = await prisma.stockMovement.findMany({
    where: locationId
      ? { stock: { location_id: locationId } }
      : undefined,
    include: {
      product: { include: { category: true } },
      stock: { include: { location: true } },
      creator: true,
    },
    orderBy: { movement_date: "desc" },
    take: 200,
  });

  return rows.map((m) => ({
    movement_id: m.movement_id,
    stock_id: m.stock_id,
    product_id: m.product_id,
    created_by: m.created_by,
    movement_type: m.movement_type,
    quantity: m.quantity,
    movement_date: m.movement_date.toISOString().split("T")[0],
    notes: m.notes,
    product_name: m.product.product_name,
    location_code: m.stock.location.code,
    created_by_name: m.creator.full_name,
    qty_delta: qtyDelta(m.movement_type, m.quantity),
  }));
}

/**
 * POST /api/stock-movements
 * Records a single movement (ISSUE / RETURN / ADJUSTMENT).
 * Updates quantity_on_hand on the STOCK row atomically.
 *
 * Business rule: Returns require approval — this function records it
 * with notes from the approver. Validation of approval is handled
 * at the API route level (check user role).
 */
export async function createMovement(dto: CreateMovementDto, userId: number) {
  const stock = await prisma.stock.findUnique({ where: { stock_id: dto.stock_id } });
  if (!stock) throw new Error("Stock record not found");

  // Validate: cannot issue more than available
  if (dto.movement_type === "ISSUE" && dto.quantity > stock.quantity_on_hand) {
    throw new Error(
      `Insufficient stock. Available: ${stock.quantity_on_hand}, Requested: ${dto.quantity}`
    );
  }

  const delta =
    dto.movement_type === "ISSUE"
      ? -dto.quantity
      : dto.movement_type === "ADJUSTMENT"
      ? dto.quantity // can be negative for downward adjustment
      : dto.quantity; // RETURN / PURCHASE

  // Atomic: create movement + update stock in one transaction
  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        stock_id: dto.stock_id,
        product_id: dto.product_id,
        created_by: userId,
        movement_type: dto.movement_type,
        quantity: Math.abs(dto.quantity),
        movement_date: dto.movement_date
          ? new Date(dto.movement_date)
          : new Date(),
        notes: dto.notes,
      },
      include: {
        product: true,
        stock: { include: { location: true } },
        creator: true,
      },
    }),
    prisma.stock.update({
      where: { stock_id: dto.stock_id },
      data: { quantity_on_hand: { increment: delta } },
    }),
  ]);

  return movement;
}

/**
 * POST /api/stock  — New Stock Entry (Local Purchase or Foreign Import)
 * Creates a PURCHASE movement for each item and updates quantities.
 * If a stock row doesn't exist for product+location, creates it.
 */
export async function createStockEntry(dto: StockEntryDto, userId: number) {
  const results = [];

  for (const item of dto.items) {
    // Find or create stock row for this product + location
    let stock = await prisma.stock.findFirst({
      where: { product_id: item.product_id, location_id: dto.location_id },
    });

    await prisma.$transaction(async (tx) => {
      if (!stock) {
        stock = await tx.stock.create({
          data: {
            product_id: item.product_id,
            location_id: dto.location_id,
            quantity_on_hand: 0,
          },
        });
      }

      const movement = await tx.stockMovement.create({
        data: {
          stock_id: stock!.stock_id,
          product_id: item.product_id,
          created_by: userId,
          movement_type: "PURCHASE",
          quantity: item.quantity,
          movement_date: new Date(dto.date),
          notes: [
            dto.entry_type === "LOCAL_PURCHASE" ? "Local Purchase" : "Foreign Import",
            dto.reference_no,
            dto.notes,
          ]
            .filter(Boolean)
            .join(" — "),
        },
      });

      await tx.stock.update({
        where: { stock_id: stock!.stock_id },
        data: { quantity_on_hand: { increment: item.quantity } },
      });

      results.push(movement);
    });
  }

  return results;
}

// ── CATEGORIES ────────────────────────────────────────────────

export async function getAllCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

// ── LOCATIONS ────────────────────────────────────────────────

export async function getAllLocations() {
  return prisma.inventoryLocation.findMany({ orderBy: { code: "asc" } });
}
