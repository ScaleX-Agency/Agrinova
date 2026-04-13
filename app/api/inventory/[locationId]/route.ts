// app/api/inventory/[locationId]/route.ts
// GET /api/inventory/[locationId] — stock for a single location.

import { NextResponse } from "next/server";
import { getStockByLocation } from "@/lib/inventoryService";

interface Props {
  params: Promise<{ locationId: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const { locationId } = await params;
  const id = Number(locationId);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid locationId" }, { status: 400 });
  }

  try {
    const stock = await getStockByLocation(id);
    return NextResponse.json({ stock });
  } catch (err) {
    console.error(`[GET /api/inventory/${id}]`, err);
    return NextResponse.json({ error: "Failed to fetch location stock" }, { status: 500 });
  }
}
