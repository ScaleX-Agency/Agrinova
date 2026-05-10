import { NextResponse } from "next/server";
import { GINStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CreateGoodsIssueNoteRequestDto,
  CreateGoodsIssueNoteResponse,
  GinNumberAvailabilityResponse,
  GoodsIssueNotesResponse,
} from "@/types/api";
import { getCurrentUser } from "@/lib/auth";

const toPositiveInt = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(0, Math.trunc(numberValue));
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const invoiceIdParam = url.searchParams.get("invoiceId");
    const includeLines = url.searchParams.get("includeLines") === "true";
    const checkGinNo = url.searchParams.get("checkGinNo") === "true";
    const ginNumber = url.searchParams.get("ginNumber")?.trim();

    if (checkGinNo) {
      if (!ginNumber) {
        return NextResponse.json(
          { error: "GIN number is required." },
          { status: 400 },
        );
      }

      const existingGin = await prisma.goodsIssueNote.findFirst({
        where: {
          gin_number: ginNumber,
          is_active: true,
        },
        select: {
          gin_id: true,
        },
      });

      const responseBody: GinNumberAvailabilityResponse = {
        data: {
          ginNumber,
          isUnique: existingGin === null,
        },
      };

      return NextResponse.json(responseBody);
    }

    const invoiceId = invoiceIdParam ? Number(invoiceIdParam) : null;
    if (
      invoiceIdParam &&
      (!Number.isInteger(invoiceId) || (invoiceId ?? 0) <= 0)
    ) {
      return NextResponse.json(
        { error: "Invalid invoiceId filter." },
        { status: 400 },
      );
    }

    const notes = await prisma.goodsIssueNote.findMany({
      where: {
        is_active: true,
        ...(invoiceId ? { invoice_id: invoiceId } : {}),
      },
      orderBy: [{ gin_date: "desc" }, { gin_id: "desc" }],
      include: {
        invoice: {
          select: { invoice_id: true, invoice_number: true, gin_status: true },
        },
        customer: { select: { customer_id: true, name: true } },
        location: { select: { location_id: true, code: true } },
        lines: includeLines
          ? {
              select: {
                product_id: true,
                quantity: true,
              },
            }
          : false,
        _count: { select: { lines: true } },
      },
    });

    const responseBody: GoodsIssueNotesResponse = {
      data: notes.map((note) => ({
        id: note.gin_id,
        ginNumber: note.gin_number,
        date: note.gin_date.toISOString(),
        ginStatus: note.invoice?.gin_status ?? "PENDING",
        invoiceId: note.invoice?.invoice_id ?? null,
        invoiceNumber: note.invoice?.invoice_number ?? null,
        customerId: note.customer.customer_id,
        customerName: note.customer.name,
        locationId: note.location.location_id,
        locationCode: note.location.code,
        lineCount: note._count.lines,
        lines: includeLines
          ? note.lines.map((line) => ({
              productId: line.product_id,
              quantity: line.quantity,
            }))
          : undefined,
      })),
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Failed to load goods issue notes", error);
    return NextResponse.json(
      { error: "Failed to load goods issue notes." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateGoodsIssueNoteRequestDto;

    const ginNumber = body.ginNumber.trim();
    const invoiceId = toPositiveInt(body.invoiceId);
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const createdBy = currentUser.user_id;

    if (!ginNumber || !invoiceId || !createdBy) {
      return NextResponse.json(
        { error: "Missing required Goods Issue Note fields." },
        { status: 400 },
      );
    }

    if (!body.ginDate || Number.isNaN(new Date(body.ginDate).getTime())) {
      return NextResponse.json(
        { error: "Goods issue note date is invalid." },
        { status: 400 },
      );
    }

    const ginDate = new Date(body.ginDate);

    const createdGin = await prisma.$transaction(
      async (tx) => {
        const existingActiveGin = await tx.goodsIssueNote.findFirst({
          where: {
            gin_number: ginNumber,
            is_active: true,
          },
          select: {
            gin_id: true,
          },
        });

        if (existingActiveGin) {
          throw new Error(
            "An active GIN with this number already exists. Please use a unique GIN number.",
          );
        }

        const invoice = await tx.invoice.findUnique({
        where: { invoice_id: invoiceId },
        select: {
          invoice_id: true,
          customer_id: true,
          location_id: true,
          is_active: true,
          gin_status: true,
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
          goods_issue_notes: {
            where: { is_active: true },
            select: { gin_id: true },
          },
        },
      });

      if (!invoice) {
        throw new Error("Selected invoice not found.");
      }

      if (!invoice.is_active) {
        throw new Error("Selected invoice is not active.");
      }

      if (invoice.gin_status === GINStatus.ISSUED) {
        throw new Error("A GIN is already issued for this invoice.");
      }

      if (invoice.goods_issue_notes.length > 0) {
        throw new Error("An active GIN already exists for this invoice.");
      }

      if (invoice.invoice_lines.length === 0) {
        throw new Error("Selected invoice has no lines to issue.");
      }

      const ginLines = invoice.invoice_lines
        .map((line) => ({
          line_id: line.line_id,
          product_id: line.product_id,
          quantity: line.quantity + line.free_quantity,
          issued_qty: line.issued_qty,
          returned_qty: line.returned_qty,
        }))
        .filter((line) => line.quantity > 0);

      if (ginLines.length === 0) {
        throw new Error("Selected invoice has no issueable quantities.");
      }

      const productIssueTotals = ginLines.reduce<Map<number, number>>(
        (map, line) => {
          map.set(line.product_id, (map.get(line.product_id) ?? 0) + line.quantity);
          return map;
        },
        new Map(),
      );

      const stockRows = await tx.stock.findMany({
        where: {
          location_id: invoice.location_id,
          product_id: { in: Array.from(productIssueTotals.keys()) },
        },
        select: {
          stock_id: true,
          product_id: true,
          quantity_on_hand: true,
        },
      });

      const stockByProductId = new Map(stockRows.map((row) => [row.product_id, row]));

      for (const [productId, issueQty] of productIssueTotals.entries()) {
        const stock = stockByProductId.get(productId);
        if (!stock) {
          throw new Error(
            `Stock record not found for product ${productId} at selected location.`,
          );
        }
        if (stock.quantity_on_hand < issueQty) {
          throw new Error(
            `Insufficient stock for product ${productId}. Available: ${stock.quantity_on_hand}, Required: ${issueQty}.`,
          );
        }
      }

      const gin = await tx.goodsIssueNote.create({
        data: {
          gin_number: ginNumber,
          gin_date: ginDate,
          invoice_id: invoice.invoice_id,
          customer_id: invoice.customer_id,
          location_id: invoice.location_id,
          notes: body.notes?.trim() || null,
          created_by: createdBy,
          lines: {
            create: ginLines.map((line) => ({
              product_id: line.product_id,
              quantity: line.quantity,
            })),
          },
        },
        select: {
          gin_id: true,
          gin_number: true,
        },
      });

        await Promise.all(
          ginLines.map((line) => {
            const nextIssuedQty = line.issued_qty + line.quantity;
            const lineTotalQty = line.quantity;
            const nextBalanceQty = Math.max(
              0,
              lineTotalQty - nextIssuedQty + line.returned_qty,
            );

            return tx.invoiceLine.update({
              where: { line_id: line.line_id },
              data: {
                issued_qty: nextIssuedQty,
                balance_qty: nextBalanceQty,
              },
            });
          }),
        );

        await Promise.all(
          Array.from(productIssueTotals.entries()).map(([productId, issueQty]) => {
            const stock = stockByProductId.get(productId);
            if (!stock) {
              return Promise.resolve();
            }

            return tx.stock.update({
              where: { stock_id: stock.stock_id },
              data: {
                quantity_on_hand: { decrement: issueQty },
              },
            });
          }),
        );

        await Promise.all(
          Array.from(productIssueTotals.entries()).map(([productId, issueQty]) => {
            const stock = stockByProductId.get(productId);
            if (!stock) {
              return Promise.resolve();
            }

            return tx.stockMovement.create({
              data: {
                stock_id: stock.stock_id,
                product_id: productId,
                created_by: createdBy,
                movement_type: "ISSUE",
                quantity: issueQty,
                movement_date: ginDate,
              },
            });
          }),
        );

        await tx.invoice.update({
        where: { invoice_id: invoice.invoice_id },
        data: { gin_status: "ISSUED" },
      });

        return gin;
      },
      { timeout: 20000, maxWait: 10000 },
    );

    const responseBody: CreateGoodsIssueNoteResponse = {
      data: {
        success: true,
        ginId: createdGin.gin_id,
        ginNumber: createdGin.gin_number,
      },
    };

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const isStockValidationError =
        error.message.includes("invoice") ||
        error.message.includes("issueable") ||
        error.message.includes("Stock record not found") ||
        error.message.includes("Insufficient stock");

      if (isStockValidationError) {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }

      if (
        error.message.includes("unique GIN number") ||
        error.message.includes("active GIN with this number")
      ) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      (error.meta?.target as string[]).includes("gin_number")
    ) {
      return NextResponse.json(
        {
          error:
            "GIN number already exists. Please retry to generate the next number.",
        },
        { status: 409 },
      );
    }

    console.error("Create goods issue note failed", error);
    return NextResponse.json(
      { error: "Failed to create goods issue note." },
      { status: 500 },
    );
  }
}
