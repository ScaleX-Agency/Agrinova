// src/api/products/route.ts
// GET  /api/products  — List all products
// POST /api/products  — Create new product

import { NextRequest, NextResponse } from "next/server";
import { getAllProducts, createProduct } from "../../lib/inventoryService";

export async function GET() {
  try {
    const data = await getAllProducts();
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.product_name || !body.pack_size || !body.category_id || !body.selling_price) {
      return NextResponse.json(
        { error: "product_name, pack_size, category_id, and selling_price are required" },
        { status: 400 }
      );
    }

    const data = await createProduct({
      category_id: body.category_id,
      product_name: body.product_name,
      pack_size: body.pack_size,
      selling_price: body.selling_price,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
