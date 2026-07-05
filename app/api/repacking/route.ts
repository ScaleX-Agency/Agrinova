import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createProductRepack, getProductRepacks } from "@/lib/repackService";
import type { ProductRepacksResponse } from "@/types/api";

const createProductRepackSchema = z.object({
  repack_date: z.string().min(1),
  location_id: z.number().int().positive(),
  source_product_id: z.number().int().positive(),
  source_quantity: z.number().int().positive(),
  target_product_id: z.number().int().positive(),
  target_quantity: z.number().int().positive(),
  notes: z.string().optional().nullable(),
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
    const location_id = searchParams.get("locationId") ? parseInt(searchParams.get("locationId") as string, 10) : undefined;
    const range = searchParams.get("range");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const search = searchParams.get("search") || undefined;

    let startDate: string | undefined;
    let endDate: string | undefined;

    if (range && range !== "all") {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;

      if (range === "day") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (range === "week") {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      } else if (range === "month") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else if (range === "year") {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
      } else if (range === "custom") {
        start = startDateParam ? new Date(startDateParam) : null;
        end = endDateParam ? new Date(endDateParam) : null;
      }

      if (start) {
        startDate = start.toISOString().split("T")[0];
      }
      if (end) {
        endDate = end.toISOString().split("T")[0];
      }
    } else {
      if (startDateParam) startDate = startDateParam;
      if (endDateParam) endDate = endDateParam;
    }

    const result = await getProductRepacks(page, pageSize, {
      location_id,
      startDate,
      endDate,
      search,
    });

    const payload: ProductRepacksResponse = {
      data: result.items.map((row) => ({
        id: row.repack_id,
        repackNo: row.repack_number,
        repackDate: row.repack_date,
        locationId: row.location_id,
        locationCode: row.location_code,
        locationName: row.location_name,
        sourceProductId: row.source_product_id,
        sourceProductCode: row.source_product_code,
        sourceProductName: row.source_product_name,
        sourceQuantity: row.source_quantity,
        targetProductId: row.target_product_id,
        targetProductCode: row.target_product_code,
        targetProductName: row.target_product_name,
        targetQuantity: row.target_quantity,
        notes: row.notes,
        createdByName: row.created_by_name,
      })),
      pagination: result.pagination,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[GET /api/repacking] Error:", err);
    return NextResponse.json({ error: "Failed to load repacking documents." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createProductRepackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input parameters." }, { status: 400 });
    }

    const repack = await createProductRepack(parsed.data, user.user_id);
    return NextResponse.json({
      data: {
        success: true,
        repackId: repack.repack_id,
        repackNumber: repack.repack_number,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/repacking] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to create repacking document.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
