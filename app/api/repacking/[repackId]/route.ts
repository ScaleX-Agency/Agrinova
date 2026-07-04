import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { deleteProductRepack, getProductRepackById } from "@/lib/repackService";
import type { ProductRepackDetailResponse } from "@/types/api";

interface Props {
  params: Promise<{ repackId: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repackId } = await params;
    const id = Number(repackId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid repackId." }, { status: 400 });
    }

    const repack = await getProductRepackById(id);
    if (!repack) {
      return NextResponse.json({ error: "Product repacking document not found." }, { status: 404 });
    }

    const payload: ProductRepackDetailResponse = {
      data: {
        id: repack.repack_id,
        repackNo: repack.repack_number,
        repackDate: repack.repack_date,
        locationId: repack.location_id,
        locationCode: repack.location_code,
        locationName: repack.location_name,
        sourceProductId: repack.source_product_id,
        sourceProductCode: repack.source_product_code,
        sourceProductName: repack.source_product_name,
        sourceQuantity: repack.source_quantity,
        targetProductId: repack.target_product_id,
        targetProductCode: repack.target_product_code,
        targetProductName: repack.target_product_name,
        targetQuantity: repack.target_quantity,
        notes: repack.notes,
        createdByName: repack.created_by_name,
      },
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[GET /api/repacking/[repackId]] Error:", err);
    return NextResponse.json({ error: "Failed to load repacking document details." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Props) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const { repackId } = await params;
    const id = Number(repackId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid repackId." }, { status: 400 });
    }

    const deleted = await deleteProductRepack(id, user.user_id);
    return NextResponse.json({
      data: {
        success: true,
        repackId: deleted.repack_id,
        repackNumber: deleted.repack_number,
      },
    });
  } catch (err) {
    console.error("[DELETE /api/repacking/[repackId]] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to delete repacking document.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
