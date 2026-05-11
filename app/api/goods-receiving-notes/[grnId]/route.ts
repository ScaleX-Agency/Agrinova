import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
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

    if (!note || !note.is_active) {
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
        createdAt: note.created_at.toISOString(),
        updatedAt: note.updated_at.toISOString(),
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ grnId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 },
      );
    }

    const grnId = Number((await params).grnId);
    if (!Number.isInteger(grnId) || grnId <= 0) {
      return NextResponse.json({ error: "Invalid grnId." }, { status: 400 });
    }

    const deleted = await prisma.$transaction(
      async (tx) => {
        const grn = await tx.goodsReceivingNote.findUnique({
          where: { grn_id: grnId },
          select: {
            grn_id: true,
            grn_number: true,
            location_id: true,
            is_active: true,
            lines: {
              select: {
                product_id: true,
                quantity: true,
              },
            },
          },
        });

        if (!grn || !grn.is_active) {
          throw new Error("Goods receiving note not found or already inactive.");
        }

        const receivedByProduct = new Map<number, number>();
        for (const line of grn.lines) {
          receivedByProduct.set(
            line.product_id,
            (receivedByProduct.get(line.product_id) ?? 0) + line.quantity,
          );
        }

        const productIds = Array.from(receivedByProduct.keys());
        const stocks = productIds.length
          ? await tx.stock.findMany({
              where: {
                location_id: grn.location_id,
                product_id: { in: productIds },
              },
              select: {
                stock_id: true,
                product_id: true,
                quantity_on_hand: true,
              },
            })
          : [];
        const stockByProduct = new Map(stocks.map((row) => [row.product_id, row]));

        for (const [productId, qty] of receivedByProduct.entries()) {
          const stock = stockByProduct.get(productId);
          if (!stock) {
            throw new Error(
              `Stock record not found for product ${productId} at this location.`,
            );
          }
          if (stock.quantity_on_hand < qty) {
            throw new Error(
              `Cannot delete GRN because stock would go negative for product ${productId}.`,
            );
          }
        }

        const now = new Date();

        for (const [productId, qty] of receivedByProduct.entries()) {
          const stock = stockByProduct.get(productId)!;

          await tx.stock.update({
            where: { stock_id: stock.stock_id },
            data: {
              quantity_on_hand: { decrement: qty },
            },
          });

          await tx.stockMovement.create({
            data: {
              stock_id: stock.stock_id,
              product_id: productId,
              created_by: currentUser.user_id,
              movement_type: "PURCHASE_REVERSAL",
              quantity: qty,
              movement_date: now,
            },
          });
        }

        await tx.goodsReceivingNote.update({
          where: { grn_id: grn.grn_id },
          data: {
            is_active: false,
            deleted_by: currentUser.user_id,
          },
        });

        return grn;
      },
      { timeout: 20000, maxWait: 10000 },
    );

    revalidateTag("inventory", "max");

    return NextResponse.json({
      data: {
        success: true,
        grnId: deleted.grn_id,
        grnNumber: deleted.grn_number,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete goods receiving note.";
    const status =
      message.includes("not found") || message.includes("already inactive")
        ? 404
        : message.includes("Forbidden")
          ? 403
          : message.includes("Unauthorized")
            ? 401
            : message.includes("Cannot delete GRN") ||
                message.includes("Stock record not found")
              ? 422
              : 500;
    console.error("Failed to delete goods receiving note", error);
    return NextResponse.json({ error: message }, { status });
  }
}
