import { NextResponse } from "next/server";
import { getAllCategories } from "@/lib/inventoryService";

export async function GET() {
  try {
    const categories = await getAllCategories();
    return NextResponse.json({ categories });
  } catch (err) {
    console.error("[GET /api/categories]", err);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
