// app/api/inventory/[locationId]/movements/route.ts
// GET  — movements for a location
// POST — record a new movement for a stock item at this location

import { NextResponse } from "next/server";
import { getMovementsByLocation, createMovement } from "@/lib/inventoryService";
import { getCurrentUser } from "@/lib/auth";
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

    const data = await getMovementsByLocation(id, page, pageSize, {
      movement_type,
      search,
    });

    return NextResponse.json({
      items: data.items,
      pagination: data.pagination,
    });
  } catch (err) {
    console.error(`[GET /api/inventory/${id}/movements]`, err);
    return NextResponse.json({ error: "Failed to fetch movements" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Props) {
  const { locationId } = await params;
  const id = Number(locationId);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid locationId" }, { status: 400 });
  }

  try {
    const dto = (await req.json()) as CreateMovementDto;

    // basic validation
    if (
      !dto.stock_id ||
      !dto.movement_type ||
      (typeof dto.quantity !== "number" &&
        typeof dto.resulting_quantity !== "number")
    ) {
      return NextResponse.json(
        {
          error:
            "stock_id, movement_type, and quantity (or resulting_quantity for ADJUSTMENT) are required",
        },
        { status: 400 }
      );
    }

    if (
      ![
        "ISSUE",
        "RETURN",
        "RETURN_UNUSABLE",
        "PURCHASE",
        "ADJUSTMENT",
        "ISSUE_REVERSAL",
        "RETURN_REVERSAL",
        "PURCHASE_REVERSAL",
        "RETURN_UNUSABLE_REVERSAL",
      ].includes(dto.movement_type)
    ) {
      return NextResponse.json(
        { error: "Invalid movement_type." },
        { status: 400 }
      );
    }

    if (
      dto.movement_type !== "ADJUSTMENT" &&
      (!Number.isInteger(dto.quantity) || dto.quantity <= 0)
    ) {
      return NextResponse.json(
        { error: "quantity must be greater than 0" },
        { status: 400 }
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
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.user_id;

    const result = await createMovement(dto, userId);
    // revalidateTag("inventory") should be handled in service/route flow if already implemented

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save movement";
    const status =
      err instanceof Error && err.message.includes("Insufficient") ? 422 : 400;

    console.error(`[POST /api/inventory/${locationId}/movements]`, err);
    return NextResponse.json({ error: msg }, { status });
  }
}
