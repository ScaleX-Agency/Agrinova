import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const pageStr = searchParams.get("page");
    const pageSizeStr = searchParams.get("pageSize");
    const search = searchParams.get("search");
    
    // eslint-disable-next-line
    const where: any = {};
    if (statusFilter && (statusFilter === "ACTIVE" || statusFilter === "INACTIVE" || statusFilter === "ALL")) {
      if (statusFilter !== "ALL") {
        where.status = statusFilter;
      }
    } else {
      where.status = "ACTIVE";
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    if (pageStr && pageSizeStr) {
      const page = parseInt(pageStr, 10);
      const pageSize = parseInt(pageSizeStr, 10);
      const total = await prisma.inventoryLocation.count({ where });
      const locations = await prisma.inventoryLocation.findMany({
        where,
        orderBy: { location_id: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const data = {
        items: locations.map(loc => ({
          ...loc,
          id: loc.location_id,
          label: `${loc.code} — ${loc.name}`
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        }
      };
      return NextResponse.json(data);
    }

    const locations = await prisma.inventoryLocation.findMany({
      where,
      orderBy: { location_id: "asc" },
    });

    const data = {
      data: locations.map(loc => ({
        ...loc,
        id: loc.location_id,
        label: `${loc.code} — ${loc.name}`
      }))
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/locations]", err);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 },
    );
  }
}

import { z } from "zod";

const createLocationSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  address: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = createLocationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { code, name, address, status } = parseResult.data;

    const existing = await prisma.inventoryLocation.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: "Location code already exists" }, { status: 400 });
    }

    const location = await prisma.inventoryLocation.create({
      data: {
        code,
        name,
        address: address || null,
        status: status || "ACTIVE",
      },
    });

    return NextResponse.json({ data: location });
  } catch (err) {
    console.error("[POST /api/locations]", err);
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}
