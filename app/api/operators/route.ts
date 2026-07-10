import { NextResponse } from "next/server";
import { clerkClient } from "@/lib/clerk-server-mock";
import { Prisma } from "@prisma/client";
import * as z from "zod";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const OPERATOR_ROLE_ID = 2;

const createOperatorSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long."),
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
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

function getValidationError(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) {
    return "Invalid input";
  }

  const field = issue.path[0];
  if (field === "password") {
    return "Password must be at least 8 characters long.";
  }

  return issue.message;
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

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return guard.response;
    }

    const operators = await prisma.user.findMany({
      where: { role_id: OPERATOR_ROLE_ID },
      orderBy: { user_id: "desc" },
      select: {
        user_id: true,
        clerk_id: true,
        full_name: true,
        username: true,
      },
    });

    return NextResponse.json({
      operators: operators.map((operator) => ({
        ...operator,
        ...splitFullName(operator.full_name),
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const body = await req.json();
  const parsed = createOperatorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getValidationError(parsed.error) },
      { status: 400 },
    );
  }

  const { email, password, firstName, lastName } = parsed.data;
  const fullName = `${firstName} ${lastName}`.trim();

  const client = await clerkClient();
  let createdClerkUserId: string | null = null;

  try {
    const clerkUser = await client.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      lastName,
    });

    createdClerkUserId = clerkUser.id;

    const operator = await prisma.user.create({
      data: {
        clerk_id: clerkUser.id,
        role_id: OPERATOR_ROLE_ID,
        full_name: fullName,
        username: email,
        password_hash: null,
      },
      select: {
        user_id: true,
        clerk_id: true,
        full_name: true,
        username: true,
      },
    });

    return NextResponse.json(
      {
        operator: {
          ...operator,
          ...splitFullName(operator.full_name),
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (createdClerkUserId) {
      try {
        await client.users.deleteUser(createdClerkUserId);
      } catch (cleanupError) {
        console.error(
          "Failed to rollback Clerk operator creation",
          cleanupError,
        );
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An operator with this email already exists." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
