import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  getDaysToPay,
  getOrCreateActiveCommissionConfig,
  resolveCommissionRate,
} from "@/lib/commissionConfig";
import { getReceiptNumber } from "@/lib/commission";
import type { PendingCommissionsResponse } from "@/types/api";

const canManageCommission = (roleName?: string) => {
  const role = roleName?.toLowerCase();
  return role === "admin" || role === "operator";
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageCommission(user.role?.role_name)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cfg = await getOrCreateActiveCommissionConfig();
    const settlements = await prisma.invoiceSettlement.findMany({
      where: {
        is_active: true,
        commission_issued: false,
        settlement_type: { in: ["RECEIPT", "CREDIT_NOTE"] },
      },
      orderBy: [{ settled_date: "desc" }, { settlement_id: "desc" }],
      select: {
        settlement_id: true,
        settlement_type: true,
        settled_date: true,
        amount: true,
        invoice: {
          select: {
            invoice_id: true,
            invoice_number: true,
            invoice_date: true,
            customer: { select: { name: true } },
            rep: { select: { rep_id: true, full_name: true } },
          },
        },
        receipt: {
          select: {
            receipt_id: true,
            receipt_date: true,
          },
        },
      },
    });

    const invoiceIds = Array.from(
      new Set(settlements.map((s) => s.invoice.invoice_id)),
    );
    const receiptSettlements = await prisma.invoiceSettlement.findMany({
      where: {
        is_active: true,
        settlement_type: "RECEIPT",
        receipt_id: { not: null },
        invoice_id: { in: invoiceIds },
      },
      orderBy: [{ settled_date: "asc" }, { settlement_id: "asc" }],
      select: {
        invoice_id: true,
        commission_issued: true,
        settled_date: true,
        receipt: {
          select: {
            receipt_id: true,
            receipt_date: true,
          },
        },
      },
    });
    const receiptByInvoiceId = new Map<number, (typeof receiptSettlements)[number]>();
    for (const r of receiptSettlements) {
      if (!receiptByInvoiceId.has(r.invoice_id)) {
        receiptByInvoiceId.set(r.invoice_id, r);
      }
    }

    const rows = settlements
      .map((s) => {
        const receiptSettlementForInvoice = receiptByInvoiceId.get(
          s.invoice.invoice_id,
        );

        if (!receiptSettlementForInvoice || !receiptSettlementForInvoice.receipt) return null;
        if (
          s.settlement_type === "CREDIT_NOTE" &&
          receiptSettlementForInvoice.commission_issued !== true
        ) {
          return null;
        }

        const baseReceiptDate = receiptSettlementForInvoice.settled_date;
        const daysToPay = getDaysToPay(s.invoice.invoice_date, baseReceiptDate);
        const rate = resolveCommissionRate(daysToPay, cfg);
        const settlementAmount = Number(s.amount);
        const signedAmount =
          s.settlement_type === "CREDIT_NOTE" ? settlementAmount * -1 : settlementAmount;
        const commissionAmount = signedAmount * rate;
        const conditionLabel =
          daysToPay <= 0
            ? "Same-day"
            : daysToPay >= cfg.rangeMinDays && daysToPay <= cfg.rangeMaxDays
              ? `${cfg.rangeMinDays}-${cfg.rangeMaxDays} days`
              : `>${cfg.rangeMaxDays} days`;

        return {
          settlementId: s.settlement_id,
          settlementType: s.settlement_type,
          invoiceId: s.invoice.invoice_id,
          invoiceNo: s.invoice.invoice_number ?? "",
          invoiceDate: s.invoice.invoice_date.toISOString(),
          receiptId: receiptSettlementForInvoice.receipt!.receipt_id,
          receiptNo: getReceiptNumber(
            receiptSettlementForInvoice.receipt!.receipt_id,
            receiptSettlementForInvoice.receipt!.receipt_date,
          ),
          receiptDate: receiptSettlementForInvoice.receipt!.receipt_date.toISOString(),
          customerName: s.invoice.customer?.name ?? "",
          repId: s.invoice.rep.rep_id,
          repName: s.invoice.rep.full_name,
          settlementDate: s.settled_date.toISOString(),
          settlementAmount: Number(signedAmount.toFixed(2)),
          daysToPay,
          appliedRate: Number((rate * 100).toFixed(4)),
          computedCommissionAmount: Number(commissionAmount.toFixed(2)),
          conditionLabel,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const response: PendingCommissionsResponse = { data: { rows } };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to load pending commissions", error);
    return NextResponse.json({ error: "Failed to load pending commissions." }, { status: 500 });
  }
}
