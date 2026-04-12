import { NextResponse } from "next/server"; 
import { getAllMovements, createMovement } from "@/lib/inventoryService"; 

export async function GET() { 
  const movements = await getAllMovements(); 
  return NextResponse.json({ movements }); 
} 

export async function POST(req: Request) { 
  try { 
    const body = await req.json(); 
    const userId = 1; // replace with auth 
    const result = await createMovement(body, userId); 
    return NextResponse.json(result, { status: 201 }); 
  } catch (err: unknown) { 
    const msg = err instanceof Error ? err.message : "Failed"; 
    return NextResponse.json({ error: msg }, { status: 400 }); 
  } 
}
