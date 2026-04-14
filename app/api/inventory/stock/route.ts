import { NextResponse } from "next/server";
import { createStockEntry } from "@/lib/inventoryService";
import type { CreateStockEntryDto } from "@/types/inventory";

export async function POST(req: Request) {
  try {
    const dto = (await req.json()) as CreateStockEntryDto;

    // TODO: replace with real session user ID from auth cookie/token
    const userId = 1;

    const result = await createStockEntry(dto, userId);
    // revalidateTag("inventory") fires inside createStockEntry automatically

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create stock entry";
    console.error("[POST /api/inventory/stock]", err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
