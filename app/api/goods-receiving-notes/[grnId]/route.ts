import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { GoodsReceivingNoteDetailResponse } from "@/types/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ grnId: string }> },
) {
  try {
    const grnId = Number((await params).grnId);
    if (!Number.isInteger(grnId) || grnId <= 0) {
      return NextResponse.json({ error: "Invalid grnId." }, { status: 400 });
    }

    const note = await prisma.goodsReceivingNote.findUnique({
      where: { grn_id: grnId },
      include: {
        location: {
          select: {
            location_id: true,
            code: true,
            name: true,
          },
        },
        creator: {
          select: {
            user_id: true,
            full_name: true,
            username: true,
          },
        },
        lines: {
          include: {
            product: {
              select: {
                product_id: true,
                product_code: true,
                product_name: true,
                pack_size: true,
              },
            },
          },
          orderBy: { grn_line_id: "asc" },
        },
      },
    });

    if (!note) {
      return NextResponse.json(
        { error: "Goods receiving note not found." },
        { status: 404 },
      );
    }

    const responseBody: GoodsReceivingNoteDetailResponse = {
      data: {
        id: note.grn_id,
        grnNumber: note.grn_number,
        date: note.grn_date.toISOString(),
        entryType: note.entry_type,
        locationId: note.location.location_id,
        locationCode: note.location.code,
        locationName: note.location.name,
        referenceNo: note.reference_no,
        notes: note.notes,
        createdByUserId: note.creator.user_id,
        createdByName: note.creator.full_name,
        createdByUsername: note.creator.username,
        lines: note.lines.map((line) => ({
          lineId: line.grn_line_id,
          productId: line.product.product_id,
          productCode: line.product.product_code,
          productName: line.product.product_name,
          packSize: line.product.pack_size,
          quantity: line.quantity,
        })),
      },
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Failed to load goods receiving note", error);
    return NextResponse.json(
      { error: "Failed to load goods receiving note." },
      { status: 500 },
    );
  }
}
