// src/api/stock/route.ts
// GET  /api/stock  — All stock entries
// POST /api/stock  — New Stock Entry (Local Purchase / Foreign Import)

import { NextRequest, NextResponse } from "next/server";
import { getAllStock, createStockEntry } from "../../lib/inventoryService";

export async function GET() {
  try {
    const data = await getAllStock();
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = 1; // replace with session user id
    const body = await req.json();

    if (!body.entry_type || !body.location_id || !body.date || !body.items?.length) {
      return NextResponse.json(
        { error: "entry_type, location_id, date, and items[] are required" },
        { status: 400 }
      );
    }

    if (!["LOCAL_PURCHASE", "FOREIGN_IMPORT"].includes(body.entry_type)) {
      return NextResponse.json(
        { error: "entry_type must be LOCAL_PURCHASE or FOREIGN_IMPORT" },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of body.items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Each item needs product_id and quantity > 0" },
          { status: 400 }
        );
      }
    }

    const data = await createStockEntry(body, userId);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
