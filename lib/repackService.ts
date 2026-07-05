// lib/repackService.ts
import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import type { CreateProductRepackDto, PaginatedResult, ProductRepackRecord } from "@/types/inventory";

const getRepackPrefix = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `RPK-${year}${month}-`;
};

const getNextRepackNumber = async (
  tx: Prisma.TransactionClient,
  repackDate: Date,
) => {
  const prefix = getRepackPrefix(repackDate);
  const latest = await tx.productRepack.findFirst({
    where: { repack_number: { startsWith: prefix } },
    orderBy: { repack_number: "desc" },
    select: { repack_number: true },
  });

  const latestSequence = latest
    ? Number(latest.repack_number.split("-").at(-1) ?? "0")
    : 0;

  const sequence = Number.isFinite(latestSequence) ? latestSequence : 0;
  return `${prefix}${String(sequence + 1).padStart(3, "0")}`;
};

export async function createProductRepack(
  dto: CreateProductRepackDto,
  userId: number,
) {
  const locationId = Number(dto.location_id);
  const sourceProductId = Number(dto.source_product_id);
  const targetProductId = Number(dto.target_product_id);
  const sourceQuantity = Number(dto.source_quantity);
  const targetQuantity = Number(dto.target_quantity);

  if (!Number.isInteger(locationId) || locationId <= 0) {
    throw new Error("location_id must be a positive integer.");
  }
  if (!Number.isInteger(sourceProductId) || sourceProductId <= 0) {
    throw new Error("source_product_id must be a positive integer.");
  }
  if (!Number.isInteger(targetProductId) || targetProductId <= 0) {
    throw new Error("target_product_id must be a positive integer.");
  }
  if (sourceProductId === targetProductId) {
    throw new Error("Source and target products must be different.");
  }
  if (!Number.isInteger(sourceQuantity) || sourceQuantity <= 0) {
    throw new Error("source_quantity must be a positive integer greater than 0.");
  }
  if (!Number.isInteger(targetQuantity) || targetQuantity <= 0) {
    throw new Error("target_quantity must be a positive integer greater than 0.");
  }

  const repackDate = new Date(dto.repack_date);
  if (Number.isNaN(repackDate.getTime())) {
    throw new Error("repack_date is invalid.");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Verify location
    const location = await tx.inventoryLocation.findFirst({
      where: { location_id: locationId, status: "ACTIVE" },
      select: { location_id: true },
    });
    if (!location) {
      throw new Error("Inventory location not found or is inactive.");
    }

    // 2. Verify products
    const [sourceProduct, targetProduct] = await Promise.all([
      tx.product.findUnique({
        where: { product_id: sourceProductId },
        select: { product_id: true, product_code: true },
      }),
      tx.product.findUnique({
        where: { product_id: targetProductId },
        select: { product_id: true, product_code: true },
      }),
    ]);

    if (!sourceProduct) {
      throw new Error(`Source product with ID ${sourceProductId} not found.`);
    }
    if (!targetProduct) {
      throw new Error(`Target product with ID ${targetProductId} not found.`);
    }

    // 3. Verify source stock quantity
    const sourceStock = await tx.stock.findUnique({
      where: {
        product_id_location_id: {
          product_id: sourceProductId,
          location_id: locationId,
        },
      },
      select: { stock_id: true, quantity_on_hand: true },
    });

    if (!sourceStock) {
      throw new Error(`Stock record not found for source product ${sourceProduct.product_code} at this location.`);
    }
    if (sourceStock.quantity_on_hand < sourceQuantity) {
      throw new Error(
        `Insufficient stock for source product ${sourceProduct.product_code}. Available: ${sourceStock.quantity_on_hand}, Requested: ${sourceQuantity}.`,
      );
    }

    // 4. Update stock (decrement source, increment/upsert target)
    await tx.stock.update({
      where: { stock_id: sourceStock.stock_id },
      data: { quantity_on_hand: { decrement: sourceQuantity } },
    });

    await tx.stock.upsert({
      where: {
        product_id_location_id: {
          product_id: targetProductId,
          location_id: locationId,
        },
      },
      create: {
        product_id: targetProductId,
        location_id: locationId,
        quantity_on_hand: targetQuantity,
      },
      update: {
        quantity_on_hand: { increment: targetQuantity },
      },
    });

    // 5. Generate unique repack number
    let repackNo = await getNextRepackNumber(tx, repackDate);
    let repackCreated = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        repackCreated = await tx.productRepack.create({
          data: {
            repack_number: repackNo,
            repack_date: repackDate,
            location_id: locationId,
            source_product_id: sourceProductId,
            source_quantity: sourceQuantity,
            target_product_id: targetProductId,
            target_quantity: targetQuantity,
            notes: dto.notes?.trim() || null,
            created_by: userId,
          },
        });
        break;
      } catch (error) {
        const isConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          Array.isArray(error.meta?.target) &&
          (error.meta.target as string[]).includes("repack_number");
        if (!isConflict) throw error;
        repackNo = await getNextRepackNumber(tx, repackDate);
      }
    }

    if (!repackCreated) {
      throw new Error("Unable to generate a unique repack number. Please retry.");
    }

    return repackCreated;
  }, { timeout: 20000, maxWait: 10000 });

  revalidateTag("inventory", "max");
  revalidateTag("summaries", "max");
  return result;
}

export async function getProductRepacks(
  page: number = 1,
  pageSize: number = 20,
  filters?: { location_id?: number; startDate?: string; endDate?: string; search?: string },
): Promise<PaginatedResult<ProductRepackRecord>> {
  // eslint-disable-next-line
  const where: any = {
    is_active: true,
  };

  if (filters?.location_id) {
    where.location_id = filters.location_id;
  }

  if (filters?.startDate || filters?.endDate) {
    where.repack_date = {};
    if (filters.startDate) {
      where.repack_date.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setDate(end.getDate() + 1); // include the end date day fully
      where.repack_date.lt = end;
    }
  }

  if (filters?.search) {
    where.OR = [
      { repack_number: { contains: filters.search, mode: "insensitive" } },
      {
        source_product: {
          OR: [
            { product_name: { contains: filters.search, mode: "insensitive" } },
            { product_code: { contains: filters.search, mode: "insensitive" } },
          ],
        },
      },
      {
        target_product: {
          OR: [
            { product_name: { contains: filters.search, mode: "insensitive" } },
            { product_code: { contains: filters.search, mode: "insensitive" } },
          ],
        },
      },
      { notes: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [total, repacks] = await Promise.all([
    prisma.productRepack.count({ where }),
    prisma.productRepack.findMany({
      where,
      include: {
        location: true,
        source_product: true,
        target_product: true,
        creator: true,
      },
      orderBy: [{ repack_date: "desc" }, { repack_id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items = repacks.map((r) => ({
    repack_id: r.repack_id,
    repack_number: r.repack_number,
    repack_date: r.repack_date.toISOString(),
    location_id: r.location_id,
    location_code: r.location.code,
    location_name: r.location.name,
    source_product_id: r.source_product_id,
    source_product_code: r.source_product.product_code,
    source_product_name: r.source_product.product_name,
    source_quantity: r.source_quantity,
    target_product_id: r.target_product_id,
    target_product_code: r.target_product.product_code,
    target_product_name: r.target_product.product_name,
    target_quantity: r.target_quantity,
    notes: r.notes,
    created_by_name: r.creator.full_name,
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

export async function getProductRepackById(repackId: number): Promise<ProductRepackRecord | null> {
  const r = await prisma.productRepack.findUnique({
    where: { repack_id: repackId },
    include: {
      location: true,
      source_product: true,
      target_product: true,
      creator: true,
    },
  });

  if (!r || !r.is_active) return null;

  return {
    repack_id: r.repack_id,
    repack_number: r.repack_number,
    repack_date: r.repack_date.toISOString(),
    location_id: r.location_id,
    location_code: r.location.code,
    location_name: r.location.name,
    source_product_id: r.source_product_id,
    source_product_code: r.source_product.product_code,
    source_product_name: r.source_product.product_name,
    source_quantity: r.source_quantity,
    target_product_id: r.target_product_id,
    target_product_code: r.target_product.product_code,
    target_product_name: r.target_product.product_name,
    target_quantity: r.target_quantity,
    notes: r.notes,
    created_by_name: r.creator.full_name,
  };
}

export async function deleteProductRepack(repackId: number, userId: number) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch repack details
    const repack = await tx.productRepack.findUnique({
      where: { repack_id: repackId },
      include: {
        source_product: { select: { product_code: true } },
        target_product: { select: { product_code: true } },
      },
    });

    if (!repack || !repack.is_active) {
      throw new Error("Repacking record not found or already inactive.");
    }

    // 2. Lock and check target stock levels for reversal
    const targetStock = await tx.stock.findUnique({
      where: {
        product_id_location_id: {
          product_id: repack.target_product_id,
          location_id: repack.location_id,
        },
      },
      select: { stock_id: true, quantity_on_hand: true },
    });

    if (!targetStock) {
      throw new Error(`Stock record not found for target product ${repack.target_product.product_code} at this location.`);
    }
    if (targetStock.quantity_on_hand < repack.target_quantity) {
      throw new Error(
        `Cannot delete repack ${repack.repack_number}: target product stock is insufficient for reversal. Available: ${targetStock.quantity_on_hand}, repacked: ${repack.target_quantity}.`,
      );
    }

    // 3. Lock and retrieve source stock
    const sourceStock = await tx.stock.findUnique({
      where: {
        product_id_location_id: {
          product_id: repack.source_product_id,
          location_id: repack.location_id,
        },
      },
      select: { stock_id: true },
    });

    // 4. Reverse quantities (increment source, decrement target)
    if (sourceStock) {
      await tx.stock.update({
        where: { stock_id: sourceStock.stock_id },
        data: { quantity_on_hand: { increment: repack.source_quantity } },
      });
    } else {
      await tx.stock.create({
        data: {
          product_id: repack.source_product_id,
          location_id: repack.location_id,
          quantity_on_hand: repack.source_quantity,
        },
      });
    }

    await tx.stock.update({
      where: { stock_id: targetStock.stock_id },
      data: { quantity_on_hand: { decrement: repack.target_quantity } },
    });

    // 5. Soft delete
    const deleted = await tx.productRepack.update({
      where: { repack_id: repackId },
      data: {
        is_active: false,
        deleted_by: userId,
      },
    });

    return deleted;
  }, { timeout: 20000, maxWait: 10000 });

  revalidateTag("inventory", "max");
  revalidateTag("summaries", "max");
  return result;
}
