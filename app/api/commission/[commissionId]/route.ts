import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CommissionRepDetailResponse, CommissionReceiptDetailDto } from "@/types/api";

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

const toReceiptNo = (receiptId: number, receiptDate: Date) => {
	const year = receiptDate.getFullYear();
	const month = String(receiptDate.getMonth() + 1).padStart(2, "0");
	return `RCP-${year}${month}-${String(receiptId).padStart(3, "0")}`;
};

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ commissionId: string }> },
) {
	try {
		const repId = Number((await params).commissionId);
		if (!Number.isInteger(repId) || repId <= 0) {
			return NextResponse.json({ error: "Invalid sales rep id." }, { status: 400 });
		}

		const { searchParams } = new URL(request.url);
		const { month, start, end } = getMonthRange(searchParams.get("month"));

		const rep = await prisma.salesRep.findUnique({
			where: { rep_id: repId },
			select: { rep_id: true, full_name: true },
		});

		if (!rep) {
			return NextResponse.json({ error: "Sales rep not found." }, { status: 404 });
		}

		const receipts = await prisma.receipt.findMany({
			where: {
				receipt_date: {
					gte: start,
					lt: end,
				},
				invoice: {
					rep_id: repId,
				},
			},
			select: {
				receipt_id: true,
				receipt_date: true,
				amount_received: true,
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
					},
				},
			},
			orderBy: { receipt_date: "desc" },
		});

		const rows: CommissionReceiptDetailDto[] = receipts.map((receipt) => {
			const invoiceAmount = Number(receipt.invoice.total_amount);
			const cashCollected = Number(receipt.amount_received);
			const daysToPay = getDaysToPay(receipt.invoice.invoice_date, receipt.receipt_date);
			const rate = getCommissionRate(daysToPay);
			const commissionAmount = invoiceAmount * rate;

			return {
				receiptId: receipt.receipt_id,
				receiptNo: toReceiptNo(receipt.receipt_id, receipt.receipt_date),
				receiptDate: receipt.receipt_date.toISOString(),
				invoiceId: receipt.invoice.invoice_id,
				invoiceNo: receipt.invoice.invoice_number,
				invoiceDate: receipt.invoice.invoice_date.toISOString(),
				customerName: receipt.invoice.customer.name,
				invoiceAmount: Number(invoiceAmount.toFixed(2)),
				cashCollected: Number(cashCollected.toFixed(2)),
				daysToPay,
				commissionRate: Number((rate * 100).toFixed(2)),
				commissionAmount: Number(commissionAmount.toFixed(2)),
			};
		});

		const uniqueInvoiceIds = new Set(rows.map((row) => row.invoiceId));
		const totalSales = Number(
			rows
				.filter((row, index, arr) => arr.findIndex((x) => x.invoiceId === row.invoiceId) === index)
				.reduce((sum, row) => sum + row.invoiceAmount, 0)
				.toFixed(2),
		);
		const cashCollected = Number(rows.reduce((sum, row) => sum + row.cashCollected, 0).toFixed(2));
		const avgDays = Number(
			(rows.length > 0 ? rows.reduce((sum, row) => sum + row.daysToPay, 0) / rows.length : 0).toFixed(2),
		);
		const commissionAmount = Number(rows.reduce((sum, row) => sum + row.commissionAmount, 0).toFixed(2));

		const responseBody: CommissionRepDetailResponse = {
			data: {
				repId: rep.rep_id,
				repName: rep.full_name,
				month,
				rows,
				invoiceCount: uniqueInvoiceIds.size,
				totalSales,
				cashCollected,
				avgDays,
				commissionAmount,
			},
		};

		return NextResponse.json(responseBody);
	} catch (error) {
		console.error("Failed to load commission detail", error);
		return NextResponse.json({ error: "Failed to load commission detail." }, { status: 500 });
	}
}
