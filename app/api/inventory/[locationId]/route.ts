import { NextResponse } from "next/server"; 
import { getStockByLocation } from "@/lib/inventoryService"; 

export async function GET(_req: Request, { params }: { params: Promise<{ locationId: string }> }) { 
  const { locationId } = await params; 
  try { 
    const stock = await getStockByLocation(Number(locationId)); 
    return NextResponse.json({ stock }); 
  } catch { 
    return NextResponse.json({ error: "Not found" }, { status: 404 }); 
  } 
}
