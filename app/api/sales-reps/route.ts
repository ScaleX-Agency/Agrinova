import { NextResponse } from "next/server";
import * as z from "zod";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSalesRepSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
});

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

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const salesReps = await prisma.salesRep.findMany({
      orderBy: { rep_id: "desc" },
      select: {
        rep_id: true,
        full_name: true,
        phone: true,
      },
    });

    return NextResponse.json({ salesReps });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
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

  const body = await req.json();
  const parsed = createSalesRepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getValidationError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const salesRep = await prisma.salesRep.create({
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

    return NextResponse.json({ salesRep }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
