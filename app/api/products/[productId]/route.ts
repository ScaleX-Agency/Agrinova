import { NextResponse } from "next/server"; 
import { prisma } from "@/lib/prisma"; 
import { deleteProduct } from "@/lib/inventoryService"; 

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
  const data = await req.json(); 
  const product = await prisma.product.update({ 
    where: { product_id: Number(productId) }, 
    data, 
    include: { category: true }, 
  }); 
  return NextResponse.json(product); 
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
