// src/api/inventory/[locationId]/route.ts
// GET /api/inventory/[locationId]  — Stock for one location

import { NextRequest, NextResponse } from "next/server";
import { getStockByLocation } from "@/lib/inventoryService";
import type { StockByLocationResponse } from "@/types/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const locationId = parseInt((await params).locationId);
    if (isNaN(locationId)) {
      return NextResponse.json({ error: "Invalid locationId" }, { status: 400 });
    }
    const data = await getStockByLocation(locationId);
    const responseBody: StockByLocationResponse = { data };
    return NextResponse.json(responseBody);
  } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
