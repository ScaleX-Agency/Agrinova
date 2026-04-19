// app/api/inventory/route.ts
// GET /api/inventory — returns stock[] + summaries[]
// Called by useAllStock() and useLocationSummaries() hooks.

import { NextResponse } from "next/server";
import { getAllStock, getLocationSummaries } from "@/lib/inventoryService";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const search = searchParams.get("search") || undefined;
    const location_id = searchParams.get("location_id") ? parseInt(searchParams.get("location_id") as string, 10) : undefined;
    const status = searchParams.get("status") || undefined;

    const stockData = await getAllStock(page, pageSize, { search, location_id, status });
    const summaries = await getLocationSummaries();
    
    return NextResponse.json({ 
      stock: stockData.items, 
      pagination: stockData.pagination,
      summaries 
    });
  } catch (err) {
    console.error("[GET /api/inventory]", err);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}
