// app/api/analytics/products/route.ts
// GET /api/analytics/products
//   ?type=top-products  (default) — top selling by revenue
//   ?type=low-stock                — products below threshold
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD — date filter (for top-products only)
//   ?limit=10                      — max results

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type  = searchParams.get("type") ?? "top-products";
    const from  = searchParams.get("from");
    const to    = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") ?? "10");

    // ── Low stock ─────────────────────────────────────────
    if (type === "low-stock") {
      const stocks = await prisma.stock.findMany({
        where: {
          quantity_on_hand: { lte: 20 },   // default threshold
        },
        include: {
          product: { include: { category: true } },
          location: true,
        },
        orderBy: { quantity_on_hand: "asc" },
        take: 20,
      });

      const data = stocks.map((s) => ({
        stock_id:         s.stock_id,
        product_id:       s.product_id,
        product_code:     s.product.product_code,
        product_name:     s.product.product_name,
        pack_size:        s.product.pack_size,
        category_name:    s.product.category.name,
        location_code:    s.location.code,
        location_name:    s.location.name,
        quantity_on_hand: s.quantity_on_hand,
        status:           s.quantity_on_hand === 0 ? "out" : "low",
      }));

      return NextResponse.json({ data });
    }

    // ── Top selling products ───────────────────────────────
    const dateFilter =
      from && to
        ? {
            invoice: {
              invoice_date: {
                gte: new Date(from),
                lte: new Date(`${to}T23:59:59.999Z`),
              },
            },
          }
        : {};

    // Group InvoiceLine by product_id, sum revenue + quantity
    const lines = await prisma.invoiceLine.groupBy({
      by: ["product_id"],
      where: dateFilter,
      _sum: {
        line_total: true,
        quantity:   true,
      },
      orderBy: { _sum: { line_total: "desc" } },
      take: limit,
    });

    if (lines.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Enrich with product details
    const productIds = lines.map((l) => l.product_id);
    const products   = await prisma.product.findMany({
      where:  { product_id: { in: productIds } },
      select: {
        product_id:   true,
        product_code: true,
        product_name: true,
        pack_size:    true,
        category:     { select: { name: true } },
      },
    });

    const data = lines.map((l) => {
      const p = products.find((prod) => prod.product_id === l.product_id);
      return {
        product_id:    l.product_id,
        product_code:  p?.product_code  ?? "",
        product_name:  p?.product_name  ?? "Unknown Product",
        pack_size:     p?.pack_size      ?? "",
        category_name: p?.category?.name ?? "",
        total_revenue: Number(l._sum.line_total ?? 0),
        total_qty:     Number(l._sum.quantity    ?? 0),
      };
    });

    return NextResponse.json({ data });

  } catch (err) {
    console.error("[analytics/products] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch product analytics" },
      { status: 500 }
    );
  }
}
