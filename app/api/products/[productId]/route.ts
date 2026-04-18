import { NextResponse } from "next/server"; 
import { prisma } from "@/lib/prisma"; 
import { deleteProduct, updateProduct } from "@/lib/inventoryService"; 
import type { CreateProductDto } from "@/types/inventory";

export async function GET(_: Request, { params }: { params: Promise<{ productId: string }> }) { 
  const { productId } = await params; 
  const product = await prisma.product.findUnique({ 
    where: { product_id: Number(productId) }, 
    include: { category: true }, 
  }); 
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 }); 
  return NextResponse.json(product); 
} 

export async function PATCH(req: Request, { params }: { params: Promise<{ productId: string }> }) { 
  const { productId } = await params; 
  try {
    const data = await req.json() as Partial<CreateProductDto>; 
    const product = await updateProduct(Number(productId), data);
    return NextResponse.json(product); 
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed"; 
    return NextResponse.json({ error: msg }, { status: 400 }); 
  }
} 

export async function DELETE(_: Request, { params }: { params: Promise<{ productId: string }> }) { 
  const { productId } = await params; 
  try { 
    await deleteProduct(Number(productId)); 
    return NextResponse.json({ deleted: true }); 
  } catch (err: unknown) { 
    const msg = err instanceof Error ? err.message : "Failed"; 
    return NextResponse.json({ error: msg }, { status: 400 }); 
  } 
} 
