import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { InvoiceDetailResponse } from "@/types/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const invoiceId = Number((await params).invoiceId);

    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return NextResponse.json({ error: "Invalid invoiceId." }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { invoice_id: invoiceId },
      select: {
        invoice_id: true,
        invoice_number: true,
        invoice_date: true,
        location_id: true,
        gin_status: true,
        payment_status: true,
        total_amount: true,
        paid_amount: true,
        credited_amount: true,
        balance_amount: true,
        customer: {
          select: {
            customer_id: true,
            name: true,
          },
        },
        rep: {
          select: {
            rep_id: true,
            full_name: true,
          },
        },
        invoice_lines: {
          orderBy: { line_id: "asc" },
          select: {
            product_id: true,
            quantity: true,
            issued_qty: true,
            returned_qty: true,
            balance_qty: true,
            unit_price: true,
            promotion_type: true,
            discount: true,
            free_quantity: true,
            line_total: true,
            net_line_total: true,
            product: {
              select: {
                product_name: true,
                pack_size: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    const totalAmount = Number(invoice.total_amount);
    const totalPaid = Number(invoice.paid_amount);
    const outstandingAmount = Number(invoice.balance_amount);

    type InvoiceLineRecord = (typeof invoice.invoice_lines)[number];

    const responseBody: InvoiceDetailResponse = {
      data: {
        id: invoice.invoice_id,
        invoiceNo: invoice.invoice_number,
        invoiceDate: invoice.invoice_date.toISOString(),
        customerId: invoice.customer.customer_id,
        customerName: invoice.customer.name,
        repId: invoice.rep.rep_id,
        repName: invoice.rep.full_name,
        locationId: invoice.location_id,
        ginStatus: invoice.gin_status,
        status: invoice.payment_status,
        totalAmount,
        totalPaid,
        creditedAmount: Number(invoice.credited_amount),
        outstandingAmount,
        lines: invoice.invoice_lines.map((line: InvoiceLineRecord) => ({
          productId: line.product_id,
          productName: line.product.product_name,
          packSize: line.product.pack_size,
          quantity: line.quantity,
          issuedQuantity: line.issued_qty,
          returnedQuantity: line.returned_qty,
          balanceQuantity: line.balance_qty,
          unitPrice: Number(line.unit_price),
          promotionType: line.promotion_type,
          discount: Number(line.discount),
          freeQuantity: line.free_quantity,
          lineTotal: Number(line.line_total),
          netLineTotal: Number(line.net_line_total),
        })),
      },
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Failed to load invoice details", error);
    return NextResponse.json(
      { error: "Failed to load invoice details." },
      { status: 500 },
    );
  }
}
