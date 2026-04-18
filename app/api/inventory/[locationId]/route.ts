// app/api/inventory/[locationId]/route.ts
// GET /api/inventory/[locationId] — stock for a single location.

import { NextResponse } from "next/server";
import { getStockByLocation } from "@/lib/inventoryService";

interface Props {
  params: Promise<{ locationId: string }>;
}

export async function GET(req: Request, { params }: Props) {
  const { locationId } = await params;
  const id = Number(locationId);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid locationId" }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;

    const stockData = await getStockByLocation(id, page, pageSize, {
      search,
      status,
    });

    return NextResponse.json({
      stock: stockData.items,
      pagination: stockData.pagination,
    });
  } catch (err) {
    console.error(`[GET /api/inventory/${id}]`, err);
    return NextResponse.json(
      { error: "Failed to fetch location stock" },
      { status: 500 }
    );
  }
}