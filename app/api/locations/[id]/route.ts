import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { z } from "zod";

const updateLocationSchema = z.object({
  code: z.string().min(1, "Code cannot be empty").optional(),
  name: z.string().min(1, "Name cannot be empty").optional(),
  address: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const { id } = await params;
    const locationId = Number(id);

    if (isNaN(locationId)) {
      return NextResponse.json({ error: "Invalid location ID" }, { status: 400 });
    }

    const body = await req.json();
    const parseResult = updateLocationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { code, name, address, status } = parseResult.data;

    // Block deactivation if there is active stock
    if (status === "INACTIVE") {
      const activeStock = await prisma.stock.count({ 
        where: { location_id: locationId, quantity_on_hand: { gt: 0 } } 
      });
      if (activeStock > 0) {
        return NextResponse.json({ error: "Cannot deactivate location with active stock. Please transfer or adjust stock to zero first." }, { status: 400 });
      }
    }

    if (code) {
      const existing = await prisma.inventoryLocation.findUnique({
        where: { code },
      });
      if (existing && existing.location_id !== locationId) {
        return NextResponse.json(
          { error: "Location code already in use" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.inventoryLocation.update({
      where: { location_id: locationId },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ data: updated });
  }   // eslint-disable-next-line
  catch (err: any) {
    console.error("[PATCH /api/locations/[id]]", err);
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}
