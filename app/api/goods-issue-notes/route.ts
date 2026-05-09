import { NextResponse } from "next/server";
import { GINStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CreateGoodsIssueNoteRequestDto,
  CreateGoodsIssueNoteResponse,
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
      where: invoiceId ? { invoice_id: invoiceId } : undefined,
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

    const createdGin = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { invoice_id: invoiceId },
        select: {
          invoice_id: true,
          customer_id: true,
          location_id: true,
          is_active: true,
          gin_status: true,
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

      const gin = await tx.goodsIssueNote.create({
        data: {
          gin_number: ginNumber,
          gin_date: ginDate,
          invoice_id: invoice.invoice_id,
          customer_id: invoice.customer_id,
          location_id: invoice.location_id,
          notes: body.notes?.trim() || null,
          created_by: createdBy,
        },
        select: {
          gin_id: true,
          gin_number: true,
        },
      });

      await tx.invoice.update({
        where: { invoice_id: invoice.invoice_id },
        data: { gin_status: "ISSUED" },
      });

      return gin;
    });

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
      const isStockValidationError = error.message.includes("invoice");

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
