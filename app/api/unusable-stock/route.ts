import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { UnusableStockSummaryResponse } from "@/types/api";

export async function GET() {
  try {
    const grouped = await prisma.unusableStockMovement.groupBy({
      by: ["product_id", "location_id"],
      _sum: { quantity: true },
      where: {
        movement_type: "RETURN_UNUSABLE",
      },
    });

    const rows = await Promise.all(
      grouped
        .filter((group) => (group._sum.quantity ?? 0) > 0)
        .map(async (group) => {
          const [product, location] = await Promise.all([
            prisma.product.findUnique({
              where: { product_id: group.product_id },
              select: { product_code: true, product_name: true },
            }),
            prisma.inventoryLocation.findUnique({
              where: { location_id: group.location_id },
              select: { code: true },
            }),
          ]);

          return {
            product_id: group.product_id,
            location_id: group.location_id,
            quantity_on_hand: group._sum.quantity ?? 0,
            product,
            location,
          };
        }),
    );

    const payload: UnusableStockSummaryResponse = {
      data: {
        totalUnusableQty: rows.reduce(
          (sum, row) => sum + row.quantity_on_hand,
          0,
        ),
        rows: rows
          .filter((row) => row.product && row.location)
          .sort((a, b) => b.quantity_on_hand - a.quantity_on_hand)
          .map((row) => ({
          productId: row.product_id,
          productCode: row.product!.product_code,
          productName: row.product!.product_name,
          locationId: row.location_id,
          locationCode: row.location!.code,
          quantityOnHand: row.quantity_on_hand,
        })),
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to load unusable stock summary", error);
    return NextResponse.json(
      { error: "Failed to load unusable stock summary." },
      { status: 500 },
    );
  }
}
