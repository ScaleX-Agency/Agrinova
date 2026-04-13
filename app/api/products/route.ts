// app/api/products/route.ts
// GET  — all products with category
// POST — create a new product (auto-generates product_code)

import { NextResponse } from "next/server";
import { getAllProducts, createProduct } from "@/lib/inventoryService";
import type { CreateProductDto } from "@/types/inventory";

export async function GET() {
  try {
    const products = await getAllProducts();
    return NextResponse.json({ products });
  } catch (err) {
    console.error("[GET /api/products]", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const dto = (await req.json()) as CreateProductDto;
    const product = await createProduct(dto);
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create product";
    console.error("[POST /api/products]", err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
