import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as z from "zod";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSalesRepSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
});

function parseRepId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

function getValidationError(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) {
    return "Invalid input";
  }
  return issue.message;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Internal error";
}

async function findSalesRepById(repId: number) {
  return prisma.salesRep.findUnique({
    where: { rep_id: repId },
    select: {
      rep_id: true,
      full_name: true,
      phone: true,
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ repId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const repId = parseRepId((await params).repId);
    if (!repId) {
      return NextResponse.json(
        { error: "Invalid sales rep ID" },
        { status: 400 },
      );
    }

    const salesRep = await findSalesRepById(repId);
    if (!salesRep) {
      return NextResponse.json(
        { error: "Sales rep not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ salesRep });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ repId: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminUser(currentUser)) {
    return NextResponse.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 },
    );
  }

  const repId = parseRepId((await params).repId);
  if (!repId) {
    return NextResponse.json(
      { error: "Invalid sales rep ID" },
      { status: 400 },
    );
  }

  const existing = await findSalesRepById(repId);
  if (!existing) {
    return NextResponse.json({ error: "Sales rep not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSalesRepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getValidationError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const salesRep = await prisma.salesRep.update({
      where: { rep_id: repId },
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
      },
      select: {
        rep_id: true,
        full_name: true,
        phone: true,
      },
    });

    return NextResponse.json({ salesRep });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ repId: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminUser(currentUser)) {
    return NextResponse.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 },
    );
  }

  const repId = parseRepId((await params).repId);
  if (!repId) {
    return NextResponse.json(
      { error: "Invalid sales rep ID" },
      { status: 400 },
    );
  }

  const existing = await findSalesRepById(repId);
  if (!existing) {
    return NextResponse.json({ error: "Sales rep not found" }, { status: 404 });
  }

  try {
    await prisma.salesRep.delete({ where: { rep_id: repId } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this sales rep because it is linked to existing records.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
