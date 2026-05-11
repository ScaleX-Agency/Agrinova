// app/api/inventory/valuation/route.ts
// Phase 2 — Inventory Valuation endpoint
// Returns total stock value = SUM(quantity_on_hand * selling_price) per location + overall.
//
// Add to your existing prisma client import path as needed.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // adjust import path if different

export async function GET() {
  try {
    // Aggregate: join Stock → Product, group by location
    // Using Prisma raw for the aggregation since it spans two models
    const rows = await prisma.$queryRaw<
      Array<{
        location_id:   number;
        location_name: string;
        location_code: string;
        valuation:     number;
        total_units:   number;
      }>
    >`
      SELECT
        il.location_id,
        il.name        AS location_name,
        il.code        AS location_code,
        COALESCE(SUM(s.quantity_on_hand * p.selling_price), 0) AS valuation,
        COALESCE(SUM(s.quantity_on_hand), 0)                   AS total_units
      FROM "InventoryLocation" il
      LEFT JOIN "Stock" s ON s.location_id = il.location_id
      LEFT JOIN "Product" p ON p.product_id = s.product_id
      GROUP BY il.location_id, il.name, il.code
      ORDER BY valuation DESC
    `;

    const totalValuation = rows.reduce((sum, r) => sum + Number(r.valuation), 0);
    const totalUnits     = rows.reduce((sum, r) => sum + Number(r.total_units), 0);

    return NextResponse.json({
      totalValuation,
      totalUnits,
      locationBreakdown: rows.map((r) => ({
        locationName: r.location_name,
        locationCode: r.location_code,
        valuation:    Number(r.valuation),
      })),
    });
  } catch (error) {
    console.error("[inventory/valuation] Error:", error);
    return NextResponse.json(
      { error: "Failed to calculate inventory valuation" },
      { status: 500 }
    );
  }
}
