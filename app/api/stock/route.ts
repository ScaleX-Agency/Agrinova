// src/api/stock/route.ts
// GET  /api/stock  — All stock entries
// POST /api/stock  — New Stock Entry (Local Purchase / Foreign Import)

import { NextRequest, NextResponse } from "next/server";
import { getAllStock, createStockEntry } from "@/lib/inventoryService";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const data = await getAllStock();
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load stock.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (
      !body.entry_type ||
      !body.location_id ||
      !body.date ||
      !body.items?.length
    ) {
      return NextResponse.json(
        { error: "entry_type, location_id, date, and items[] are required" },
        { status: 400 },
      );
    }

    if (!["LOCAL_PURCHASE", "FOREIGN_IMPORT"].includes(body.entry_type)) {
      return NextResponse.json(
        { error: "entry_type must be LOCAL_PURCHASE or FOREIGN_IMPORT" },
        { status: 400 },
      );
    }

    // Validate items
    for (const item of body.items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Each item needs product_id and quantity > 0" },
          { status: 400 },
        );
      }
      if (item.unit_price == null || Number(item.unit_price) < 0) {
        item.unit_price = 0;
      }
    }

    const data = await createStockEntry(body, currentUser.user_id);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    console.error("[POST /api/stock] Error:", err);
    const msg = err instanceof Error ? err.message : "Failed to create stock entry";
    
    let status = 400;
    if (msg.includes("already exists") || msg.includes("unique GRN")) {
      status = 409;
    }

    return NextResponse.json({ error: msg }, { status });
  }
}

