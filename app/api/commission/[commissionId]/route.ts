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
        is_active: true,
        invoiceSettlement: {
          is: { is_active: true },
        },
      },
      select: {
        commission_id: true,
        rep_id: true,
        days_to_pay: true,
        commission_rate: true,
        commission_amount: true,
        status: true,
        created_at: true,
        invoiceSettlement: {
          select: {
            settlement_id: true,
            settled_date: true,
            amount: true,
            invoice: {
              select: {
                invoice_id: true,
                invoice_number: true,
                invoice_date: true,
                payment_status: true,
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
                amount: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const allRows: CommissionReceiptDetailDto[] = [];
    
    for (const commission of commissions) {
      const settlement = commission.invoiceSettlement;
      if (!settlement) {
        continue;
      }
      if (start && end) {
        const invoiceDate = new Date(settlement.invoice.invoice_date);
        if (invoiceDate < start || invoiceDate >= end) {
          continue;
        }
      }

      const invoice = settlement.invoice;
      const receipt = settlement.receipt;
      
      const invoiceAmount = Number(invoice.total_amount);
      const cashCollected = receipt ? Number(receipt.amount) : 0;
      const receiptId = receipt?.receipt_id != null ? Number(receipt.receipt_id) : null;

      allRows.push({
        commissionId: commission.commission_id,
        receiptId,
        receiptNo: null,
        receiptDate: receipt?.receipt_date ? new Date(receipt.receipt_date).toISOString() : null,
        invoiceId: invoice.invoice_id,
        invoiceNo: invoice.invoice_number ?? "",
        invoiceDate: invoice.invoice_date ? new Date(invoice.invoice_date).toISOString() : "",
        salesStatus: invoice.payment_status,
        customerName: invoice.customer?.name ?? "",
        locationId: invoice.location?.location_id ?? null,
        locationCode: invoice.location?.code ?? null,
        categories: Array.from(
          new Set(
            invoice.invoice_lines.map((line) => line.product?.category?.name ?? ""),
          ),
        ).filter(Boolean),
        invoiceAmount,
        cashCollected,
        daysToPay: commission.days_to_pay ?? 0,
        commissionRate: commission.commission_rate ? Number(commission.commission_rate) : 0,
        commissionAmount: commission.commission_amount ? Number(commission.commission_amount) : 0,
        dueDate: settlement.settled_date ? new Date(settlement.settled_date).toISOString() : "",
        paidDate: null,
        status: (commission.status ?? "PENDING") as "PENDING" | "PAID" | "OVERDUE",
      });
    }

    const rows = allRows;
    const uniqueReceiptIds = new Set(rows.map((row) => row.receiptId).filter(Boolean) as number[]);
    const uniqueInvoiceIds = new Set(rows.map((row) => row.invoiceId));
    const totalSales = Number(
      rows
        .reduce((sum, row) => sum + row.invoiceAmount, 0)
        .toFixed(2),
    );
    const cashCollectedTotal = Number(
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
        cashCollected: cashCollectedTotal,
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
