import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { z } from "zod";

const updateLocationSchema = z.object({
  code: z.string().min(1, "Code cannot be empty").optional(),
  name: z.string().min(1, "Name cannot be empty").optional(),
  address: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const locationId = Number(id);

    if (isNaN(locationId)) {
      return NextResponse.json({ error: "Invalid location ID" }, { status: 400 });
    }

    // Check for dependent records sequentially to prevent Prisma adapter connection collisions
    const stocks = await prisma.stock.count({ where: { location_id: locationId } });
    const invoices = await prisma.invoice.count({ where: { location_id: locationId } });
    const goodsIssues = await prisma.goodsIssueNote.count({ where: { location_id: locationId } });
    const goodsReceiving = await prisma.goodsReceivingNote.count({ where: { location_id: locationId } });

    if (stocks > 0 || invoices > 0 || goodsIssues > 0 || goodsReceiving > 0) {
      const activeStock = await prisma.stock.count({ where: { location_id: locationId, quantity_on_hand: { gt: 0 } } });
      if (activeStock > 0) {
        return NextResponse.json({ error: "Cannot delete location with active stock." }, { status: 400 });
      }

      // Soft delete
      const updated = await prisma.inventoryLocation.update({
        where: { location_id: locationId },
        data: { status: "INACTIVE" },
      });
      return NextResponse.json({ data: updated, softDeleted: true });
    }

    // Hard delete
    await prisma.inventoryLocation.delete({
      where: { location_id: locationId },
    });

    return NextResponse.json({ success: true, deleted: true });
  } // eslint-disable-next-line
  catch (err: any) {
    console.error("[DELETE /api/locations/[id]]", err);
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete location" }, { status: 500 });
  }
}
