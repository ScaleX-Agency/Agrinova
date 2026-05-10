// src/lib/inventoryService.ts
import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { unstable_cache, revalidateTag } from "next/cache";
import type {
  StockOverviewRow,
  LocationSummary,
  MovementRow,
  CreateMovementDto,
  CreateStockEntryDto,
  CreateProductDto,
  PaginatedResult,
} from "@/types/inventory";

const LOW_THRESHOLD = 20;

function computeStatus(
  qty: number,
  threshold = LOW_THRESHOLD,
): "ok" | "low" | "out" {
  if (qty <= 0) return "out";
  if (qty < threshold) return "low";
  return "ok";
}

function computeQtyDelta(type: string, qty: number): number {
  if (type === "ISSUE" || type === "ADJUSTMENT") return -qty;
  if (type === "ISSUE_REVERSAL") return qty;
  if (type === "RETURN_REVERSAL" || type === "PURCHASE_REVERSAL") return -qty;
  if (type === "RETURN_UNUSABLE" || type === "RETURN_UNUSABLE_REVERSAL") return 0;
  return qty;
}

// ── Stock ─────────────────────────────────────────────────────
// unstable_cache: serves repeated page loads from memory, not Supabase.
// revalidateTag("inventory") in mutation routes busts this immediately.

export async function getAllStock(
  page: number = 1,
  pageSize: number = 20,
  filters?: { search?: string; location_id?: number; status?: string },
): Promise<PaginatedResult<StockOverviewRow>> {
  // eslint-disable-next-line
  const where: any = {};
  if (filters?.location_id) {
    where.location_id = filters.location_id;
  }
  if (filters?.search) {
    where.OR = [
      {
        product: {
          product_name: { contains: filters.search, mode: "insensitive" },
        },
      },
      {
        product: {
          product_code: { contains: filters.search, mode: "insensitive" },
        },
      },
    ];
  }

  if (filters?.status && filters.status !== "all") {
    if (filters.status === "out") {
      where.quantity_on_hand = { lte: 0 };
    } else if (filters.status === "low") {
      where.quantity_on_hand = { gt: 0, lt: LOW_THRESHOLD };
    } else if (filters.status === "ok") {
      where.quantity_on_hand = { gte: LOW_THRESHOLD };
    }
  }

  const [total, stocksRaw] = await prisma.$transaction([
    prisma.stock.count({ where }),
    prisma.stock.findMany({
      where,
      include: {
        product: { include: { category: true } },
        location: true,
      },
      orderBy: [
        { location: { location_id: "asc" } },
        { product: { product_name: "asc" } },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items = stocksRaw.map((s) => {
    return {
      stock_id: s.stock_id,
      product_id: s.product_id,
      product_code: s.product.product_code,
      product_name: s.product.product_name,
      category_name: s.product.category.name,
      pack_size: s.product.pack_size,
      selling_price: Number(s.product.selling_price),
      quantity_on_hand: s.quantity_on_hand,
      reorder_threshold: LOW_THRESHOLD,
      status: computeStatus(s.quantity_on_hand),
      location_id: s.location_id,
      location_code: s.location.code,
      location_name: s.location.name,
    };
  });

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function getStockByLocation(
  locationId: number,
  page: number = 1,
  pageSize: number = 20,
  filters?: { search?: string; status?: string },
): Promise<PaginatedResult<StockOverviewRow>> {
  return getAllStock(page, pageSize, { ...filters, location_id: locationId });
}

export async function getAllStockByLocation(
  locationId: number,
  filters?: { search?: string; status?: string },
   
): Promise<PaginatedResult<StockOverviewRow>> {
  // eslint-disable-next-line
  const where: any = { location_id: locationId };

  if (filters?.search) {
    where.OR = [
      {
        product: {
          product_name: { contains: filters.search, mode: "insensitive" },
        },
      },
      {
        product: {
          product_code: { contains: filters.search, mode: "insensitive" },
        },
      },
    ];
  }

  if (filters?.status && filters.status !== "all") {
    if (filters.status === "out") {
      where.quantity_on_hand = { lte: 0 };
    } else if (filters.status === "low") {
      where.quantity_on_hand = { gt: 0, lt: LOW_THRESHOLD };
    } else if (filters.status === "ok") {
      where.quantity_on_hand = { gte: LOW_THRESHOLD };
    }
  }

  const [total, stocksRaw] = await prisma.$transaction([
    prisma.stock.count({ where }),
    prisma.stock.findMany({
      where,
      include: {
        product: { include: { category: true } },
        location: true,
      },
      orderBy: [
        { product: { product_name: "asc" } },
        { stock_id: "asc" },
      ],
    }),
  ]);

  const items = stocksRaw.map((s) => ({
    stock_id: s.stock_id,
    product_id: s.product_id,
    product_code: s.product.product_code,
    product_name: s.product.product_name,
    category_name: s.product.category.name,
    pack_size: s.product.pack_size,
    selling_price: Number(s.product.selling_price),
    quantity_on_hand: s.quantity_on_hand,
    reorder_threshold: LOW_THRESHOLD,
    status: computeStatus(s.quantity_on_hand),
    location_id: s.location_id,
    location_code: s.location.code,
    location_name: s.location.name,
  }));

  return {
    items,
    pagination: {
      page: 1,
      pageSize: total || 1,
      total,
      totalPages: 1,
    },
  };
}

export const getLocationSummaries = unstable_cache(
  async (): Promise<LocationSummary[]> => {
    const rows = await prisma.$queryRaw<
      Array<{
        location_id: number;
        code: string;
        name: string;
        total_products: bigint;
        total_units: bigint;
        low_count: bigint;
        out_count: bigint;
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
      location_id: r.location_id,
      code: r.code,
      name: r.name,
      total_products: Number(r.total_products),
      total_units: Number(r.total_units),
      low_count: Number(r.low_count),
      out_count: Number(r.out_count),
    }));
  },
  ["location-summaries-sql"],
  { revalidate: 30, tags: ["inventory", "summaries"] },
);

// ── Movements ─────────────────────────────────────────────────

export async function getAllMovements(
  page: number = 1,
  pageSize: number = 20,
   
  filters?: { movement_type?: string; search?: string; location_id?: number },
   
): Promise<PaginatedResult<MovementRow>> {
  // eslint-disable-next-line
  const where: any = {};
  if (filters?.movement_type && filters.movement_type !== "ALL") {
    where.movement_type = filters.movement_type;
  }
  if (filters?.location_id) {
    where.stock = { ...where.stock, location_id: filters.location_id };
  }
  if (filters?.search) {
    where.OR = [
      {
        product: {
          product_name: { contains: filters.search, mode: "insensitive" },
        },
      },
      {
        product: {
          product_code: { contains: filters.search, mode: "insensitive" },
        },
      },
    ];
  }

  const [total, movs] = await prisma.$transaction([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      include: {
        stock: { include: { location: true } },
        product: true,
        creator: true,
      },
      orderBy: { movement_date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items = movs.map((m) => ({
    movement_id: m.movement_id,
    movement_date: m.movement_date.toISOString(),
    movement_type: m.movement_type as MovementRow["movement_type"],
    product_name: m.product.product_name,
    product_code: m.product.product_code,
    location_code: m.stock.location.code,
    movement_qty: m.quantity,
    qty_delta: computeQtyDelta(m.movement_type, m.quantity),
    created_by_name: m.creator.full_name,
  }));

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function getMovementsByLocation(
  locationId: number,
  page: number = 1,
  pageSize: number = 20,
  filters?: { movement_type?: string; search?: string },
): Promise<PaginatedResult<MovementRow>> {
  return getAllMovements(page, pageSize, {
    ...filters,
    location_id: locationId,
  });
}

// ── Mutations (NOT cached — always hit DB) ────────────────────

export async function createMovement(
  dto: CreateMovementDto,
  userId: number,
): Promise<{
  updatedStock: { stock_id: number; quantity_on_hand: number };
  movement_id: number;
}> {
  const stock = await prisma.stock.findUniqueOrThrow({
    where: { stock_id: dto.stock_id },
  });

  const isAdjustment = dto.movement_type === "ADJUSTMENT";
  const targetQty = isAdjustment
    ? dto.resulting_quantity ?? dto.quantity
    : undefined;

  if (isAdjustment) {
    if (!Number.isInteger(targetQty) || (targetQty as number) < 0) {
      throw new Error("resulting_quantity must be a non-negative integer");
    }
  }

  const delta = isAdjustment
    ? (targetQty as number) - stock.quantity_on_hand
    : computeQtyDelta(dto.movement_type, dto.quantity);
  const newQty = stock.quantity_on_hand + delta;

  if (newQty < 0) throw new Error("Insufficient stock for this movement");

  const [updatedStock, movement] = await prisma.$transaction([
    prisma.stock.update({
      where: { stock_id: dto.stock_id },
      data: { quantity_on_hand: newQty },
    }),
    prisma.stockMovement.create({
      data: {
        stock_id: dto.stock_id,
        product_id: stock.product_id,
        created_by: userId,
        movement_type: dto.movement_type,
        quantity: dto.quantity,
        movement_date: new Date(),
      },
    }),
  ]);

  // Bust server-side cache so next RSC render gets fresh data
  revalidateTag("inventory", "max");

  return {
    updatedStock: {
      stock_id: updatedStock.stock_id,
      quantity_on_hand: updatedStock.quantity_on_hand,
    },
    movement_id: movement.movement_id,
  };
}

export async function getAllProducts(
  page: number = 1,
   
  pageSize: number = 20,
   
  filters?: { search?: string; category_id?: number },
   
) {
  // eslint-disable-next-line
  const where: any = {};
  if (filters?.category_id) {
    where.category_id = filters.category_id;
  }
  if (filters?.search) {
    where.OR = [
      { product_name: { contains: filters.search, mode: "insensitive" } },
      { product_code: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { product_name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items = products.map((p) => ({
    product_id: p.product_id,
    category_id: p.category_id,
    product_code: p.product_code,
    product_name: p.product_name,
    pack_size: p.pack_size,
    selling_price: Number(p.selling_price),
    category: p.category,
  }));

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function getProductStats() {
  const aggregates = await prisma.product.aggregate({
    _avg: { selling_price: true },
    _max: { selling_price: true },
  });

  return {
    avgPrice: aggregates._avg.selling_price
      ? Number(aggregates._avg.selling_price)
      : 0,
    maxPrice: aggregates._max.selling_price
      ? Number(aggregates._max.selling_price)
      : 0,
  };
}

export async function createProduct(dto: CreateProductDto, userId?: number) {
  const category = await prisma.category.findUniqueOrThrow({
    where: { category_id: dto.category_id },
  });
  const count = await prisma.product.count({
    where: { category_id: dto.category_id },
  });
  const product_code = `${category.tag}${String(count + 1).padStart(3, "0")}`;

  const product = await prisma.$transaction(async (tx) => {
    const createdProduct = await tx.product.create({
      data: {
        product_name: dto.product_name,
        pack_size: dto.pack_size,
        category_id: dto.category_id,
        selling_price: dto.selling_price,
        product_code,
      },
      include: { category: true },
    });

    if (dto.initial_qty && dto.initial_qty > 0 && dto.location_id && userId) {
      const stock = await tx.stock.create({
        data: {
          product_id: createdProduct.product_id,
          location_id: dto.location_id,
          quantity_on_hand: dto.initial_qty,
        },
      });

      await tx.stockMovement.create({
        data: {
          stock_id: stock.stock_id,
          product_id: createdProduct.product_id,
          created_by: userId,
          movement_type: "PURCHASE",
          quantity: dto.initial_qty,
          movement_date: new Date(),
        },
      });
    }

    return createdProduct;
  });

  revalidateTag("inventory", "max");
  return product;
}

export async function deleteProduct(productId: number) {
  const hasStock = await prisma.stock.findFirst({
    where: { product_id: productId },
  });
  if (hasStock)
    throw new Error("Cannot delete product with existing stock entries");

  const product = await prisma.product.delete({
    where: { product_id: productId },
  });
  revalidateTag("inventory", "max");
  return product;
}

const STOCK_ENTRY_TYPES = new Set([
  "LOCAL_PURCHASE",
  "FOREIGN_IMPORT",
] as const);

const getGrnPrefix = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `GRN-${year}${month}-`;
};

const getNextGrnNumber = async (
  tx: Prisma.TransactionClient,
  entryDate: Date,
) => {
  const prefix = getGrnPrefix(entryDate);
  const latest = await tx.goodsReceivingNote.findFirst({
    where: { grn_number: { startsWith: prefix } },
    orderBy: { grn_number: "desc" },
    select: { grn_number: true },
  });

  const latestSequence = latest
    ? Number(latest.grn_number.split("-").at(-1) ?? "0")
    : 0;

  return `${prefix}${String((Number.isFinite(latestSequence) ? latestSequence : 0) + 1).padStart(3, "0")}`;
};

export async function createStockEntry(
  dto: CreateStockEntryDto,
  userId: number,
) {
  const locationId = Number(dto.location_id);
  if (!Number.isInteger(locationId) || locationId <= 0) {
    throw new Error("location_id must be a positive integer.");
  }

  if (!STOCK_ENTRY_TYPES.has(dto.entry_type)) {
    throw new Error("entry_type must be LOCAL_PURCHASE or FOREIGN_IMPORT.");
  }

  if (!Array.isArray(dto.items) || dto.items.length === 0) {
    throw new Error("At least one stock entry line is required.");
  }

  const entryDate = new Date(dto.date);
  if (Number.isNaN(entryDate.getTime())) {
    throw new Error("date is invalid.");
  }

  const normalizedItems = dto.items.map((line, index) => {
    const lineNumber = index + 1;
    const productId = Number(line.product_id);
    const quantity = Number(line.quantity);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new Error(
        `Line ${lineNumber}: product_id must be a positive integer.`,
      );
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(
        `Line ${lineNumber}: quantity must be a positive integer.`,
      );
    }

    return {
      product_id: productId,
      quantity,
    };
  });

  const result = await prisma.$transaction(async (tx) => {
    const location = await tx.inventoryLocation.findUnique({
      where: { location_id: locationId },
      select: { location_id: true },
    });
    if (!location) {
      throw new Error("Selected inventory location not found.");
    }

    const productIds = Array.from(
      new Set(normalizedItems.map((line) => line.product_id)),
    );
    const products = await tx.product.findMany({
      where: { product_id: { in: productIds } },
      select: { product_id: true },
    });
    const existingProductIds = new Set(
      products.map((product) => product.product_id),
    );
    const missingProductId = productIds.find(
      (productId) => !existingProductIds.has(productId),
    );
    if (typeof missingProductId === "number") {
      throw new Error(`Product ${missingProductId} was not found.`);
    }

    const quantityByProduct = normalizedItems.reduce<Map<number, number>>(
      (map, line) => {
        map.set(
          line.product_id,
          (map.get(line.product_id) ?? 0) + line.quantity,
        );
        return map;
      },
      new Map(),
    );

    const requestedGrnNumber = dto.grn_number?.trim() ?? "";
    const shouldAutoGenerateGrn = requestedGrnNumber.length === 0;

    let grnNumber = shouldAutoGenerateGrn
      ? await getNextGrnNumber(tx, entryDate)
      : requestedGrnNumber;
    let createdNote: { grn_id: number; grn_number: string } | null = null;

    const maxAttempts = shouldAutoGenerateGrn ? 3 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        createdNote = await tx.goodsReceivingNote.create({
          data: {
            grn_number: grnNumber,
            grn_date: entryDate,
            entry_type: dto.entry_type,
            location_id: locationId,
            reference_no: dto.reference_no?.trim() || null,
            notes: dto.notes?.trim() || null,
            created_by: userId,
            lines: {
              create: normalizedItems.map((line) => ({
                product_id: line.product_id,
                quantity: line.quantity,
              })),
            },
          },
          select: {
            grn_id: true,
            grn_number: true,
          },
        });
        break;
      } catch (error) {
        const isNumberConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          Array.isArray(error.meta?.target) &&
          (error.meta.target as string[]).includes("grn_number");

        if (!isNumberConflict) {
          throw error;
        }

        if (!shouldAutoGenerateGrn) {
          throw new Error("GRN number already exists. Please use a different GRN number.");
        }

        grnNumber = await getNextGrnNumber(tx, entryDate);
      }
    }

    if (!createdNote) {
      throw new Error("Unable to generate a unique GRN number. Please retry.");
    }

    const existingStocks = await tx.stock.findMany({
      where: {
        location_id: locationId,
        product_id: { in: productIds },
      },
      select: {
        stock_id: true,
        product_id: true,
      },
    });
    const stockByProductId = new Map(
      existingStocks.map((stock) => [stock.product_id, stock]),
    );

    const movementNote = [
      `GRN ${createdNote.grn_number}`,
      dto.reference_no?.trim() ? `Ref: ${dto.reference_no.trim()}` : null,
      dto.notes?.trim() ? dto.notes.trim() : null,
    ]
      .filter(Boolean)
      .join(" • ");

    const stockUpdates: Array<{
      stock_id: number;
      product_id: number;
      quantity_on_hand: number;
    }> = [];

    for (const [productId, qty] of quantityByProduct.entries()) {
      const existingStock = stockByProductId.get(productId);
      const stock = existingStock
        ? await tx.stock.update({
            where: { stock_id: existingStock.stock_id },
            data: { quantity_on_hand: { increment: qty } },
          })
        : await tx.stock.create({
            data: {
              product_id: productId,
              location_id: locationId,
              quantity_on_hand: qty,
            },
          });

      await tx.stockMovement.create({
        data: {
          stock_id: stock.stock_id,
          product_id: productId,
          created_by: userId,
          movement_type: "PURCHASE",
          quantity: qty,
          movement_date: entryDate,
        },
      });

      stockUpdates.push({
        stock_id: stock.stock_id,
        product_id: productId,
        quantity_on_hand: stock.quantity_on_hand,
      });
    }

    return {
      grn_id: createdNote.grn_id,
      grn_number: createdNote.grn_number,
      stock_updates: stockUpdates,
    };
  });

  revalidateTag("inventory", "max");
  return result;
}

export async function getAllCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createCategory(dto: { name: string; tag: string }) {
  const name = dto.name.trim();
  const tag = dto.tag.trim().toUpperCase();

  if (!name) {
    throw new Error("Category name is required");
  }

  if (!tag) {
    throw new Error("Category tag is required");
  }

  const category = await prisma.category.create({
    data: {
      name,
      tag,
    },
  });

  revalidateTag("inventory", "max");
  return category;
}

export async function updateProduct(
  productId: number,
  dto: Partial<CreateProductDto>,
) {
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

   
  revalidateTag("inventory", "max");
   
  return product;
   
}
   

  // eslint-disable-next-line
export async function importStock(data: any[], userId: number) {
  const imported = [];
  for (const row of data) {
    const product = await prisma.product.findFirst({
      where: { product_code: row.product_code },
    });
    const location = await prisma.inventoryLocation.findFirst({
      where: { code: row.location_code },
    });

    if (!product || !location) {
      throw new Error(
        `Product ${row.product_code} or location ${row.location_code} not found`,
      );
    }

    const qty = parseInt(row.quantity);
    if (isNaN(qty) || qty <= 0) throw new Error("Invalid quantity");

    const existing = await prisma.stock.findFirst({
      where: {
        product_id: product.product_id,
        location_id: location.location_id,
      },
    });

    let stock;
    if (existing) {
      stock = await prisma.stock.update({
        where: { stock_id: existing.stock_id },
        data: { quantity_on_hand: { increment: qty } },
      });
    } else {
      stock = await prisma.stock.create({
        data: {
          product_id: product.product_id,
          location_id: location.location_id,
          quantity_on_hand: qty,
        },
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
      },
    });

    imported.push(stock);
  }

  revalidateTag("inventory", "max");
  return imported;
}

export async function deleteMovement(movementId: number) {
  const movement = await prisma.stockMovement.findUnique({
    where: { movement_id: movementId },
  });
  if (!movement) throw new Error("Movement not found");

  const stock = await prisma.stock.findUnique({
    where: { stock_id: movement.stock_id },
  });
  if (!stock) throw new Error("Stock not found");

  // Revert the quantity change
  let qtyDelta = movement.quantity;
  if (
    movement.movement_type === "ISSUE" ||
    movement.movement_type === "ADJUSTMENT"
  ) {
    qtyDelta = -qtyDelta;
  }

  // We are deleting the movement, so we do the opposite of what it did
  await prisma.stock.update({
    where: { stock_id: stock.stock_id },
    data: { quantity_on_hand: stock.quantity_on_hand - qtyDelta },
  });

  await prisma.stockMovement.delete({ where: { movement_id: movementId } });

  revalidateTag("inventory", "max");
  return movement;
}

export async function getAllLocations() {
  return prisma.inventoryLocation.findMany({
    orderBy: { location_id: "asc" },
  });
}
