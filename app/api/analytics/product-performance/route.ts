import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PeriodType = "daily" | "monthly" | "yearly" | "custom";

type GroupMetric = {
  locationId: number;
  locationCode: string;
  locationName: string;
  productId: number;
  productCode: string;
  productName: string;
  packSize: string;
  categoryName: string;
  grossQty: number;
  returnedQty: number;
  netQty: number;
  grossRevenue: number;
  returnedRevenue: number;
  netRevenue: number;
  invoiceIds: Set<number>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function toNumber(value: number | string | { toString(): string } | null | undefined) {
  return Number(value ?? 0);
}

function parseIntStrict(value: string | null) {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
}

function parsePeriod(
  periodTypeRaw: string | null,
  dateRaw: string | null,
  monthRaw: string | null,
  yearRaw: string | null,
  fromRaw: string | null,
  toRaw: string | null,
) {
  const now = new Date();
  const periodType: PeriodType =
    periodTypeRaw === "daily" ||
    periodTypeRaw === "monthly" ||
    periodTypeRaw === "yearly" ||
    periodTypeRaw === "custom"
      ? periodTypeRaw
      : "monthly";

  if (periodType === "daily") {
    const date = dateRaw ? new Date(dateRaw) : now;
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid daily date. Use YYYY-MM-DD.");
    }
    return {
      periodType,
      startDate: startOfDay(date),
      endDate: endOfDay(date),
      label: date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
  }

  if (periodType === "monthly") {
    let year = now.getFullYear();
    let monthIndex = now.getMonth();

    if (monthRaw) {
      const m = monthRaw.match(/^(\d{4})-(\d{2})$/);
      if (!m) {
        throw new Error("Invalid month. Use YYYY-MM.");
      }
      year = Number(m[1]);
      monthIndex = Number(m[2]) - 1;
      if (monthIndex < 0 || monthIndex > 11) {
        throw new Error("Invalid month value.");
      }
    }

    const start = startOfDay(new Date(year, monthIndex, 1));
    const end = endOfDay(new Date(year, monthIndex + 1, 0));
    return {
      periodType,
      startDate: start,
      endDate: end,
      label: start.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
    };
  }

  if (periodType === "yearly") {
    const parsedYear = parseIntStrict(yearRaw);
    const y = parsedYear ?? now.getFullYear();
    if (y < 2000 || y > 2100) {
      throw new Error("Invalid year.");
    }
    return {
      periodType,
      startDate: startOfDay(new Date(y, 0, 1)),
      endDate: endOfDay(new Date(y, 11, 31)),
      label: String(y),
    };
  }

  if (!fromRaw || !toRaw) {
    throw new Error("Custom period requires from and to.");
  }
  const from = new Date(fromRaw);
  const to = new Date(toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid custom dates. Use YYYY-MM-DD.");
  }
  const start = startOfDay(from);
  const end = endOfDay(to);
  if (start > end) {
    throw new Error("Custom period from date cannot be after to date.");
  }
  if (end.getTime() - start.getTime() > 366 * DAY_MS * 5) {
    throw new Error("Custom period is too large.");
  }
  return {
    periodType,
    startDate: start,
    endDate: end,
    label: `${start.toLocaleDateString("en-GB")} - ${end.toLocaleDateString("en-GB")}`,
  };
}

function canAccess(roleName?: string) {
  const role = roleName?.toLowerCase();
  return role === "admin" || role === "operator";
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccess(currentUser.role?.role_name)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = parsePeriod(
      searchParams.get("periodType"),
      searchParams.get("date"),
      searchParams.get("month"),
      searchParams.get("year"),
      searchParams.get("from"),
      searchParams.get("to"),
    );

    const locationParam = searchParams.get("locationId");
    const productParam = searchParams.get("productId");

    const locationId =
      !locationParam || locationParam === "all" ? null : parseIntStrict(locationParam);
    const productId =
      !productParam || productParam === "all" ? null : parseIntStrict(productParam);

    if (locationParam && locationParam !== "all" && !locationId) {
      return NextResponse.json({ error: "Invalid locationId." }, { status: 400 });
    }
    if (productParam && productParam !== "all" && !productId) {
      return NextResponse.json({ error: "Invalid productId." }, { status: 400 });
    }

    const invoiceWhere = {
      is_active: true,
      invoice_date: { gte: period.startDate, lte: period.endDate },
      ...(locationId ? { location_id: locationId } : {}),
    };

    const returnWhere = {
      is_active: true,
      return_date: { gte: period.startDate, lte: period.endDate },
      ...(locationId ? { location_id: locationId } : {}),
    };

    const [invoiceLines, returnLines] = await Promise.all([
      prisma.invoiceLine.findMany({
        where: {
          invoice: invoiceWhere,
          ...(productId ? { product_id: productId } : {}),
        },
        select: {
          invoice_id: true,
          product_id: true,
          quantity: true,
          net_line_total: true,
          invoice: {
            select: {
              invoice_id: true,
              location_id: true,
              location: { select: { code: true, name: true } },
            },
          },
          product: {
            select: {
              product_id: true,
              product_code: true,
              product_name: true,
              pack_size: true,
              category: { select: { name: true } },
            },
          },
        },
      }),
      prisma.salesReturnNoteLine.findMany({
        where: {
          sales_return_note: returnWhere,
          ...(productId ? { product_id: productId } : {}),
        },
        select: {
          product_id: true,
          quantity_usable: true,
          quantity_unusable: true,
          line_total: true,
          sales_return_note: {
            select: {
              location_id: true,
              location: { select: { code: true, name: true } },
            },
          },
          product: {
            select: {
              product_id: true,
              product_code: true,
              product_name: true,
              pack_size: true,
              category: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const map = new Map<string, GroupMetric>();
    const keyOf = (locId: number, prodId: number) => `${locId}:${prodId}`;

    for (const line of invoiceLines) {
      const locId = line.invoice.location_id;
      const prodId = line.product_id;
      const key = keyOf(locId, prodId);
      const existing = map.get(key) ?? {
        locationId: locId,
        locationCode: line.invoice.location.code,
        locationName: line.invoice.location.name,
        productId: prodId,
        productCode: line.product.product_code,
        productName: line.product.product_name,
        packSize: line.product.pack_size,
        categoryName: line.product.category.name,
        grossQty: 0,
        returnedQty: 0,
        netQty: 0,
        grossRevenue: 0,
        returnedRevenue: 0,
        netRevenue: 0,
        invoiceIds: new Set<number>(),
      };
      existing.grossQty += line.quantity;
      existing.grossRevenue += toNumber(line.net_line_total);
      existing.invoiceIds.add(line.invoice_id);
      map.set(key, existing);
    }

    for (const line of returnLines) {
      const locId = line.sales_return_note.location_id;
      const prodId = line.product_id;
      const key = keyOf(locId, prodId);
      const existing = map.get(key) ?? {
        locationId: locId,
        locationCode: line.sales_return_note.location.code,
        locationName: line.sales_return_note.location.name,
        productId: prodId,
        productCode: line.product.product_code,
        productName: line.product.product_name,
        packSize: line.product.pack_size,
        categoryName: line.product.category.name,
        grossQty: 0,
        returnedQty: 0,
        netQty: 0,
        grossRevenue: 0,
        returnedRevenue: 0,
        netRevenue: 0,
        invoiceIds: new Set<number>(),
      };
      existing.returnedQty += line.quantity_usable + line.quantity_unusable;
      existing.returnedRevenue += toNumber(line.line_total);
      map.set(key, existing);
    }

    const merged = Array.from(map.values()).map((row) => {
      const netQty = row.grossQty - row.returnedQty;
      const netRevenue = row.grossRevenue - row.returnedRevenue;
      return {
        ...row,
        netQty,
        netRevenue,
      };
    });

    const productMap = new Map<
      number,
      {
        productId: number;
        productCode: string;
        productName: string;
        packSize: string;
        categoryName: string;
        grossQty: number;
        returnedQty: number;
        netQty: number;
        grossRevenue: number;
        returnedRevenue: number;
        netRevenue: number;
        invoiceIds: Set<number>;
        locationBreakdown: Array<{
          locationId: number;
          locationCode: string;
          locationName: string;
          netRevenue: number;
          netQty: number;
        }>;
      }
    >();

    const locationMap = new Map<
      number,
      {
        locationId: number;
        locationCode: string;
        locationName: string;
        grossQty: number;
        returnedQty: number;
        netQty: number;
        grossRevenue: number;
        returnedRevenue: number;
        netRevenue: number;
        invoiceIds: Set<number>;
        topProductName: string | null;
        topProductRevenue: number;
      }
    >();

    for (const row of merged) {
      const p = productMap.get(row.productId) ?? {
        productId: row.productId,
        productCode: row.productCode,
        productName: row.productName,
        packSize: row.packSize,
        categoryName: row.categoryName,
        grossQty: 0,
        returnedQty: 0,
        netQty: 0,
        grossRevenue: 0,
        returnedRevenue: 0,
        netRevenue: 0,
        invoiceIds: new Set<number>(),
        locationBreakdown: [],
      };
      p.grossQty += row.grossQty;
      p.returnedQty += row.returnedQty;
      p.netQty += row.netQty;
      p.grossRevenue += row.grossRevenue;
      p.returnedRevenue += row.returnedRevenue;
      p.netRevenue += row.netRevenue;
      for (const id of row.invoiceIds) p.invoiceIds.add(id);
      p.locationBreakdown.push({
        locationId: row.locationId,
        locationCode: row.locationCode,
        locationName: row.locationName,
        netRevenue: Number(row.netRevenue.toFixed(2)),
        netQty: row.netQty,
      });
      productMap.set(row.productId, p);

      const l = locationMap.get(row.locationId) ?? {
        locationId: row.locationId,
        locationCode: row.locationCode,
        locationName: row.locationName,
        grossQty: 0,
        returnedQty: 0,
        netQty: 0,
        grossRevenue: 0,
        returnedRevenue: 0,
        netRevenue: 0,
        invoiceIds: new Set<number>(),
        topProductName: null,
        topProductRevenue: Number.NEGATIVE_INFINITY,
      };
      l.grossQty += row.grossQty;
      l.returnedQty += row.returnedQty;
      l.netQty += row.netQty;
      l.grossRevenue += row.grossRevenue;
      l.returnedRevenue += row.returnedRevenue;
      l.netRevenue += row.netRevenue;
      for (const id of row.invoiceIds) l.invoiceIds.add(id);
      if (row.netRevenue > l.topProductRevenue) {
        l.topProductRevenue = row.netRevenue;
        l.topProductName = row.productName;
      }
      locationMap.set(row.locationId, l);
    }

    const productPerformance = Array.from(productMap.values())
      .map((row) => ({
        productId: row.productId,
        productCode: row.productCode,
        productName: row.productName,
        packSize: row.packSize,
        categoryName: row.categoryName,
        grossQty: row.grossQty,
        returnedQty: row.returnedQty,
        netQty: row.netQty,
        grossRevenue: Number(row.grossRevenue.toFixed(2)),
        returnedRevenue: Number(row.returnedRevenue.toFixed(2)),
        netRevenue: Number(row.netRevenue.toFixed(2)),
        invoiceCount: row.invoiceIds.size,
        locationBreakdown: row.locationBreakdown.sort((a, b) => b.netRevenue - a.netRevenue),
      }))
      .sort((a, b) => b.netRevenue - a.netRevenue);

    const locationPerformance = Array.from(locationMap.values())
      .map((row) => ({
        locationId: row.locationId,
        locationCode: row.locationCode,
        locationName: row.locationName,
        grossRevenue: Number(row.grossRevenue.toFixed(2)),
        returnedRevenue: Number(row.returnedRevenue.toFixed(2)),
        netRevenue: Number(row.netRevenue.toFixed(2)),
        grossQty: row.grossQty,
        returnedQty: row.returnedQty,
        netQty: row.netQty,
        invoiceCount: row.invoiceIds.size,
        topProductName: row.topProductName,
      }))
      .sort((a, b) => b.netRevenue - a.netRevenue);

    const invoiceIdsTotal = new Set<number>();
    for (const row of merged) {
      for (const id of row.invoiceIds) invoiceIdsTotal.add(id);
    }

    const totals = merged.reduce(
      (acc, row) => {
        acc.grossRevenue += row.grossRevenue;
        acc.returnedRevenue += row.returnedRevenue;
        acc.netRevenue += row.netRevenue;
        acc.grossQty += row.grossQty;
        acc.returnedQty += row.returnedQty;
        acc.netQty += row.netQty;
        return acc;
      },
      {
        grossRevenue: 0,
        returnedRevenue: 0,
        netRevenue: 0,
        grossQty: 0,
        returnedQty: 0,
        netQty: 0,
      },
    );

    return NextResponse.json({
      period: {
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        label: period.label,
      },
      totals: {
        grossRevenue: Number(totals.grossRevenue.toFixed(2)),
        returnedRevenue: Number(totals.returnedRevenue.toFixed(2)),
        netRevenue: Number(totals.netRevenue.toFixed(2)),
        grossQty: totals.grossQty,
        returnedQty: totals.returnedQty,
        netQty: totals.netQty,
        invoiceCount: invoiceIdsTotal.size,
      },
      productPerformance,
      locationPerformance,
    });
  } catch (error) {
    console.error("Failed to build product performance report", error);
    const message = error instanceof Error ? error.message : "Failed to load product performance report.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
