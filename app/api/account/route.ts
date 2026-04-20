import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import * as z from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateAccountSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .optional(),
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

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      account: {
        user_id: currentUser.user_id,
        clerk_id: currentUser.clerk_id,
        full_name: currentUser.full_name,
        username: currentUser.username,
        role_name: currentUser.role.role_name,
        ...splitFullName(currentUser.full_name),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getValidationError(parsed.error) },
      { status: 400 },
    );
  }

  const { firstName, lastName, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const fullName = `${firstName} ${lastName}`.trim();
  const hasEmailChanged =
    normalizedEmail !== currentUser.username.trim().toLowerCase();

  if (!currentUser.clerk_id) {
    return NextResponse.json(
      { error: "User is missing clerk_id and cannot be synced with Clerk." },
      { status: 409 },
    );
  }

  if (hasEmailChanged) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username: normalizedEmail,
        NOT: { user_id: currentUser.user_id },
      },
      select: { user_id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }
  }

  try {
    const client = await clerkClient();

    await client.users.updateUser(currentUser.clerk_id, {
      firstName,
      lastName,
      ...(password ? { password } : {}),
    });

    if (hasEmailChanged) {
      const clerkUser = await client.users.getUser(currentUser.clerk_id);
      const existingEmailAddress = clerkUser.emailAddresses.find(
        (emailAddress) =>
          emailAddress.emailAddress.toLowerCase() === normalizedEmail,
      );

      let primaryEmailAddressId = existingEmailAddress?.id;

      if (existingEmailAddress) {
        await client.emailAddresses.updateEmailAddress(
          existingEmailAddress.id,
          {
            verified: true,
          },
        );
      } else {
        const createdEmailAddress =
          await client.emailAddresses.createEmailAddress({
            userId: currentUser.clerk_id,
            emailAddress: normalizedEmail,
            verified: true,
          });
        primaryEmailAddressId = createdEmailAddress.id;
      }

      if (primaryEmailAddressId) {
        await client.users.updateUser(currentUser.clerk_id, {
          primaryEmailAddressID: primaryEmailAddressId,
          notifyPrimaryEmailAddressChanged: false,
        });
      }

      const previousEmailAddress = clerkUser.emailAddresses.find(
        (emailAddress) =>
          emailAddress.emailAddress.toLowerCase() ===
            currentUser.username.trim().toLowerCase() &&
          emailAddress.id !== primaryEmailAddressId,
      );

      if (previousEmailAddress) {
        await client.emailAddresses.deleteEmailAddress(previousEmailAddress.id);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { user_id: currentUser.user_id },
      data: {
        full_name: fullName,
        username: normalizedEmail,
      },
      include: { role: true },
    });

    return NextResponse.json({
      account: {
        user_id: updatedUser.user_id,
        clerk_id: updatedUser.clerk_id,
        full_name: updatedUser.full_name,
        username: updatedUser.username,
        role_name: updatedUser.role.role_name,
        ...splitFullName(updatedUser.full_name),
      },
    });
  } catch (error: unknown) {
    const isP2002 =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002";

    if (isP2002) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
