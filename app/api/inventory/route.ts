// app/api/inventory/route.ts
// GET /api/inventory — returns stock[] + summaries[]
// Called by useAllStock() and useLocationSummaries() hooks.

import { NextResponse } from "next/server";
import { getAllStock, getLocationSummaries } from "@/lib/inventoryService";

export async function GET() {
  try {
    const [stock, summaries] = await Promise.all([
      getAllStock(),
      getLocationSummaries(),
    ]);
    return NextResponse.json({ stock, summaries });
  } catch (err) {
    console.error("[GET /api/inventory]", err);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}
