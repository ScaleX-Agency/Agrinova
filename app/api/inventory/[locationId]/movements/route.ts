// app/api/inventory/[locationId]/movements/route.ts
// GET  — movements for a location
// POST — record a new movement for a stock item at this location

import { NextResponse } from "next/server";
import { getMovementsByLocation, createMovement } from "@/lib/inventoryService";
import type { CreateMovementDto } from "@/types/inventory";

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
    const movement_type = searchParams.get("movement_type") || undefined;
    const search = searchParams.get("search") || undefined;

    const data = await getMovementsByLocation(id, page, pageSize, { movement_type, search });
    return NextResponse.json({ items: data.items, pagination: data.pagination });
  } catch (err) {
    console.error(`[GET /api/inventory/${id}/movements]`, err);
    return NextResponse.json({ error: "Failed to fetch movements" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Props) {
  const { locationId } = await params;

  try {
    const dto = (await req.json()) as CreateMovementDto;

    // TODO: replace with real session user ID
    const userId = 1;

    const result = await createMovement(dto, userId);
    // revalidateTag("inventory") is called inside createMovement — no need here

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save movement";
    console.error(`[POST /api/inventory/${locationId}/movements]`, err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
