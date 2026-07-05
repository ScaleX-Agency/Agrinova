import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createStockTransfer, getStockTransfers } from "@/lib/inventoryService";
import type { CreateStockTransferDto } from "@/types/inventory";
import type { StockTransfersResponse } from "@/types/api";

const createStockTransferSchema = z.object({
  transfer_date: z.string().min(1),
  from_location_id: z.number().int().positive(),
  to_location_id: z.number().int().positive(),
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const range = searchParams.get("range");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim() || "";

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

    const result = await getStockTransfers(page, pageSize, { dateFilter, search });

    const payload: StockTransfersResponse = {
      data: result.items.map((row) => ({
        id: row.transfer_id,
        transferNo: row.transfer_no,
        transferDate: row.transfer_date,
        fromLocationId: row.from_location_id,
        fromLocationCode: row.from_location_code,
        fromLocationName: row.from_location_name,
        toLocationId: row.to_location_id,
        toLocationCode: row.to_location_code,
        toLocationName: row.to_location_name,
        lineCount: row.line_count,
        totalQty: row.total_qty,
        notes: row.notes,
        createdByName: row.created_by_name,
      })),
    };

    return NextResponse.json({
      ...payload,
      items: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("[GET /api/stock-transfers]", error);
    return NextResponse.json({ error: "Failed to fetch stock transfers." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createStockTransferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid transfer payload." },
        { status: 400 },
      );
    }

    const dto = parsed.data as CreateStockTransferDto;
    const transfer = await createStockTransfer(dto, user.user_id);
    return NextResponse.json({ data: transfer }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create stock transfer.";
    console.error("[POST /api/stock-transfers]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
