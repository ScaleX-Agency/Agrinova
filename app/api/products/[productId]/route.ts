// src/api/products/[productId]/route.ts
// GET    /api/products/[productId]  — Single product
// PATCH  /api/products/[productId]  — Update product
// DELETE /api/products/[productId]  — Delete product (if no stock)

import { NextRequest, NextResponse } from "next/server";
import { getProduct, updateProduct, deleteProduct } from "@/lib/inventoryService";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const productId = parseInt((await params).productId);
    const data = await getProduct(productId);
    if (!data) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ data });
  } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const productId = parseInt((await params).productId);
    const body = await req.json();
    const data = await updateProduct(productId, body);
    return NextResponse.json({ data });
  } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const productId = parseInt((await params).productId);
    await deleteProduct(productId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    const status = err.message.includes("Cannot delete") ? 409 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
