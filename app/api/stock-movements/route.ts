// src/api/stock-movements/route.ts
// GET  /api/stock-movements  — Full movement log (all locations)
// POST /api/stock-movements  — Record a movement (shorthand, also works without locationId)

import { NextRequest, NextResponse } from "next/server";
import { getAllMovements, createMovement } from "@/lib/inventoryService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId")
      ? parseInt(searchParams.get("locationId")!)
      : undefined;

    const data = await getAllMovements(locationId);
    return NextResponse.json({ data });
  } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = 1; // replace with session user id
    const body = await req.json();

    if (!body.stock_id || !body.product_id || !body.movement_type || !body.quantity) {
      return NextResponse.json(
        { error: "stock_id, product_id, movement_type, and quantity are required" },
        { status: 400 }
      );
    }

    const data = await createMovement(body, userId);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    const status = err.message.includes("Insufficient") ? 422 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
