// app/api/dashboard/inventory-insights/route.ts
// Phase 3 — Dead Stock + Top Velocity endpoint
// GET /api/dashboard/inventory-insights?deadDays=30&velocityDays=30&limit=8

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // adjust import path if different

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const deadDays     = parseInt(searchParams.get("deadDays")     ?? "30");
  const velocityDays = parseInt(searchParams.get("velocityDays") ?? "30");
  const limit        = parseInt(searchParams.get("limit")        ?? "8");

  const deadCutoff     = new Date(Date.now() - deadDays     * 86_400_000);
  const velocityCutoff = new Date(Date.now() - velocityDays * 86_400_000);

  try {
    // ── Dead stock ──
    // Products with qty > 0 AND no ISSUE movement in the last N days
    const deadStock = await prisma.$queryRaw<
      Array<{
        stock_id:              number;
        product_name:          string;
        product_code:          string;
        location_code:         string;
        quantity_on_hand:      number;
        last_issue_date:       Date | null;
        days_since_last_issue: number;
      }>
    >`
      SELECT
        s.stock_id,
        p.name          AS product_name,
        p.code          AS product_code,
        il.code         AS location_code,
        s.quantity_on_hand,
        MAX(sm.movement_date)  AS last_issue_date,
        COALESCE(
          EXTRACT(DAY FROM NOW() - MAX(sm.movement_date)),
          ${deadDays + 1}
        )::int                 AS days_since_last_issue
      FROM "Stock" s
      JOIN "Product"           p  ON p.product_id  = s.product_id
      JOIN "InventoryLocation" il ON il.location_id = s.location_id
      LEFT JOIN "StockMovement" sm
        ON sm.stock_id = s.stock_id
       AND sm.movement_type = 'ISSUE'
      WHERE s.quantity_on_hand > 0
      GROUP BY s.stock_id, p.name, p.code, il.code, s.quantity_on_hand
      HAVING MAX(sm.movement_date) IS NULL
          OR MAX(sm.movement_date) < ${deadCutoff}
      ORDER BY days_since_last_issue DESC
      LIMIT ${limit}
    `;

    // ── Top velocity ──
    // Products with the highest total ISSUE quantity in last N days
    const topVelocity = await prisma.$queryRaw<
      Array<{
        product_id:     number;
        product_name:   string;
        product_code:   string;
        total_issued:   number;
        movement_count: number;
      }>
    >`
      SELECT
        p.product_id,
        p.name  AS product_name,
        p.code  AS product_code,
        SUM(ABS(sm.qty_delta))   AS total_issued,
        COUNT(sm.movement_id)    AS movement_count
      FROM "StockMovement" sm
      JOIN "Stock"   s ON s.stock_id   = sm.stock_id
      JOIN "Product" p ON p.product_id = s.product_id
      WHERE sm.movement_type = 'ISSUE'
        AND sm.movement_date >= ${velocityCutoff}
      GROUP BY p.product_id, p.name, p.code
      ORDER BY total_issued DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({
      deadStock: deadStock.map((r) => ({
        ...r,
        quantity_on_hand:      Number(r.quantity_on_hand),
        days_since_last_issue: Number(r.days_since_last_issue),
      })),
      topVelocity: topVelocity.map((r) => ({
        ...r,
        total_issued:   Number(r.total_issued),
        movement_count: Number(r.movement_count),
      })),
    });
  } catch (error) {
    console.error("[dashboard/inventory-insights] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory insights" },
      { status: 500 }
    );
  }
}
