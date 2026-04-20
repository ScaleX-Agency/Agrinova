import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { InventoryLocationsResponse } from "@/types/api";

export async function GET() {
  try {
    const locations = await prisma.inventoryLocation.findMany({
      orderBy: { location_id: "asc" },
    });

    const data: InventoryLocationsResponse = {
      data: locations.map((loc) => ({
        id: loc.location_id,
        code: loc.code,
        label: `${loc.code} — ${loc.name}`,
      })),
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/locations]", err);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 },
    );
  }
}
