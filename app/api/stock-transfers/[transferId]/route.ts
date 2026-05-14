import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ transferId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const transferId = Number((await params).transferId);
    if (!Number.isInteger(transferId) || transferId <= 0) {
      return NextResponse.json({ error: "Invalid transferId." }, { status: 400 });
    }

    const deletedTransfer = await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { transfer_id: transferId },
        select: {
          transfer_id: true,
          transfer_no: true,
          transfer_date: true,
          from_location_id: true,
          to_location_id: true,
          is_active: true,
          from_location: { select: { code: true } },
          to_location: { select: { code: true } },
          lines: {
            select: {
              product_id: true,
              quantity: true,
            },
          },
        },
      });

      if (!transfer || !transfer.is_active) {
        throw new Error("Stock transfer not found or already inactive.");
      }

      const transferQtyByProduct = new Map<number, number>();
      for (const line of transfer.lines) {
        transferQtyByProduct.set(
          line.product_id,
          (transferQtyByProduct.get(line.product_id) ?? 0) + line.quantity,
        );
      }

      const productIds = Array.from(transferQtyByProduct.keys());

      const [sourceStocks, destinationStocks] = await Promise.all([
        tx.stock.findMany({
          where: {
            location_id: transfer.from_location_id,
            product_id: { in: productIds },
          },
          select: {
            stock_id: true,
            product_id: true,
          },
        }),
        tx.stock.findMany({
          where: {
            location_id: transfer.to_location_id,
            product_id: { in: productIds },
          },
          select: {
            stock_id: true,
            product_id: true,
            quantity_on_hand: true,
          },
        }),
      ]);

      const sourceStockByProduct = new Map(sourceStocks.map((stock) => [stock.product_id, stock]));
      const destinationStockByProduct = new Map(
        destinationStocks.map((stock) => [stock.product_id, stock]),
      );

      for (const [productId, quantity] of transferQtyByProduct.entries()) {
        const sourceStock = sourceStockByProduct.get(productId);
        if (!sourceStock) {
          throw new Error(`Source stock missing for product ${productId}.`);
        }

        const destinationStock = destinationStockByProduct.get(productId);
        if (!destinationStock || destinationStock.quantity_on_hand < quantity) {
          throw new Error(
            `Cannot delete transfer ${transfer.transfer_no}: destination stock is insufficient for product ${productId}.`,
          );
        }
      }

      for (const [productId, quantity] of transferQtyByProduct.entries()) {
        const sourceStock = sourceStockByProduct.get(productId)!;
        const destinationStock = destinationStockByProduct.get(productId)!;

        await tx.stock.update({
          where: { stock_id: sourceStock.stock_id },
          data: {
            quantity_on_hand: { increment: quantity },
          },
        });

        await tx.stock.update({
          where: { stock_id: destinationStock.stock_id },
          data: {
            quantity_on_hand: { decrement: quantity },
          },
        });

      }

      await tx.stockTransfer.update({
        where: { transfer_id: transfer.transfer_id },
        data: {
          is_active: false,
          deleted_by: currentUser.user_id,
        },
      });

      return {
        transfer_id: transfer.transfer_id,
        transfer_no: transfer.transfer_no,
      };
    });

    revalidateTag("inventory", "max");
    revalidateTag("summaries", "max");

    return NextResponse.json({
      data: {
        success: true,
        transferId: deletedTransfer.transfer_id,
        transferNo: deletedTransfer.transfer_no,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete stock transfer.";
    const status =
      message.includes("not found") || message.includes("inactive")
        ? 404
        : message.includes("insufficient") || message.includes("missing")
          ? 422
          : 500;
    console.error("Failed to delete stock transfer", error);
    return NextResponse.json({ error: message }, { status });
  }
}

