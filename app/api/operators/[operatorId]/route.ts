import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import * as z from "zod";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const OPERATOR_ROLE_ID = 2;

const updateOperatorSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  password: z.string().min(8).optional(),
});

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] ?? "",
    last_name: parts.slice(1).join(" "),
  };
}

function getErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown }).errors)
  ) {
    const firstError = (
      error as { errors: Array<{ longMessage?: string; message?: string }> }
    ).errors[0];
    if (firstError?.longMessage || firstError?.message) {
      return firstError.longMessage ?? firstError.message ?? "Request failed";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Internal error";
}

function parseOperatorId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

async function requireAdmin() {
  const caller = await getCurrentUser();

  if (!caller) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!isAdminUser(caller)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const, caller };
}

async function findOperatorById(operatorId: number) {
  return prisma.user.findFirst({
    where: {
      user_id: operatorId,
      role_id: OPERATOR_ROLE_ID,
    },
    select: {
      user_id: true,
      clerk_id: true,
      full_name: true,
      username: true,
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ operatorId: string }> },
) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return guard.response;
    }

    const operatorId = parseOperatorId((await params).operatorId);
    if (!operatorId) {
      return NextResponse.json(
        { error: "Invalid operator ID" },
        { status: 400 },
      );
    }

    const operator = await findOperatorById(operatorId);
    if (!operator) {
      return NextResponse.json(
        { error: "Operator not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      operator: {
        ...operator,
        ...splitFullName(operator.full_name),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ operatorId: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const operatorId = parseOperatorId((await params).operatorId);
  if (!operatorId) {
    return NextResponse.json({ error: "Invalid operator ID" }, { status: 400 });
  }

  const operator = await findOperatorById(operatorId);
  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateOperatorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { firstName, lastName, password } = parsed.data;
  const fullName = `${firstName} ${lastName}`.trim();

  try {
    if (!operator.clerk_id) {
      return NextResponse.json(
        {
          error:
            "Operator is missing clerk_id and cannot be synced with Clerk.",
        },
        { status: 409 },
      );
    }

    const client = await clerkClient();
    await client.users.updateUser(operator.clerk_id, {
      firstName,
      lastName,
      ...(password ? { password } : {}),
    });

    const updatedOperator = await prisma.user.update({
      where: { user_id: operator.user_id },
      data: { full_name: fullName },
      select: {
        user_id: true,
        clerk_id: true,
        full_name: true,
        username: true,
      },
    });

    return NextResponse.json({
      operator: {
        ...updatedOperator,
        ...splitFullName(updatedOperator.full_name),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ operatorId: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const operatorId = parseOperatorId((await params).operatorId);
  if (!operatorId) {
    return NextResponse.json({ error: "Invalid operator ID" }, { status: 400 });
  }

  const operator = await findOperatorById(operatorId);
  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  try {
    if (!operator.clerk_id) {
      return NextResponse.json(
        {
          error:
            "Operator is missing clerk_id and cannot be deleted from Clerk.",
        },
        { status: 409 },
      );
    }

    const client = await clerkClient();
    await client.users.deleteUser(operator.clerk_id);
    await prisma.user.delete({ where: { user_id: operator.user_id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
