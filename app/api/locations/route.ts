import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const locations = await prisma.inventoryLocation.findMany({ orderBy: { location_id: "asc" } });
    return NextResponse.json({ locations });
  } catch (err) {
    console.error("[GET /api/locations]", err);
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}
