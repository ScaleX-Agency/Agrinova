import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CommissionSummaryResponse, RepCommissionSummaryDto } from "@/types/api";

const getMonthRange = (monthParam: string | null) => {
	if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
		return { month: null, start: null, end: null };
	}

	const [year, month] = monthParam.split("-").map(Number);
	const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
	const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
	return { month: monthParam, start, end };
};

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const { month, start, end } = getMonthRange(searchParams.get("month"));

		const commissions = await prisma.commission.findMany({
			select: {
				commission_id: true,
				rep_id: true,
				days_to_pay: true,
				commission_rate: true,
				commission_amount: true,
				status: true,
				rep: {
					select: {
						rep_id: true,
						full_name: true,
					},
				},
				invoiceSettlement: {
					select: {
						amount: true,
						settled_date: true,
						invoice: {
							select: {
								invoice_id: true,
								invoice_date: true,
								total_amount: true,
							},
						},
						receipt: {
							select: {
								receipt_id: true,
								receipt_date: true,
								amount: true,
							},
						},
					},
				},
			},
		});

		type Aggregate = {
			repId: number;
			repName: string;
			receiptIds: Set<number>;
			invoiceIds: Set<number>;
			totalSales: number;
			cashCollected: number;
			daysSum: number;
			daysCount: number;
			commissionAmount: number;
		};

		const byRep = new Map<number, Aggregate>();

		for (const commission of commissions) {
			const repId = commission.rep_id;
			const repName = commission.rep.full_name;
			const days = Number(commission.days_to_pay);
			const commissionAmount = Number(commission.commission_amount);

			const settlement = commission.invoiceSettlement;
			if (!settlement) continue;
			if (start && end) {
				const invoiceDate = new Date(settlement.invoice.invoice_date);
				if (invoiceDate < start || invoiceDate >= end) {
					continue;
				}
			}

			const invoiceId = settlement.invoice.invoice_id;
			const invoiceAmount = Number(settlement.invoice.total_amount);
			const receiptId = settlement.receipt?.receipt_id ?? null;
			const cashCollected = settlement.receipt ? Number(settlement.receipt.amount) : 0;

			const existing = byRep.get(repId) ?? {
				repId,
				repName,
				receiptIds: new Set<number>(),
				invoiceIds: new Set<number>(),
				totalSales: 0,
				cashCollected: 0,
				daysSum: 0,
				daysCount: 0,
				commissionAmount: 0,
			};

			if (receiptId) {
				existing.receiptIds.add(receiptId);
			}
			existing.invoiceIds.add(invoiceId);
			existing.totalSales += invoiceAmount;
			existing.cashCollected += cashCollected;
			existing.daysSum += days;
			existing.daysCount += 1;
			existing.commissionAmount += commissionAmount;

			byRep.set(repId, existing);
		}

		const rows: RepCommissionSummaryDto[] = Array.from(byRep.values())
			.map((row) => {
				const avgDays = row.daysCount > 0 ? row.daysSum / row.daysCount : 0;
				const commissionRate = row.totalSales > 0 ? (row.commissionAmount / row.totalSales) * 100 : 0;

				return {
					repId: row.repId,
					repName: row.repName,
					receiptCount: row.receiptIds.size,
					invoiceCount: row.invoiceIds.size,
					totalSales: Number(row.totalSales.toFixed(2)),
					cashCollected: Number(row.cashCollected.toFixed(2)),
					avgDays: Number(avgDays.toFixed(2)),
					commissionRate: Number(commissionRate.toFixed(2)),
					commissionAmount: Number(row.commissionAmount.toFixed(2)),
				};
			})
			.sort((a, b) => b.commissionAmount - a.commissionAmount);

		const grandTotalCommission = Number(
			rows.reduce((sum, row) => sum + row.commissionAmount, 0).toFixed(2),
		);

		const responseBody: CommissionSummaryResponse = {
			data: {
				month: month ?? "all",
				startDate: start ? start.toISOString() : "",
				endDate: end ? end.toISOString() : "",
				rows,
				grandTotalCommission,
			},
		};

		return NextResponse.json(responseBody);
	} catch (error) {
		console.error("Failed to load commission summary", error);
		return NextResponse.json({ error: "Failed to load commission summary." }, { status: 500 });
	}
}
