// app/api/dashboard/finance/route.ts
// Phase 3 — Finance dashboard data
// GET /api/dashboard/finance?range=this-month|last-month|this-quarter|this-year

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // adjust import path if different

function getDateBounds(range: string): { from: Date; to: Date } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (range) {
    case "last-month":
      return {
        from: new Date(y, m - 1, 1),
        to:   new Date(y, m, 0, 23, 59, 59),
      };
    case "this-quarter": {
      const q = Math.floor(m / 3);
      return {
        from: new Date(y, q * 3, 1),
        to:   new Date(y, q * 3 + 3, 0, 23, 59, 59),
      };
    }
    case "this-year":
      return {
        from: new Date(y, 0, 1),
        to:   new Date(y, 11, 31, 23, 59, 59),
      };
    default: // this-month
      return {
        from: new Date(y, m, 1),
        to:   new Date(y, m + 1, 0, 23, 59, 59),
      };
  }
}

export async function GET(req: NextRequest) {
  const range = new URL(req.url).searchParams.get("range") ?? "this-month";
  const { from, to } = getDateBounds(range);

  try {
    // ── Cash flow trend: receipts (collected) + open invoice balances (outstanding)
    // Group by week (ISO week) within the period
    const cashFlowRaw = await prisma.$queryRaw<
      Array<{ week_label: string; collected: number; outstanding: number }>
    >`
      WITH weeks AS (
        SELECT generate_series(
          date_trunc('week', ${from}::timestamptz),
          date_trunc('week', ${to}::timestamptz),
          '1 week'::interval
        ) AS week_start
      ),
      receipts_by_week AS (
        SELECT
          date_trunc('week', r.receipt_date) AS week_start,
          SUM(r.amount)                       AS collected
        FROM "Receipt" r
        WHERE r.receipt_date BETWEEN ${from} AND ${to}
        GROUP BY 1
      ),
      outstanding_by_week AS (
        SELECT
          date_trunc('week', i.invoice_date) AS week_start,
          SUM(i.balance_due)                 AS outstanding
        FROM "Invoice" i
        WHERE i.invoice_date BETWEEN ${from} AND ${to}
          AND i.balance_due  > 0
        GROUP BY 1
      )
      SELECT
        TO_CHAR(w.week_start, 'DD Mon')       AS week_label,
        COALESCE(r.collected,   0)            AS collected,
        COALESCE(o.outstanding, 0)            AS outstanding
      FROM weeks w
      LEFT JOIN receipts_by_week    r ON r.week_start = w.week_start
      LEFT JOIN outstanding_by_week o ON o.week_start = w.week_start
      ORDER BY w.week_start
    `;

    // ── Commission totals
    const commTotals = await prisma.$queryRaw<
      Array<{ status: string; total: number }>
    >`
      SELECT status, SUM(amount) AS total
      FROM "Commission"
      GROUP BY status
    `;
    const totalPendingComm = Number(
      commTotals.find((r) => r.status === "PENDING")?.total ?? 0
    );
    const totalPaidComm = Number(
      commTotals.find((r) => r.status === "PAID")?.total ?? 0
    );

    return NextResponse.json({
      cashFlowTrend: cashFlowRaw.map((r) => ({
        label:       r.week_label,
        collected:   Number(r.collected),
        outstanding: Number(r.outstanding),
      })),
      totalPendingComm,
      totalPaidComm,
    });
  } catch (error) {
    console.error("[dashboard/finance] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch finance data" },
      { status: 500 }
    );
  }
}
