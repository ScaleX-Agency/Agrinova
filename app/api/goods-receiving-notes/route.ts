import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { GoodsReceivingNotesResponse } from "@/types/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let dateFilter: Prisma.DateTimeFilter | undefined;
    if (range && range !== "all") {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;

      if (range === "day") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (range === "week") {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
      } else if (range === "month") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else if (range === "year") {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear() + 1, 0, 1);
      } else if (range === "custom") {
        start = startDateParam ? new Date(startDateParam) : null;
        if (endDateParam) {
          const endDate = new Date(endDateParam);
          end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
        }
      }

      if (start || end) {
        dateFilter = {};
        if (start) dateFilter.gte = start;
        if (end) dateFilter.lt = end;
      }
    } else if (startDateParam || endDateParam) {
      dateFilter = {};
      if (startDateParam) dateFilter.gte = new Date(startDateParam);
      if (endDateParam) {
        const end = new Date(endDateParam);
        dateFilter.lt = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
      }
    }

    const notes = await prisma.goodsReceivingNote.findMany({
      where: {
        is_active: true,
        ...(dateFilter ? { grn_date: dateFilter } : {}),
      },
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
