import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CommissionStatus } from "@prisma/client";

type UpdateCommissionPayloadDto = {
  status: "PENDING" | "PAID" | "CANCELLED";
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
    if (!body.status || !Object.values(CommissionStatus).includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid commission status." },
        { status: 400 },
      );
    }

    const updated = await prisma.commission.update({
      where: { commission_id: commissionId },
      data: {
        status: body.status,
      },
      select: {
        commission_id: true,
        status: true,
        commission_amount: true,
        created_at: true,
      },
    });

    return NextResponse.json({
      data: {
        commissionId: updated.commission_id,
        status: updated.status,
        paidDate: null,
        dueDate: updated.created_at.toISOString(),
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
