import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  CommissionRepDetailResponse,
  CommissionReceiptDetailDto,
} from "@/types/api";

const getMonthRange = (monthParam: string | null) => {
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return { month: null, start: null, end: null };
  }

  const [year, month] = monthParam.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { month: monthParam, start, end };
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ commissionId: string }> },
) {
  try {
    const repId = Number((await params).commissionId);
    if (!Number.isInteger(repId) || repId <= 0) {
      return NextResponse.json(
        { error: "Invalid sales rep id." },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const { month, start, end } = getMonthRange(searchParams.get("month"));

    const rep = await prisma.salesRep.findUnique({
      where: { rep_id: repId },
      select: { rep_id: true, full_name: true },
    });

    if (!rep) {
      return NextResponse.json(
        { error: "Sales rep not found." },
        { status: 404 },
      );
    }

    const commissions = await prisma.commission.findMany({
      where: {
        rep_id: repId,
        ...(start && end
          ? {
              invoice: {
                invoice_date: {
                  gte: start,
                  lt: end,
                },
              },
            }
          : {}),
      },
      select: {
        commission_id: true,
        rep_id: true,
        days_to_pay: true,
        commission_rate: true,
        commission_amount: true,
        due_date: true,
        paid_date: true,
        status: true,
        invoice: {
          select: {
            invoice_id: true,
            invoice_number: true,
            invoice_date: true,
            status: true,
            total_amount: true,
            location: {
              select: {
                location_id: true,
                code: true,
              },
            },
            invoice_lines: {
              select: {
                product: {
                  select: {
                    category: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
        receipt: {
          select: {
            receipt_id: true,
            receipt_date: true,
            amount_received: true,
          },
        },
      },
      orderBy: { due_date: "desc" },
    });

    type CommissionRow = {
      commission_id: number | string;
      amount_earned?: number | string | null;
      commission_amount?: number | string | null;
      status?: string | null;
      invoice: {
        invoice_id?: number | string;
        invoice_number?: string | null;
        total_amount: number | string;
      };
      receipt: {
        receipt_id: number | string;
        amount_received: number | string;
        receipt_date?: Date | string | null;
        receipt_number?: string | null;
      } | null;
    };

    const rows: CommissionReceiptDetailDto[] = commissions.map(
      (commission: CommissionRow) => {
        const invoiceAmount = Number(commission.invoice.total_amount);
        const cashCollected = commission.receipt
          ? Number(commission.receipt.amount_received)
          : 0;
        const receiptId =
          commission.receipt?.receipt_id != null
            ? Number(commission.receipt.receipt_id)
            : null;

        return {
          commissionId: Number(commission.commission_id),
          invoiceAmount,
          cashCollected,
          receiptId,
          // keep or adjust these fields to match your DTO exactly:
          amountEarned:
            commission.amount_earned != null
              ? Number(commission.amount_earned)
              : 0,
          commissionAmount:
            commission.commission_amount != null
              ? Number(commission.commission_amount)
              : 0,
          status: commission.status ?? null,
          invoiceNumber: commission.invoice.invoice_number ?? null,
          receiptNumber: commission.receipt?.receipt_number ?? null,
          receiptDate: commission.receipt?.receipt_date ?? null,
        };
      },
    );
    const uniqueReceiptIds = new Set(rows.map((row) => row.receiptId));
    const uniqueInvoiceIds = new Set(rows.map((row) => row.invoiceId));
    const totalSales = Number(
      commissions
        .filter(
          (c, index, arr) =>
            arr.findIndex(
              (x) => x.invoice.invoice_id === c.invoice.invoice_id,
            ) === index,
        )
        .reduce((sum, c) => sum + Number(c.invoice.total_amount), 0)
        .toFixed(2),
    );
    const cashCollected = Number(
      rows.reduce((sum, row) => sum + row.cashCollected, 0).toFixed(2),
    );
    const avgDays = Number(
      (rows.length > 0
        ? rows.reduce((sum, row) => sum + row.daysToPay, 0) / rows.length
        : 0
      ).toFixed(2),
    );
    const commissionAmount = Number(
      rows.reduce((sum, row) => sum + row.commissionAmount, 0).toFixed(2),
    );

    const responseBody: CommissionRepDetailResponse = {
      data: {
        repId: rep.rep_id,
        repName: rep.full_name,
        month: month ?? "all",
        rows,
        receiptCount: uniqueReceiptIds.size,
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
    return NextResponse.json(
      { error: "Failed to load commission detail." },
      { status: 500 },
    );
  }
}
