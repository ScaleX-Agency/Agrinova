import { NextResponse } from "next/server";
import { deleteMovement } from "@/lib/inventoryService";

export async function DELETE(req: Request, { params }: { params: Promise<{ movementId: string }> }) {
  try {
    const { movementId } = await params;
    await deleteMovement(Number(movementId));
    return NextResponse.json({ deleted: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete movement";
    console.error(`[DELETE /api/stock-movements/${await params.then(p => p.movementId)}]`, err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
