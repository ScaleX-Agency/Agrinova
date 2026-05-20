import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ReceiptCommissionResponse } from "@/types/api";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ receiptId: string }> },
) {
	try {
		const receiptId = Number((await params).receiptId);

		if (!Number.isInteger(receiptId) || receiptId <= 0) {
			return NextResponse.json({ error: "Invalid receiptId." }, { status: 400 });
		}

		const receipt = await prisma.receipt.findUnique({
			where: { receipt_id: receiptId },
			select: {
				receipt_id: true,
        receipt_number: true,
        is_active: true,
				receipt_date: true,
				invoice: {
					select: {
						invoice_id: true,
						invoice_number: true,
						invoice_date: true,
						total_amount: true,
						customer: {
							select: {
								name: true,
							},
						},
						rep: {
							select: {
								full_name: true,
							},
						},
					},
				},
				invoiceSettlements: {
          where: { is_active: true },
					select: {
						commissions: {
              where: { is_active: true },
							select: {
								commission_id: true,
								commission_rate: true,
								commission_amount: true,
								days_to_pay: true,
								status: true,
								created_at: true,
							},
							orderBy: {
								commission_id: "desc",
							},
							take: 1,
						},
					},
				},
			},
		});

		if (!receipt || !receipt.is_active) {
			return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
		}

		const settlement = receipt.invoiceSettlements.find((s) => s.commissions.length > 0);
		const commission = settlement?.commissions[0];
		
		if (!commission) {
			return NextResponse.json({ error: "Commission not found for this receipt." }, { status: 404 });
		}

		const responseBody: ReceiptCommissionResponse = {
			data: {
				commissionId: commission.commission_id,
				receiptId: receipt.receipt_id,
				receiptNo: receipt.receipt_number,
				receiptDate: receipt.receipt_date.toISOString(),
				invoiceId: receipt.invoice.invoice_id,
				invoiceNo: receipt.invoice.invoice_number ?? "",
				invoiceDate: receipt.invoice.invoice_date.toISOString(),
				customerName: receipt.invoice.customer?.name ?? "",
				salesRepName: receipt.invoice.rep?.full_name ?? "",
				invoiceAmount: Number(Number(receipt.invoice.total_amount).toFixed(2)),
				daysToPay: commission.days_to_pay,
				commissionRate: Number((Number(commission.commission_rate) * 100).toFixed(2)),
				commissionAmount: Number(Number(commission.commission_amount).toFixed(2)),
				dueDate: commission.created_at.toISOString(),
				paidDate: null,
				status: commission.status as "PENDING" | "PAID" | "OVERDUE",
			},
		};

		return NextResponse.json(responseBody);
	} catch (error) {
		console.error("Failed to load receipt commission", error);
		return NextResponse.json(
			{ error: "Failed to load receipt commission." },
			{ status: 500 },
		);
	}
}
