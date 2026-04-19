import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CreateGoodsIssueNoteRequestDto,
  CreateGoodsIssueNoteResponse,
  GoodsIssueNotesResponse,
} from "@/types/api";

const toPositiveInt = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(0, Math.trunc(numberValue));
};

const getNextGinNumber = async (tx: Prisma.TransactionClient, ginDate: Date) => {
  const year = ginDate.getFullYear();
  const month = String(ginDate.getMonth() + 1).padStart(2, "0");
  const prefix = `GIN-${year}${month}-`;

  const latest = await tx.goodsIssueNote.findFirst({
    where: {
      gin_number: {
        startsWith: prefix,
      },
    },
    orderBy: {
      gin_number: "desc",
    },
    select: {
      gin_number: true,
    },
  });

  const latestSequence = latest
    ? Number(latest.gin_number.split("-").at(-1) ?? "0")
    : 0;
  return `${prefix}${String((Number.isFinite(latestSequence) ? latestSequence : 0) + 1).padStart(3, "0")}`;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const invoiceIdParam = url.searchParams.get("invoiceId");
    const includeLines = url.searchParams.get("includeLines") === "true";

    const invoiceId = invoiceIdParam ? Number(invoiceIdParam) : null;
    if (invoiceIdParam && (!Number.isInteger(invoiceId) || (invoiceId ?? 0) <= 0)) {
      return NextResponse.json({ error: "Invalid invoiceId filter." }, { status: 400 });
    }

    const notes = await prisma.goodsIssueNote.findMany({
      where: invoiceId ? { invoice_id: invoiceId } : undefined,
      orderBy: [{ gin_date: "desc" }, { gin_id: "desc" }],
      include: {
        invoice: { select: { invoice_id: true, invoice_number: true, gin_status: true } },
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
    const locationId = toPositiveInt(body.locationId);
    const createdBy = toPositiveInt(body.createdBy, 1);
    const lines = Array.isArray(body.lines) ? body.lines : [];

    if (!ginNumber || !invoiceId || !locationId || !createdBy) {
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

    if (!body.preparedBy?.trim() || !body.receivedBy?.trim()) {
      return NextResponse.json(
        { error: "Prepared by and received by are required." },
        { status: 400 },
      );
    }

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "At least one line item is required." },
        { status: 400 },
      );
    }

    const normalizedLines: { product_id: number; quantity: number }[] = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const lineNumber = index + 1;
      const productId = toPositiveInt(line?.productId);
      const quantity = toPositiveInt(line?.quantity);

      if (!productId) {
        return NextResponse.json(
          { error: `Line ${lineNumber}: productId must be a positive integer.` },
          { status: 400 },
        );
      }

      if (!quantity) {
        return NextResponse.json(
          { error: `Line ${lineNumber}: quantity must be a positive integer.` },
          { status: 400 },
        );
      }

      normalizedLines.push({ product_id: productId, quantity });
    }

    const aggregatedQuantities = normalizedLines.reduce<Map<number, number>>((map, line) => {
      map.set(line.product_id, (map.get(line.product_id) ?? 0) + line.quantity);
      return map;
    }, new Map());

    const ginDate = new Date(body.ginDate);

    const createdGin = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { invoice_id: invoiceId },
        select: {
          invoice_id: true,
          invoice_date: true,
          total_amount: true,
          customer_id: true,
          location_id: true,
          rep_id: true,
          invoice_lines: {
            select: {
              product_id: true,
              quantity: true,
            },
          },
          goods_issue_notes: {
            select: {
              gin_id: true,
              lines: {
                select: {
                  product_id: true,
                  quantity: true,
                },
              },
            },
          },
        },
      });

      if (!invoice) {
        throw new Error("Selected invoice not found.");
      }

      if (invoice.location_id !== locationId) {
        throw new Error("Selected location does not match invoice location.");
      }

      const invoiceQtyByProduct = invoice.invoice_lines.reduce<Map<number, number>>((map, line) => {
        map.set(line.product_id, (map.get(line.product_id) ?? 0) + line.quantity);
        return map;
      }, new Map());

      const alreadyIssuedQtyByProduct = new Map<number, number>();
      for (const note of invoice.goods_issue_notes) {
        for (const line of note.lines) {
          alreadyIssuedQtyByProduct.set(
            line.product_id,
            (alreadyIssuedQtyByProduct.get(line.product_id) ?? 0) + line.quantity,
          );
        }
      }

      for (const [productId, requestedQty] of aggregatedQuantities.entries()) {
        const invoiceQty = invoiceQtyByProduct.get(productId);
        const alreadyIssuedQty = alreadyIssuedQtyByProduct.get(productId) ?? 0;

        if (typeof invoiceQty !== "number") {
          throw new Error(`Product ${productId} does not exist in selected invoice lines.`);
        }

        const leftToIssue = Math.max(0, invoiceQty - alreadyIssuedQty);

        if (requestedQty > leftToIssue) {
          throw new Error(
            `Issued quantity exceeds remaining invoice quantity for product ${productId}. Remaining: ${leftToIssue}, Requested: ${requestedQty}`,
          );
        }
      }

      const productIds = Array.from(aggregatedQuantities.keys());

      const stockRows = await tx.stock.findMany({
        where: {
          location_id: locationId,
          product_id: { in: productIds },
        },
        select: {
          stock_id: true,
          product_id: true,
          quantity_on_hand: true,
        },
      });

      const stockByProductId = new Map(stockRows.map((row) => [row.product_id, row]));

      for (const [productId, requestedQty] of aggregatedQuantities.entries()) {
        const stock = stockByProductId.get(productId);

        if (!stock) {
          throw new Error(
            `Stock record not found for product ${productId} at selected location.`,
          );
        }

        if (stock.quantity_on_hand < requestedQty) {
          throw new Error(
            `Insufficient stock for product ${productId}. Available: ${stock.quantity_on_hand}, Requested: ${requestedQty}`,
          );
        }
      }

      let ginNumberToUse = ginNumber;
      let gin: { gin_id: number } | null = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          gin = await tx.goodsIssueNote.create({
            data: {
              gin_number: ginNumberToUse,
              gin_date: ginDate,
              invoice_id: invoice.invoice_id,
              customer_id: invoice.customer_id,
              location_id: locationId,
              prepared_by: body.preparedBy.trim(),
              received_by: body.receivedBy.trim(),
              lines: {
                create: normalizedLines,
              },
            },
            select: {
              gin_id: true,
            },
          });
          break;
        } catch (error) {
          const isGinNumberConflict =
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002" &&
            Array.isArray(error.meta?.target) &&
            (error.meta?.target as string[]).includes("gin_number");

          if (!isGinNumberConflict) {
            throw error;
          }

          ginNumberToUse = await getNextGinNumber(tx, ginDate);
        }
      }

      if (!gin) {
        throw new Error("Unable to generate a unique GIN number. Please retry.");
      }

      const isFullIssuance = Array.from(invoiceQtyByProduct.entries()).every(([productId, invoiceQty]) => {
        const alreadyIssuedQty = alreadyIssuedQtyByProduct.get(productId) ?? 0;
        const newlyIssuedQty = aggregatedQuantities.get(productId) ?? 0;
        return alreadyIssuedQty + newlyIssuedQty >= invoiceQty;
      });

      await tx.invoice.update({
        where: { invoice_id: invoice.invoice_id },
        data: { gin_status: isFullIssuance ? "ISSUED" : "PARTIAL" },
      });

      for (const [productId, issuedQty] of aggregatedQuantities.entries()) {
        const stock = stockByProductId.get(productId);

        if (!stock) {
          throw new Error(
            `Stock record not found for product ${productId} at selected location.`,
          );
        }

        await tx.stock.update({
          where: { stock_id: stock.stock_id },
          data: { quantity_on_hand: { decrement: issuedQty } },
        });
        
      }

      return gin;
    });

    const responseBody: CreateGoodsIssueNoteResponse = {
      data: {
        success: true,
        ginId: createdGin.gin_id,
      },
    };

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const isStockValidationError =
        error.message.includes("Insufficient stock") ||
        error.message.includes("Stock record not found") ||
        error.message.includes("invoice quantity") ||
        error.message.includes("invoice lines") ||
        error.message.includes("invoice location") ||
        error.message.includes("invoice");

      if (isStockValidationError) {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }

      if (error.message.includes("unique GIN number")) {
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
        { error: "GIN number already exists. Please retry to generate the next number." },
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
