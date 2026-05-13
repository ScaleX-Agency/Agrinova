import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type {
  ApprovePendingCommissionsRequestDto,
  ApprovePendingCommissionsResponse,
} from "@/types/api";

const canManageCommission = (roleName?: string) => {
  const role = roleName?.toLowerCase();
  return role === "admin" || role === "operator";
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageCommission(user.role?.role_name)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as ApprovePendingCommissionsRequestDto;
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "No approval items provided." }, { status: 400 });
    }

    const approvedIds = await prisma.$transaction(async (tx) => {
      const ids: number[] = [];

      for (const item of body.items) {
        const commissionId = Number(item.commissionId);
        if (!Number.isInteger(commissionId) || commissionId <= 0) {
          throw new Error("Invalid commission id.");
        }

        const commission = await tx.commission.findUnique({
          where: { commission_id: commissionId },
          select: {
            commission_id: true,
            is_active: true,
            status: true,
            commission_rate: true,
            commission_amount: true,
            invoiceSettlement: {
              select: {
                settlement_id: true,
                settlement_type: true,
                amount: true,
              },
            },
          },
        });

        if (!commission) throw new Error(`Commission ${commissionId} not found.`);
        if (!commission.is_active) throw new Error(`Commission ${commissionId} is inactive.`);
        if (commission.status !== "PENDING") throw new Error(`Commission ${commissionId} is not pending.`);

        const isReceipt = commission.invoiceSettlement.settlement_type === "RECEIPT";

        // For receipt commissions: allow rate override
        if (isReceipt && typeof item.rateOverride === "number" && Number.isFinite(item.rateOverride)) {
          const newRate = item.rateOverride / 100; // Convert from percentage
          const settlementAmount = Number(commission.invoiceSettlement.amount);
          const newCommissionAmount = Number((settlementAmount * newRate).toFixed(2));

          await tx.commission.update({
            where: { commission_id: commissionId },
            data: {
              commission_rate: newRate,
              commission_amount: newCommissionAmount,
              status: "PAID",
            },
          });
        } else {
          // Just mark as PAID without changing rate/amount
          await tx.commission.update({
            where: { commission_id: commissionId },
            data: { status: "PAID" },
          });
        }

        ids.push(commissionId);
      }

      return ids;
    });

    const response: ApprovePendingCommissionsResponse = {
      data: {
        approvedCount: approvedIds.length,
        commissionIds: approvedIds,
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve commissions.";
    console.error("Failed to approve commissions", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
