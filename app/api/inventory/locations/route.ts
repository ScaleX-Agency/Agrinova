import { NextResponse } from "next/server";
import { getLocationSummaries } from "@/lib/inventoryService";
import type { InventoryLocationsResponse } from "@/types/api";

export async function GET() {
  try {
    const locations = await getLocationSummaries();
    const responseBody: InventoryLocationsResponse = {
      data: locations.map((location) => ({
        id: location.location_id,
        code: location.code,
        label: location.name,
      })),
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Failed to load inventory locations", error);
    return NextResponse.json(
      { error: "Failed to load inventory locations." },
      { status: 500 },
    );
  }
}
