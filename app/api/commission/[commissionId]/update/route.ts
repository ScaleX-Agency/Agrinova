import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type UpdateCommissionPayloadDto = {
  status: "PENDING" | "PAID" | "OVERDUE";
  paidDate?: string; // ISO string
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ commissionId: string }> },
) {
  try {
    const commissionId = Number((await params).commissionId);
    if (!Number.isInteger(commissionId) || commissionId <= 0) {
      return NextResponse.json(
        { error: "Invalid commission id." },
        { status: 400 },
      );
    }

    const body: UpdateCommissionPayloadDto = await request.json();
    if (!body.status || !["PENDING", "PAID", "OVERDUE"].includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid commission status." },
        { status: 400 },
      );
    }

    const paidDate =
      body.status === "PAID" && body.paidDate ? new Date(body.paidDate) : null;

    const updated = await prisma.commission.update({
      where: { commission_id: commissionId },
      data: {
        status: body.status,
        paid_date: paidDate,
      },
      select: {
        commission_id: true,
        status: true,
        paid_date: true,
        due_date: true,
        commission_amount: true,
      },
    });

    return NextResponse.json({
      data: {
        commissionId: updated.commission_id,
        status: updated.status,
        paidDate: updated.paid_date?.toISOString() ?? null,
        dueDate: updated.due_date.toISOString(),
        commissionAmount: Number(updated.commission_amount),
      },
    });
  } catch (error) {
    console.error("Failed to update commission", error);
    return NextResponse.json(
      { error: "Failed to update commission." },
      { status: 500 },
    );
  }
}
