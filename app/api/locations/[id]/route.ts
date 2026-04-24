import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { code, name, address, status } = body;

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

    // Check for dependent records
    const [stocks, invoices, goodsIssues, goodsReceiving] = await Promise.all([
      prisma.stock.count({ where: { location_id: locationId } }),
      prisma.invoice.count({ where: { location_id: locationId } }),
      prisma.goodsIssueNote.count({ where: { location_id: locationId } }),
      prisma.goodsReceivingNote.count({ where: { location_id: locationId } }),
    ]);

    if (stocks > 0 || invoices > 0 || goodsIssues > 0 || goodsReceiving > 0) {
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
