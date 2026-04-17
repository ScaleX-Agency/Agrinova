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
        total_amount: true,
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
            unit_price: true,
            line_total: true,
            product: {
              select: {
                product_name: true,
                pack_size: true,
              },
            },
          },
        },
        receipts: {
          select: {
            amount_received: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    const totalAmount = Number(invoice.total_amount);
    const totalPaid = invoice.receipts.reduce((sum, receipt) => sum + Number(receipt.amount_received), 0);
    const outstandingAmount = Math.max(0, totalAmount - totalPaid);

    const responseBody: InvoiceDetailResponse = {
      data: {
        id: invoice.invoice_id,
        invoiceNo: invoice.invoice_number,
        invoiceDate: invoice.invoice_date.toISOString(),
        customerId: invoice.customer.customer_id,
        customerName: invoice.customer.name,
        repId: invoice.rep.rep_id,
        repName: invoice.rep.full_name,
        totalAmount,
        totalPaid,
        outstandingAmount,
        lines: invoice.invoice_lines.map((line) => ({
          productId: line.product_id,
          productName: line.product.product_name,
          packSize: line.product.pack_size,
          quantity: line.quantity,
          unitPrice: Number(line.unit_price),
          lineTotal: Number(line.line_total),
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