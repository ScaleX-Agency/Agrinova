import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { GoodsReceivingNotesResponse } from "@/types/api";

export async function GET() {
  try {
    const notes = await prisma.goodsReceivingNote.findMany({
      orderBy: [{ grn_date: "desc" }, { grn_id: "desc" }],
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
          },
        },
        _count: {
          select: {
            lines: true,
          },
        },
      },
    });

    const responseBody: GoodsReceivingNotesResponse = {
      data: notes.map((note) => ({
        id: note.grn_id,
        grnNumber: note.grn_number,
        date: note.grn_date.toISOString(),
        entryType: note.entry_type,
        locationId: note.location.location_id,
        locationCode: note.location.code,
        locationName: note.location.name,
        referenceNo: note.reference_no,
        notes: note.notes,
        lineCount: note._count.lines,
        createdByUserId: note.creator.user_id,
        createdByName: note.creator.full_name,
        createdAt: note.created_at.toISOString(),
        updatedAt: note.updated_at.toISOString(),
      })),
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Failed to load goods receiving notes", error);
    return NextResponse.json(
      { error: "Failed to load goods receiving notes." },
      { status: 500 },
    );
  }
}
