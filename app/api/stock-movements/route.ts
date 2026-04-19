// app/api/stock-movements/route.ts
// GET  — full movements log (all locations, latest 200)
// POST — record a new movement (used by dashboard modal + StockOverview modal)

import { NextResponse } from "next/server";
import { getAllMovements, createMovement } from "@/lib/inventoryService";
import { getCurrentUser } from "@/lib/auth";
import type { CreateMovementDto } from "@/types/inventory";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const movement_type = searchParams.get("movement_type") || undefined;
    const search = searchParams.get("search") || undefined;
    const location_id = searchParams.get("location_id") ? parseInt(searchParams.get("location_id") as string, 10) : undefined;

    const data = await getAllMovements(page, pageSize, { movement_type, search, location_id });
    return NextResponse.json({ items: data.items, pagination: data.pagination });
  } catch (err) {
    console.error("[GET /api/stock-movements]", err);
    return NextResponse.json({ error: "Failed to fetch movements" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const dto = (await req.json()) as CreateMovementDto;

    if (!dto.stock_id || !dto.movement_type) {
      return NextResponse.json(
        { error: "stock_id and movement_type are required" },
        { status: 400 },
      );
    }

    if (
      dto.movement_type !== "ADJUSTMENT" &&
      (!Number.isInteger(dto.quantity) || dto.quantity <= 0)
    ) {
      return NextResponse.json(
        { error: "quantity must be a positive integer" },
        { status: 400 },
      );
    }

    if (
      dto.movement_type === "ADJUSTMENT" &&
      (!Number.isInteger(dto.resulting_quantity ?? dto.quantity) ||
        (dto.resulting_quantity ?? dto.quantity) < 0)
    ) {
      return NextResponse.json(
        {
          error:
            "For ADJUSTMENT, resulting_quantity must be a non-negative integer",
        },
        { status: 400 },
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.user_id;

    const result = await createMovement(dto, userId);
    // revalidateTag("inventory") fires inside createMovement automatically

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save movement";
    console.error("[POST /api/stock-movements]", err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
