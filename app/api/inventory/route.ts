// src/api/inventory/route.ts
// GET /api/inventory  — All stock across all locations

import { NextResponse } from "next/server";
import { getAllStock, getLocationSummaries } from "@/lib/inventoryService";

export async function GET() {
  try {
    const [stock, summaries] = await Promise.all([
      getAllStock(),
      getLocationSummaries(),
    ]);
    return NextResponse.json({ data: { stock, summaries } });
  } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
