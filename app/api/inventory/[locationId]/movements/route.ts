// src/api/inventory/[locationId]/movements/route.ts
// GET  /api/inventory/[locationId]/movements — Movement log for location
// POST /api/inventory/[locationId]/movements — New issue / return / adjustment

import { NextRequest, NextResponse } from "next/server";
import { getAllMovements, createMovement } from "@/lib/inventoryService";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const locationId = parseInt((await params).locationId);
    const data = await getAllMovements(locationId);
    return NextResponse.json({ data });
  } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    // In production: get userId from session/JWT
    // const session = await getServerSession();
    // const userId = session.user.id;
    const userId = 1; // placeholder

    const body = await req.json();

    // Basic validation
    if (!body.stock_id || !body.product_id || !body.movement_type || !body.quantity) {
      return NextResponse.json(
        { error: "stock_id, product_id, movement_type, and quantity are required" },
        { status: 400 }
      );
    }

    if (!["ISSUE", "RETURN", "ADJUSTMENT"].includes(body.movement_type)) {
      return NextResponse.json(
        { error: "movement_type must be ISSUE, RETURN, or ADJUSTMENT" },
        { status: 400 }
      );
    }

    // Business rule: RETURN requires manager/admin role
    // if (body.movement_type === "RETURN" && session.user.role !== "admin") {
    //   return NextResponse.json({ error: "Returns require admin approval" }, { status: 403 });
    // }

    const data = await createMovement(body, userId);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    const status = err.message.includes("Insufficient") ? 422 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
