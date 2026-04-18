import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CommissionSummaryResponse, RepCommissionSummaryDto } from "@/types/api";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const getMonthRange = (monthParam: string | null) => {
	if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth();
		const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
		const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
		return {
			month: `${year}-${String(month + 1).padStart(2, "0")}`,
			start,
			end,
		};
	}

	const [year, month] = monthParam.split("-").map(Number);
	const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
	const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
	return { month: monthParam, start, end };
};

const getDaysToPay = (invoiceDate: Date, cashCollectedDate: Date) =>
	Math.floor((cashCollectedDate.getTime() - invoiceDate.getTime()) / MS_PER_DAY);

const getCommissionRate = (days: number) => {
	if (days <= 0) return 0.025;
	if (days <= 65) return 0.02;
	return 0;
};

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const { month, start, end } = getMonthRange(searchParams.get("month"));

		const receipts = await prisma.receipt.findMany({
			where: {
				receipt_date: {
					gte: start,
					lt: end,
				},
			},
			select: {
				receipt_id: true,
				receipt_date: true,
				amount_received: true,
				invoice: {
					select: {
						invoice_id: true,
						invoice_date: true,
						total_amount: true,
						rep: {
							select: {
								rep_id: true,
								full_name: true,
							},
						},
					},
				},
			},
			orderBy: { receipt_date: "desc" },
		});

		type Aggregate = {
			repId: number;
			repName: string;
			invoiceIds: Set<number>;
			totalSales: number;
			cashCollected: number;
			daysSum: number;
			daysCount: number;
			commissionAmount: number;
		};

		const byRep = new Map<number, Aggregate>();

		for (const receipt of receipts) {
			const repId = receipt.invoice.rep.rep_id;
			const repName = receipt.invoice.rep.full_name;
			const invoiceId = receipt.invoice.invoice_id;
			const invoiceAmount = Number(receipt.invoice.total_amount);
			const cashCollected = Number(receipt.amount_received);
			const days = getDaysToPay(receipt.invoice.invoice_date, receipt.receipt_date);
			const rate = getCommissionRate(days);
			const commissionAmount = invoiceAmount * rate;

			const existing = byRep.get(repId) ?? {
				repId,
				repName,
				invoiceIds: new Set<number>(),
				totalSales: 0,
				cashCollected: 0,
				daysSum: 0,
				daysCount: 0,
				commissionAmount: 0,
			};

			if (!existing.invoiceIds.has(invoiceId)) {
				existing.invoiceIds.add(invoiceId);
				existing.totalSales += invoiceAmount;
			}

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
				month,
				startDate: start.toISOString(),
				endDate: end.toISOString(),
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
