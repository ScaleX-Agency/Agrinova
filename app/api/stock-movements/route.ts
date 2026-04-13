// app/api/stock-movements/route.ts
// GET  — full movements log (all locations, latest 200)
// POST — record a new movement (used by dashboard modal + StockOverview modal)

import { NextResponse } from "next/server";
import { getAllMovements, createMovement } from "@/lib/inventoryService";
import type { CreateMovementDto } from "@/types/inventory";

export async function GET() {
  try {
    const movements = await getAllMovements();
    return NextResponse.json({ movements });
  } catch (err) {
    console.error("[GET /api/stock-movements]", err);
    return NextResponse.json({ error: "Failed to fetch movements" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const dto = (await req.json()) as CreateMovementDto;

    // TODO: replace with real session user ID from auth cookie/token
    const userId = 1;

    const result = await createMovement(dto, userId);
    // revalidateTag("inventory") fires inside createMovement automatically

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save movement";
    console.error("[POST /api/stock-movements]", err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
