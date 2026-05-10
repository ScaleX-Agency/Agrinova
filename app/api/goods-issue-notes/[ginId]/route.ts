import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import type { GoodsIssueNoteDetailResponse } from "@/types/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ginId: string }> },
) {
  try {
    const ginId = Number((await params).ginId);
    if (!Number.isInteger(ginId) || ginId <= 0) {
      return NextResponse.json({ error: "Invalid ginId." }, { status: 400 });
    }

    const note = await prisma.goodsIssueNote.findUnique({
      where: { gin_id: ginId },
      include: {
        invoice: {
          select: {
            invoice_id: true,
            invoice_number: true,
          },
        },
        customer: {
          select: {
            customer_id: true,
            name: true,
          },
        },
        location: {
          select: {
            location_id: true,
            code: true,
            name: true,
          },
        },
        lines: {
          include: {
            product: {
              select: {
                product_id: true,
                product_name: true,
                pack_size: true,
                selling_price: true,
              },
            },
          },
          orderBy: { gin_line_id: "asc" },
        },
      },
    });

    if (!note || !note.is_active) {
      return NextResponse.json({ error: "Goods issue note not found." }, { status: 404 });
    }

    const responseBody: GoodsIssueNoteDetailResponse = {
      data: {
        id: note.gin_id,
        ginNumber: note.gin_number,
        date: note.gin_date.toISOString(),
        invoiceId: note.invoice?.invoice_id ?? null,
        invoiceNumber: note.invoice?.invoice_number ?? null,
        customerId: note.customer.customer_id,
        customerName: note.customer.name,
        locationId: note.location.location_id,
        locationCode: note.location.code,
        locationName: note.location.name,
        notes: note.notes,
        lines: note.lines.map((line) => {
          return {
            productId: line.product.product_id,
            productName: line.product.product_name,
            packSize: line.product.pack_size,
            quantity: line.quantity,
          };
        }),
      },
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Failed to load goods issue note", error);
    return NextResponse.json(
      { error: "Failed to load goods issue note." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ ginId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const ginId = Number((await params).ginId);
    if (!Number.isInteger(ginId) || ginId <= 0) {
      return NextResponse.json({ error: "Invalid ginId." }, { status: 400 });
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const gin = await tx.goodsIssueNote.findUnique({
        where: { gin_id: ginId },
        select: {
          gin_id: true,
          gin_number: true,
          gin_date: true,
          is_active: true,
          location_id: true,
          invoice_id: true,
          lines: {
            select: {
              product_id: true,
              quantity: true,
            },
          },
          invoice: {
            select: {
              invoice_id: true,
              invoice_lines: {
                select: {
                  line_id: true,
                  product_id: true,
                  quantity: true,
                  free_quantity: true,
                  issued_qty: true,
                  returned_qty: true,
                },
              },
              salesReturnNotes: {
                where: { is_active: true },
                select: { return_id: true },
              },
            },
          },
        },
      });

      if (!gin || !gin.is_active) {
        throw new Error("Goods issue note not found or already inactive.");
      }

      if (gin.invoice.salesReturnNotes.length > 0) {
        throw new Error("Cannot delete goods issue note while active sales returns exist for this invoice.");
      }

      const issuedByProduct = new Map<number, number>();
      for (const line of gin.lines) {
        issuedByProduct.set(
          line.product_id,
          (issuedByProduct.get(line.product_id) ?? 0) + line.quantity,
        );
      }

      const invoiceLineByProduct = new Map<number, (typeof gin.invoice.invoice_lines)[number][]>();
      for (const line of gin.invoice.invoice_lines) {
        const lines = invoiceLineByProduct.get(line.product_id) ?? [];
        lines.push(line);
        invoiceLineByProduct.set(line.product_id, lines);
      }

      const productIds = Array.from(issuedByProduct.keys());
      const stocks = productIds.length
        ? await tx.stock.findMany({
            where: {
              location_id: gin.location_id,
              product_id: { in: productIds },
            },
            select: {
              stock_id: true,
              product_id: true,
            },
          })
        : [];
      const stockByProduct = new Map(stocks.map((s) => [s.product_id, s]));

      for (const [productId, qty] of issuedByProduct.entries()) {
        const lineCandidates = invoiceLineByProduct.get(productId) ?? [];
        if (lineCandidates.length !== 1) {
          throw new Error(`Expected one invoice line for product ${productId}, found ${lineCandidates.length}.`);
        }
        if (lineCandidates[0].issued_qty < qty) {
          throw new Error(`Cannot reverse issued qty for product ${productId}.`);
        }
        if (!stockByProduct.get(productId)) {
          throw new Error(`Stock record not found for product ${productId}.`);
        }
      }

      for (const [productId, qty] of issuedByProduct.entries()) {
        const line = (invoiceLineByProduct.get(productId) ?? [])[0];
        const nextIssuedQty = line.issued_qty - qty;
        const lineTotalQty = line.quantity + line.free_quantity;
        const nextBalanceQty = Math.max(0, lineTotalQty - nextIssuedQty + line.returned_qty);

        await tx.invoiceLine.update({
          where: { line_id: line.line_id },
          data: {
            issued_qty: nextIssuedQty,
            balance_qty: nextBalanceQty,
          },
        });

        const stock = stockByProduct.get(productId)!;
        await tx.stock.update({
          where: { stock_id: stock.stock_id },
          data: {
            quantity_on_hand: { increment: qty },
          },
        });

        await tx.stockMovement.create({
          data: {
            stock_id: stock.stock_id,
            product_id: productId,
            created_by: currentUser.user_id,
            movement_type: "ISSUE_REVERSAL",
            quantity: qty,
            movement_date: new Date(),
          },
        });
      }

      await tx.goodsIssueNote.update({
        where: { gin_id: gin.gin_id },
        data: {
          is_active: false,
          deleted_by: currentUser.user_id,
        },
      });

      const remainingActiveGinCount = await tx.goodsIssueNote.count({
        where: {
          invoice_id: gin.invoice_id,
          is_active: true,
        },
      });
      await tx.invoice.update({
        where: { invoice_id: gin.invoice_id },
        data: {
          gin_status: remainingActiveGinCount > 0 ? "ISSUED" : "PENDING",
        },
      });

      return gin;
    });

    return NextResponse.json({
      data: {
        success: true,
        ginId: deleted.gin_id,
        ginNumber: deleted.gin_number,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete goods issue note.";
    const status =
      message.includes("not found") || message.includes("already inactive")
        ? 404
        : message.includes("Cannot") || message.includes("Expected one invoice line")
          ? 422
          : 500;
    console.error("Failed to delete goods issue note", error);
    return NextResponse.json({ error: message }, { status });
  }
}
