import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canAccess(roleName?: string) {
  const role = roleName?.toLowerCase();
  return role === "admin" || role === "operator";
}

function toNum(value: number | string | { toString(): string } | null | undefined) {
  return Number(value ?? 0);
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(currentUser.role?.role_name)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const search = new URL(request.url).searchParams;
    const query = (search.get("search") ?? "").trim();
    const locationIdRaw = search.get("locationId");
    const range = search.get("range");
    const startDateParam = search.get("startDate");
    const endDateParam = search.get("endDate");
    const locationId = locationIdRaw && locationIdRaw !== "all" ? Number(locationIdRaw) : null;
    if (locationIdRaw && locationIdRaw !== "all" && (!Number.isInteger(locationId) || (locationId as number) <= 0)) {
      return NextResponse.json({ error: "Invalid locationId." }, { status: 400 });
    }

    const page = parseInt(search.get("page") || "1", 10);
    const limit = parseInt(search.get("limit") || "20", 10);

    let dateFilter: Prisma.DateTimeFilter | undefined;
    if (range && range !== "all") {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;

      if (range === "day") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (range === "week") {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
      } else if (range === "month") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else if (range === "year") {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear() + 1, 0, 1);
      } else if (range === "custom") {
        start = startDateParam ? new Date(startDateParam) : null;
        if (endDateParam) {
          const endDate = new Date(endDateParam);
          end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
        }
      }

      if (start || end) {
        dateFilter = {};
        if (start) dateFilter.gte = start;
        if (end) dateFilter.lt = end;
      }
    } else if (startDateParam || endDateParam) {
      dateFilter = {};
      if (startDateParam) dateFilter.gte = new Date(startDateParam);
      if (endDateParam) {
        const end = new Date(endDateParam);
        dateFilter.lt = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
      }
    }

    const where: Prisma.SalesReturnNoteWhereInput = {
      is_active: true,
      ...(locationId ? { location_id: locationId } : {}),
      ...(dateFilter ? { return_date: dateFilter } : {}),
      ...(query ? {
        OR: [
          { return_number: { contains: query, mode: "insensitive" } },
          { invoice: { invoice_number: { contains: query, mode: "insensitive" } } },
          { customer: { name: { contains: query, mode: "insensitive" } } },
          { location: { name: { contains: query, mode: "insensitive" } } },
          { location: { code: { contains: query, mode: "insensitive" } } },
          { goodsReturnNotes: { some: { return_number: { contains: query, mode: "insensitive" } } } },
        ],
      } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.salesReturnNote.count({ where }),
      prisma.salesReturnNote.findMany({
        where,
        orderBy: [{ return_date: "desc" }, { return_id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          return_id: true,
          return_number: true,
          return_date: true,
          total_amount: true,
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
          creator: {
            select: {
              full_name: true,
            },
          },
          goodsReturnNotes: {
            where: { is_active: true },
            orderBy: [{ return_date: "desc" }, { return_id: "desc" }],
            select: {
              return_id: true,
              return_number: true,
              return_date: true,
            },
          },
          creditNotes: {
            where: { is_active: true },
            orderBy: [{ created_at: "desc" }, { credit_note_id: "desc" }],
            select: {
              credit_note_id: true,
              created_at: true,
              amount: true,
            },
          },
        },
      }),
    ]);

    const data = rows.map((row) => {
      const goodsReturn = row.goodsReturnNotes[0] ?? null;
      const creditNote = row.creditNotes[0] ?? null;
      return {
        returnId: row.return_id,
        srnNumber: row.return_number,
        srnDate: row.return_date.toISOString(),
        grnNumber: goodsReturn?.return_number ?? "Missing",
        creditNoteNumber: creditNote ? `CN-${creditNote.credit_note_id}` : "Missing",
        invoiceId: row.invoice.invoice_id,
        invoiceNumber: row.invoice.invoice_number,
        customerId: row.customer.customer_id,
        customerName: row.customer.name,
        locationId: row.location.location_id,
        locationCode: row.location.code,
        locationName: row.location.name,
        returnAmount: Number(toNum(row.total_amount).toFixed(2)),
        creditAmount: Number(toNum(creditNote?.amount).toFixed(2)),
        createdBy: row.creator.full_name,
      };
    });

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("Failed to load sales return notes list", error);
    return NextResponse.json({ error: "Failed to load sales return notes list." }, { status: 500 });
  }
}
