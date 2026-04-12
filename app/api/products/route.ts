import { NextResponse } from "next/server"; 
import { getAllProducts, createProduct } from "@/lib/inventoryService"; 

export async function GET() { 
  const products = await getAllProducts(); 
  return NextResponse.json({ products }); 
} 

export async function POST(req: Request) { 
  try { 
    const dto = await req.json(); 
    const product = await createProduct(dto); 
    return NextResponse.json(product, { status: 201 }); 
  } catch (err: unknown) { 
    const msg = err instanceof Error ? err.message : "Failed"; 
    return NextResponse.json({ error: msg }, { status: 400 }); 
  } 
} 
