import { NextResponse } from "next/server";
import { createStockEntry } from "@/lib/inventoryService";
import type { CreateStockEntryDto } from "@/types/inventory";

type LegacyCreateStockEntryDto = {
  product_id: number;
  location_id: number;
  quantity: number;
  unit_price?: number;
  notes?: string | null;
  reference_no?: string | null;
};

const normalizePayload = (
  body: CreateStockEntryDto | LegacyCreateStockEntryDto,
): CreateStockEntryDto => {
  if (Array.isArray((body as CreateStockEntryDto).items)) {
    return body as CreateStockEntryDto;
  }

  const legacy = body as LegacyCreateStockEntryDto;

  return {
    entry_type: "LOCAL_PURCHASE",
    date: new Date().toISOString(),
    location_id: legacy.location_id,
    reference_no: legacy.reference_no ?? null,
    notes: legacy.notes ?? null,
    items: [
      {
        product_id: legacy.product_id,
        quantity: legacy.quantity,
        unit_price: Number(legacy.unit_price ?? 0),
      },
    ],
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as
      | CreateStockEntryDto
      | LegacyCreateStockEntryDto;
    const dto = normalizePayload(body);

    // TODO: replace with real session user ID from auth cookie/token
    const userId = 1;

    const result = await createStockEntry(dto, userId);
    // revalidateTag("inventory") fires inside createStockEntry automatically

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to create stock entry";
    console.error("[POST /api/inventory/stock]", err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
