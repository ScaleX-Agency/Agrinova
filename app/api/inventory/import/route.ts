import { NextResponse } from "next/server";
import { importStock } from "@/lib/inventoryService";

export async function POST(req: Request) {
  try {
    const data = await req.json() as any[];
    // TODO: real session
    const userId = 1;

    const imported = await importStock(data, userId);
    return NextResponse.json({ imported }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to import stock";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
