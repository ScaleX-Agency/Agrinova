import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    if (!note) {
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
