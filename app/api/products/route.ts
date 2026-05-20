// app/api/products/route.ts
// GET  — all products with category
// POST — create a new product (auto-generates product_code)

import { NextResponse } from "next/server";
import {
  getAllProducts,
  createProduct,
  getProductStats,
  getNextProductCode,
  isProductCodeUnique,
} from "@/lib/inventoryService";
import type { CreateProductDto } from "@/types/inventory";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const search = searchParams.get("search") || undefined;
    const category_id = searchParams.get("category_id") ? parseInt(searchParams.get("category_id") as string, 10) : undefined;
    const nextCodeCategoryId = searchParams.get("nextCodeCategoryId");
    const checkProductCode = searchParams.get("checkProductCode");

    if (nextCodeCategoryId) {
      const parsedCategoryId = parseInt(nextCodeCategoryId, 10);
      if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
        return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
      }
      const productCode = await getNextProductCode(parsedCategoryId);
      return NextResponse.json({ data: { productCode } });
    }

    if (checkProductCode) {
      const excludeProductId = searchParams.get("excludeProductId")
        ? parseInt(searchParams.get("excludeProductId") as string, 10)
        : undefined;
      const isUnique = await isProductCodeUnique(checkProductCode, excludeProductId);
      return NextResponse.json({ data: { productCode: checkProductCode.trim().toUpperCase(), isUnique } });
    }

    const data = await getAllProducts(page, pageSize, { search, category_id });
    const stats = await getProductStats();
    return NextResponse.json({ products: data.items, pagination: data.pagination, stats });
  } catch (err) {
    console.error("[GET /api/products]", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dto = (await req.json()) as CreateProductDto;
    const product = await createProduct(dto, user.user_id);
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create product";
    console.error("[POST /api/products]", err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
