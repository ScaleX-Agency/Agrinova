// src/api/inventory/[locationId]/route.ts
// GET /api/inventory/[locationId]  — Stock for one location

import { NextRequest, NextResponse } from "next/server";
import { getStockByLocation } from "../../../lib/inventoryService";

export async function GET(
  _req: NextRequest,
  { params }: { params: { locationId: string } }
) {
  try {
    const locationId = parseInt(params.locationId);
    if (isNaN(locationId)) {
      return NextResponse.json({ error: "Invalid locationId" }, { status: 400 });
    }
    const data = await getStockByLocation(locationId);
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
