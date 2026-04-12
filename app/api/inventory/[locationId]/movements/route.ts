import { NextResponse } from "next/server"; 
import { getMovementsByLocation, createMovement } from "@/lib/inventoryService"; 

export async function GET(_req: Request, { params }: { params: Promise<{ locationId: string }> }) { 
  const { locationId } = await params; 
  const movements = await getMovementsByLocation(Number(locationId)); 
  return NextResponse.json({ movements }); 
} 

export async function POST(req: Request, { params }: { params: Promise<{ locationId: string }> }) { 
  try { 
    const body = await req.json(); 
    // TODO: get userId from session/cookie 
    const userId = 1; // replace with real auth 
    const result = await createMovement(body, userId); 
    return NextResponse.json(result, { status: 201 }); 
  } catch (err: unknown) { 
    const msg = err instanceof Error ? err.message : "Failed"; 
    return NextResponse.json({ error: msg }, { status: 400 }); 
  } 
}
