import { NextResponse } from "next/server";
import { importStock } from "@/lib/inventoryService";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const data = await req.json() as any[];
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.user_id;

    const imported = await importStock(data, userId);
    return NextResponse.json({ imported }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to import stock";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
