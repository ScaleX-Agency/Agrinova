import { NextResponse } from "next/server";
import * as z from "zod";
import { createCategory, getAllCategories } from "@/lib/inventoryService";
import { getCurrentUser } from "@/lib/auth";

const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  tag: z
    .string()
    .trim()
    .min(2, "Category tag must be at least 2 characters")
    .max(10, "Category tag must be 10 characters or fewer")
    .regex(
      /^[A-Za-z0-9]+$/,
      "Category tag must contain only letters and numbers",
    ),
});

export async function GET() {
  try {
    const categories = await getAllCategories();
    return NextResponse.json({ categories });
  } catch (err) {
    console.error("[GET /api/categories]", err);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createCategorySchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request body";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const category = await createCategory(parsed.data);
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/categories]", err);

    const isP2002 =
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002";

    if (isP2002) {
      return NextResponse.json(
        { error: "Category tag already exists" },
        { status: 409 },
      );
    }

    const message =
      err instanceof Error ? err.message : "Failed to create category";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
