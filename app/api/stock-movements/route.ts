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

import { z } from "zod";

const createMovementSchema = z.object({
  stock_id: z.number().int().positive(),
  movement_type: z.enum(["ISSUE", "RETURN", "PURCHASE", "ADJUSTMENT"]),
  quantity: z.number().int().optional(),
  resulting_quantity: z.number().int().nonnegative().optional(),
  movement_date: z.string().datetime().optional(),
  notes: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.movement_type !== "ADJUSTMENT") {
    if (data.quantity === undefined || data.quantity <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quantity must be a positive integer for this movement type",
        path: ["quantity"]
      });
    }
  } else {
    // For ADJUSTMENT
    if (data.resulting_quantity === undefined && data.quantity === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "For ADJUSTMENT, resulting_quantity or a relative quantity must be provided",
        path: ["resulting_quantity"]
      });
    }
  }
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = createMovementSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    
    const dto = parseResult.data as CreateMovementDto;

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
