import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createStockTransfer, getStockTransfers } from "@/lib/inventoryService";
import type { CreateStockTransferDto } from "@/types/inventory";

const createStockTransferSchema = z.object({
  transfer_date: z.string().min(1),
  from_location_id: z.number().int().positive(),
  to_location_id: z.number().int().positive(),
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const data = await getStockTransfers(page, pageSize);
    return NextResponse.json({ items: data.items, pagination: data.pagination });
  } catch (error) {
    console.error("[GET /api/stock-transfers]", error);
    return NextResponse.json({ error: "Failed to fetch stock transfers." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createStockTransferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid transfer payload." },
        { status: 400 },
      );
    }

    const dto = parsed.data as CreateStockTransferDto;
    const transfer = await createStockTransfer(dto, user.user_id);
    return NextResponse.json({ data: transfer }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create stock transfer.";
    console.error("[POST /api/stock-transfers]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
