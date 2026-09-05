import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceNumber: string }> },
) {
  try {
    const invoiceNumber = (await params).invoiceNumber;

    if (!invoiceNumber || invoiceNumber.trim() === "") {
      return NextResponse.json(
        { error: "Invalid invoice number." },
        { status: 400 },
      );
    }

    const invoice = await prisma.invoice.findFirst({
      where: { invoice_number: invoiceNumber, is_active: true },
      select: {
        invoice_id: true,
        is_active: true,
        invoice_number: true,
        invoice_date: true,
        total_amount: true,
        payment_status: true,
        notes: true,
        po_number: true,
        vat_number: true,
        customer: {
          select: {
            customer_id: true,
            name: true,
            phone: true,
          },
        },
        rep: {
          select: {
            rep_id: true,
            full_name: true,
          },
        },
        location: {
          select: {
            location_id: true,
            code: true,
            name: true,
          },
        },
        invoice_lines: {
          select: {
            line_id: true,
            product_id: true,
            quantity: true,
            unit_price: true,
            line_total: true,
            net_line_total: true,
            product: {
              select: {
                product_id: true,
                product_code: true,
                product_name: true,
                pack_size: true,
              },
            },
          },
          orderBy: { line_id: "asc" },
        },
        salesReturnNotes: {
          where: { is_active: true },
          select: {
            return_id: true,
            return_number: true,
            return_date: true,
            total_amount: true,
            notes: true,
            lines: {
              select: {
                return_line_id: true,
                product_id: true,
                quantity_usable: true,
                quantity_unusable: true,
                condition: true,
                reason_for_return: true,
                line_total: true,
                product: {
                  select: {
                    product_id: true,
                    product_code: true,
                    product_name: true,
                    pack_size: true,
                  },
                },
              },
              orderBy: { return_line_id: "asc" },
            },
          },
          orderBy: { return_date: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: {
        invoice: {
          id: invoice.invoice_id,
          number: invoice.invoice_number,
          date: invoice.invoice_date.toISOString(),
          totalAmount: Number(invoice.total_amount),
          status: invoice.payment_status,
          notes: invoice.notes,
          poNumber: invoice.po_number,
          vatNumber: invoice.vat_number,
          customer: invoice.customer,
          salesRep: invoice.rep,
          location: invoice.location,
        },
        lines: invoice.invoice_lines.map((line) => ({
          lineId: line.line_id,
          productId: line.product_id,
          productCode: line.product.product_code,
          productName: line.product.product_name,
          packSize: line.product.pack_size,
          quantity: line.quantity,
          unitPrice: Number(line.unit_price),
          lineTotal: Number(line.line_total),
          netLineTotal: Number(line.net_line_total),
        })),
        salesReturns: invoice.salesReturnNotes.map((srn) => ({
          returnId: srn.return_id,
          returnNumber: srn.return_number,
          returnDate: srn.return_date.toISOString(),
          totalAmount: Number(srn.total_amount),
          notes: srn.notes,
          lines: srn.lines.map((line) => ({
            lineId: line.return_line_id,
            productId: line.product_id,
            productCode: line.product.product_code,
            productName: line.product.product_name,
            packSize: line.product.pack_size,
            quantity: line.quantity_usable + line.quantity_unusable,
            condition: line.condition,
            reasonForReturn: line.reason_for_return,
            lineTotal: Number(line.line_total),
          })),
        })),
      },
    });
  } catch (error) {
    console.error("Failed to load invoice details", error);
    return NextResponse.json(
      { error: "Failed to load invoice details." },
      { status: 500 },
    );
  }
}

