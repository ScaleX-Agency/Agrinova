import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PeriodType = "daily" | "monthly" | "yearly" | "custom";

type ReportRow = {
  productId: number;
  itemCode: string;
  name: string;
  packSize: string;
  qty: number;
  freeQty: number;
  unitPrice: number;
  grossAmount: number;
  discount: number;
  netAmount: number;
};

function canAccess(roleName?: string) {
  const role = roleName?.toLowerCase();
  return role === "admin" || role === "operator";
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function toNumber(value: number | string | { toString(): string } | null | undefined) {
  return Number(value ?? 0);
}

function parseIntParam(raw: string | null, fieldName: string) {
  if (!raw || raw === "all") return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}.`);
  }
  return parsed;
}

function parsePeriod(search: URLSearchParams) {
  const now = new Date();
  const periodTypeRaw = search.get("periodType");
  const periodType: PeriodType =
    periodTypeRaw === "daily" ||
    periodTypeRaw === "monthly" ||
    periodTypeRaw === "yearly" ||
    periodTypeRaw === "custom"
      ? periodTypeRaw
      : "monthly";

  if (periodType === "daily") {
    const raw = search.get("date");
    const date = raw ? new Date(raw) : now;
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid date. Use YYYY-MM-DD.");
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
    const raw = search.get("month");
    const match = raw?.match(/^(\d{4})-(\d{2})$/);
    const year = match ? Number(match[1]) : now.getFullYear();
    const month = match ? Number(match[2]) - 1 : now.getMonth();
    if (month < 0 || month > 11) {
      throw new Error("Invalid month.");
    }
    const startDate = startOfDay(new Date(year, month, 1));
    const endDate = endOfDay(new Date(year, month + 1, 0));
    return {
      periodType,
      startDate,
      endDate,
      label: startDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
    };
  }

  if (periodType === "yearly") {
    const raw = search.get("year");
    const year = raw ? Number(raw) : now.getFullYear();
    if (!Number.isInteger(year)) {
      throw new Error("Invalid year.");
    }
    return {
      periodType,
      startDate: startOfDay(new Date(year, 0, 1)),
      endDate: endOfDay(new Date(year, 11, 31)),
      label: String(year),
    };
  }

  const fromRaw = search.get("from");
  const toRaw = search.get("to");
  if (!fromRaw || !toRaw) {
    throw new Error("Custom period requires from and to.");
  }

  const fromDate = new Date(fromRaw);
  const toDate = new Date(toRaw);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error("Invalid custom dates.");
  }

  const startDate = startOfDay(fromDate);
  const endDate = endOfDay(toDate);
  if (startDate > endDate) {
    throw new Error("from cannot be after to.");
  }

  return {
    periodType,
    startDate,
    endDate,
    label: `${startDate.toLocaleDateString("en-GB")} - ${endDate.toLocaleDateString("en-GB")}`,
  };
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
    const search = new URL(request.url).searchParams;
    const period = parsePeriod(search);
    const repId = parseIntParam(search.get("repId"), "repId");
    const locationId = parseIntParam(search.get("locationId"), "locationId");
    const customerId = parseIntParam(search.get("customerId"), "customerId");
    const productId = parseIntParam(search.get("productId"), "productId");

    const invoiceLines = await prisma.invoiceLine.findMany({
      where: {
        ...(productId ? { product_id: productId } : {}),
        invoice: {
          is_active: true,
          invoice_date: { gte: period.startDate, lte: period.endDate },
          ...(repId ? { rep_id: repId } : {}),
          ...(locationId ? { location_id: locationId } : {}),
          ...(customerId ? { customer_id: customerId } : {}),
        },
      },
      select: {
        product_id: true,
        quantity: true,
        free_quantity: true,
        unit_price: true,
        line_total: true,
        net_line_total: true,
        product: {
          select: {
            product_code: true,
            product_name: true,
            pack_size: true,
          },
        },
      },
    });

    const grouped = new Map<number, ReportRow>();

    for (const line of invoiceLines) {
      const existing = grouped.get(line.product_id) ?? {
        productId: line.product_id,
        itemCode: line.product.product_code,
        name: line.product.product_name,
        packSize: line.product.pack_size,
        qty: 0,
        freeQty: 0,
        unitPrice: 0,
        grossAmount: 0,
        discount: 0,
        netAmount: 0,
      };

      const quantity = line.quantity;
      const freeQty = line.free_quantity;
      const grossAmount = toNumber(line.line_total);
      const netAmount = toNumber(line.net_line_total);

      existing.qty += quantity;
      existing.freeQty += freeQty;
      existing.grossAmount += grossAmount;
      existing.discount += grossAmount - netAmount;
      existing.netAmount += netAmount;
      grouped.set(line.product_id, existing);
    }

    const rows = Array.from(grouped.values())
      .map((row) => {
        const unitPrice = row.qty > 0 ? row.grossAmount / row.qty : 0;
        return {
          ...row,
          unitPrice: Number(unitPrice.toFixed(2)),
          grossAmount: Number(row.grossAmount.toFixed(2)),
          discount: Number(row.discount.toFixed(2)),
          netAmount: Number(row.netAmount.toFixed(2)),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const totals = rows.reduce(
      (acc, row) => {
        acc.qty += row.qty;
        acc.freeQty += row.freeQty;
        acc.grossAmount += row.grossAmount;
        acc.discount += row.discount;
        acc.netAmount += row.netAmount;
        return acc;
      },
      {
        qty: 0,
        freeQty: 0,
        grossAmount: 0,
        discount: 0,
        netAmount: 0,
      },
    );

    return NextResponse.json({
      period: {
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        label: period.label,
      },
      totals: {
        qty: totals.qty,
        freeQty: totals.freeQty,
        grossAmount: Number(totals.grossAmount.toFixed(2)),
        discount: Number(totals.discount.toFixed(2)),
        netAmount: Number(totals.netAmount.toFixed(2)),
      },
      rows,
    });
  } catch (error) {
    console.error("Failed to load sales rep sales", error);
    const message = error instanceof Error ? error.message : "Failed to load sales rep sales.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
