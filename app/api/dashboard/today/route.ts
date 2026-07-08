import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const COLOMBO_OFFSET_MINUTES = 330;

function getColomboMonthBounds(base: Date = new Date()) {
  const shifted = new Date(base.getTime() + COLOMBO_OFFSET_MINUTES * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();

  const startUtc =
    Date.UTC(year, month, 1, 0, 0, 0, 0) - COLOMBO_OFFSET_MINUTES * 60 * 1000;
  const endUtc =
    Date.UTC(year, month + 1, 1, 0, 0, 0, 0) - COLOMBO_OFFSET_MINUTES * 60 * 1000;

  return {
    start: new Date(startUtc),
    end: new Date(endUtc),
  };
}

function canAccess(roleName?: string) {
  const role = roleName?.toLowerCase();
  return role === "admin" || role === "operator";
}

function toAmount(value: unknown): number {
  if (value == null) return 0;
  return Number(value);
}

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccess(currentUser.role?.role_name)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { start, end } = getColomboMonthBounds();

    const [
      invoicesToday,
      receiptsToday,
      ginsToday,
      grnsToday,
      salesReturnsToday,
      creditNotesToday,
      openBalanceAgg,
    ] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          is_active: true,
          invoice_date: { gte: start, lt: end },
        },
        orderBy: [{ invoice_date: "desc" }, { invoice_id: "desc" }],
        select: {
          invoice_id: true,
          invoice_number: true,
          invoice_date: true,
          total_amount: true,
          balance_amount: true,
          credited_amount: true,
          payment_status: true,
          customer_id: true,
          customer: { select: { name: true } },
          rep: { select: { full_name: true } },
        },
      }),
      prisma.receipt.findMany({
        where: {
          is_active: true,
          is_returned: false,
          receipt_date: { gte: start, lt: end },
        },
        orderBy: [{ receipt_date: "desc" }, { receipt_id: "desc" }],
        select: {
          receipt_id: true,
          receipt_number: true,
          receipt_date: true,
          amount: true,
          payment_method: true,
          invoice: {
            select: {
              invoice_number: true,
              customer: { select: { name: true } },
            },
          },
        },
      }),
      prisma.goodsIssueNote.findMany({
        where: { is_active: true, gin_date: { gte: start, lt: end } },
        orderBy: [{ gin_date: "desc" }, { gin_id: "desc" }],
        select: {
          gin_id: true,
          gin_number: true,
          gin_date: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.goodsReceivingNote.findMany({
        where: { is_active: true, grn_date: { gte: start, lt: end } },
        orderBy: [{ grn_date: "desc" }, { grn_id: "desc" }],
        select: {
          grn_id: true,
          grn_number: true,
          grn_date: true,
          location: { select: { code: true } },
        },
      }),
      prisma.salesReturnNote.findMany({
        where: { is_active: true, return_date: { gte: start, lt: end } },
        orderBy: [{ return_date: "desc" }, { return_id: "desc" }],
        select: {
          return_id: true,
          return_number: true,
          return_date: true,
          total_amount: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.creditNote.findMany({
        where: { is_active: true, created_at: { gte: start, lt: end } },
        orderBy: [{ created_at: "desc" }, { credit_note_id: "desc" }],
        select: {
          credit_note_id: true,
          amount: true,
          created_at: true,
          invoice: {
            select: {
              invoice_number: true,
              customer: { select: { name: true } },
            },
          },
        },
      }),
      prisma.invoice.aggregate({
        where: { is_active: true, balance_amount: { gt: 0 } },
        _sum: { balance_amount: true },
      }),
    ]);

    const todaySales = invoicesToday.reduce(
      (sum, inv) => sum + (toAmount(inv.total_amount) - toAmount(inv.credited_amount)),
      0,
    );
    const todayCollections = receiptsToday.reduce(
      (sum, receipt) => sum + toAmount(receipt.amount),
      0,
    );
    const uniqueCustomers = new Set(invoicesToday.map((invoice) => invoice.customer_id));

    const activitiesToday = [
      ...invoicesToday.map((invoice) => ({
        id: `invoice-${invoice.invoice_id}`,
        type: "invoice" as const,
        refNo: invoice.invoice_number,
        title: "Invoice Created",
        subtitle: `${invoice.customer.name} · ${invoice.rep.full_name}`,
        amount: toAmount(invoice.total_amount),
        occurredAt: invoice.invoice_date.toISOString(),
      })),
      ...receiptsToday.map((receipt) => ({
        id: `receipt-${receipt.receipt_id}`,
        type: "receipt" as const,
        refNo: receipt.receipt_number,
        title: "Receipt Recorded",
        subtitle: `${receipt.invoice.customer.name} · ${receipt.payment_method}`,
        amount: toAmount(receipt.amount),
        occurredAt: receipt.receipt_date.toISOString(),
      })),
      ...ginsToday.map((gin) => ({
        id: `gin-${gin.gin_id}`,
        type: "gin" as const,
        refNo: gin.gin_number,
        title: "Goods Issue Note",
        subtitle: gin.customer.name,
        amount: null,
        occurredAt: gin.gin_date.toISOString(),
      })),
      ...grnsToday.map((grn) => ({
        id: `grn-${grn.grn_id}`,
        type: "grn" as const,
        refNo: grn.grn_number,
        title: "Goods Receiving Note",
        subtitle: grn.location.code,
        amount: null,
        occurredAt: grn.grn_date.toISOString(),
      })),
      ...salesReturnsToday.map((salesReturn) => ({
        id: `sales-return-${salesReturn.return_id}`,
        type: "sales_return" as const,
        refNo: salesReturn.return_number,
        title: "Sales Return Note",
        subtitle: salesReturn.customer.name,
        amount: toAmount(salesReturn.total_amount),
        occurredAt: salesReturn.return_date.toISOString(),
      })),
      ...creditNotesToday.map((creditNote) => ({
        id: `credit-note-${creditNote.credit_note_id}`,
        type: "credit_note" as const,
        refNo: `CN-${creditNote.credit_note_id}`,
        title: "Credit Note",
        subtitle: `${creditNote.invoice.customer.name} · ${creditNote.invoice.invoice_number}`,
        amount: toAmount(creditNote.amount),
        occurredAt: creditNote.created_at.toISOString(),
      })),
    ].sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));

    return NextResponse.json({
      kpis: {
        todaySales: Number(todaySales.toFixed(2)),
        todayCustomers: uniqueCustomers.size,
        todayCollections: Number(todayCollections.toFixed(2)),
        allInvoiceBalances: Number(toAmount(openBalanceAgg._sum.balance_amount).toFixed(2)),
        todayInvoices: invoicesToday.length,
      },
      invoicesToday: invoicesToday.map((invoice) => ({
        id: invoice.invoice_id,
        invoiceNo: invoice.invoice_number,
        invoiceDate: invoice.invoice_date.toISOString(),
        customerName: invoice.customer.name,
        repName: invoice.rep.full_name,
        totalAmount: Number(toAmount(invoice.total_amount).toFixed(2)),
        balanceAmount: Number(toAmount(invoice.balance_amount).toFixed(2)),
        status: invoice.payment_status,
      })),
      receiptsToday: receiptsToday.map((receipt) => ({
        id: receipt.receipt_id,
        receiptNo: receipt.receipt_number,
        receiptDate: receipt.receipt_date.toISOString(),
        invoiceNo: receipt.invoice.invoice_number,
        customerName: receipt.invoice.customer.name,
        paymentMethod: receipt.payment_method,
        amount: Number(toAmount(receipt.amount).toFixed(2)),
      })),
      activitiesToday,
    });
  } catch (error) {
    console.error("Failed to load dashboard today data", error);
    return NextResponse.json(
      { error: "Failed to load dashboard today data." },
      { status: 500 },
    );
  }
}
