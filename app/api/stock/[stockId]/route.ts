import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidateTag } from "next/cache";

interface Props {
  params: Promise<{ stockId: string }>;
}

export async function GET(_req: NextRequest, { params }: Props) {
  const { stockId } = await params;
  const id = Number(stockId);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid stock id" }, { status: 400 });
  }

  const stock = await prisma.stock.findUnique({
    where: { stock_id: id },
    include: {
      product: {
        select: {
          product_code: true,
          product_name: true,
          pack_size: true,
        },
      },
      location: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  });

  if (!stock) {
    return NextResponse.json({ error: "Stock not found" }, { status: 404 });
  }

  return NextResponse.json({ stock });
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stockId } = await params;
  const id = Number(stockId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid stock id" }, { status: 400 });
  }

  let body: { quantity_on_hand?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const targetQty = Number(body.quantity_on_hand);
  if (!Number.isInteger(targetQty) || targetQty < 0) {
    return NextResponse.json(
      { error: "quantity_on_hand must be a non-negative integer" },
      { status: 400 },
    );
  }

  const existing = await prisma.stock.findUnique({
    where: { stock_id: id },
    select: { stock_id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Stock not found" }, { status: 404 });
  }

  const updated = await prisma.stock.update({
    where: { stock_id: id },
    data: { quantity_on_hand: targetQty },
    select: {
      stock_id: true,
      quantity_on_hand: true,
      product_id: true,
      location_id: true,
    },
  });

  revalidateTag("inventory", "max");
  revalidateTag("summaries", "max");

  return NextResponse.json({ data: updated });
}
