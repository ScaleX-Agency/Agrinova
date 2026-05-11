import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  getDaysToPay,
  getOrCreateActiveCommissionConfig,
  resolveCommissionRate,
} from "@/lib/commissionConfig";
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

    const cfg = await getOrCreateActiveCommissionConfig();

    const createdIds = await prisma.$transaction(async (tx) => {
      const ids: number[] = [];

      for (const item of body.items) {
        const settlementId = Number(item.settlementId);
        if (!Number.isInteger(settlementId) || settlementId <= 0) {
          throw new Error("Invalid settlement id.");
        }

        const settlement = await tx.invoiceSettlement.findUnique({
          where: { settlement_id: settlementId },
          select: {
            settlement_id: true,
            invoice_id: true,
            amount: true,
            settled_date: true,
            settlement_type: true,
            receipt_id: true,
            commission_issued: true,
            is_active: true,
            invoice: {
              select: {
                invoice_date: true,
                rep_id: true,
              },
            },
          },
        });

        if (!settlement) throw new Error(`Settlement ${settlementId} not found.`);
        if (!settlement.is_active) throw new Error(`Settlement ${settlementId} is inactive.`);
        if (settlement.commission_issued) throw new Error(`Settlement ${settlementId} already approved.`);
        let daysToPay = 0;
        let rate = 0;
        let settlementAmount = Number(settlement.amount);

        if (settlement.settlement_type === "RECEIPT") {
          if (settlement.receipt_id == null) {
            throw new Error(`Settlement ${settlementId} must be a receipt settlement.`);
          }
          daysToPay = getDaysToPay(settlement.invoice.invoice_date, settlement.settled_date);
          const overrideRate =
            typeof item.rateOverride === "number" && Number.isFinite(item.rateOverride)
              ? Number(item.rateOverride) / 100
              : undefined;
          rate = resolveCommissionRate(daysToPay, cfg, overrideRate);
        } else if (settlement.settlement_type === "CREDIT_NOTE") {
          const receiptSettlement = await tx.invoiceSettlement.findFirst({
            where: {
              invoice_id: settlement.invoice_id,
              is_active: true,
              settlement_type: "RECEIPT",
              receipt_id: { not: null },
            },
            orderBy: [{ settled_date: "asc" }, { settlement_id: "asc" }],
            select: {
              settlement_id: true,
              settled_date: true,
              invoice: { select: { invoice_date: true } },
              commissions: {
                orderBy: { commission_id: "desc" },
                take: 1,
                select: { commission_rate: true },
              },
            },
          });

          if (!receiptSettlement) {
            throw new Error(
              `Credit-note settlement ${settlementId} requires a receipt settlement on the same invoice.`,
            );
          }

          daysToPay = getDaysToPay(
            receiptSettlement.invoice.invoice_date,
            receiptSettlement.settled_date,
          );
          const inheritedRateFromApprovedReceipt = receiptSettlement.commissions[0]
            ? Number(receiptSettlement.commissions[0].commission_rate)
            : undefined;
          rate = resolveCommissionRate(daysToPay, cfg, inheritedRateFromApprovedReceipt);
          settlementAmount = settlementAmount * -1;
        } else {
          throw new Error(`Settlement ${settlementId} is not commission eligible.`);
        }

        const commissionAmount = settlementAmount * rate;

        const created = await tx.commission.create({
          data: {
            rep_id: settlement.invoice.rep_id,
            commission_rate: rate,
            commission_amount: commissionAmount,
            days_to_pay: daysToPay,
            status: "PENDING",
            settlement_id: settlement.settlement_id,
          },
          select: { commission_id: true },
        });

        await tx.invoiceSettlement.update({
          where: { settlement_id: settlement.settlement_id },
          data: { commission_issued: true },
        });

        ids.push(created.commission_id);
      }

      return ids;
    });

    const response: ApprovePendingCommissionsResponse = {
      data: {
        approvedCount: createdIds.length,
        commissionIds: createdIds,
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve pending commissions.";
    console.error("Failed to approve pending commissions", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
