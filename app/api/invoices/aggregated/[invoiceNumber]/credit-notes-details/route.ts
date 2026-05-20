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
        creditNotes: {
          where: { is_active: true },
          select: {
            credit_note_id: true,
            amount: true,
            notes: true,
            created_at: true,
            updated_at: true,
            creator: {
              select: {
                full_name: true,
              },
            },
            sales_return_note: {
              select: {
                return_id: true,
                return_number: true,
                return_date: true,
                total_amount: true,
                notes: true,
                customer: {
                  select: {
                    customer_id: true,
                    name: true,
                  },
                },
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
            },
          },
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 },
      );
    }

    const creditNotes = invoice.creditNotes.map((cn) => ({
      creditNoteId: cn.credit_note_id,
      amount: Number(cn.amount),
      notes: cn.notes,
      createdAt: cn.created_at.toISOString(),
      updatedAt: cn.updated_at.toISOString(),
      createdBy: cn.creator.full_name,
      salesReturn: {
        returnId: cn.sales_return_note.return_id,
        returnNumber: cn.sales_return_note.return_number,
        returnDate: cn.sales_return_note.return_date.toISOString(),
        totalAmount: Number(cn.sales_return_note.total_amount),
        notes: cn.sales_return_note.notes,
        customerId: cn.sales_return_note.customer.customer_id,
        customerName: cn.sales_return_note.customer.name,
        lines: cn.sales_return_note.lines.map((line) => ({
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
      },
    }));

    return NextResponse.json({
      data: {
        invoice: {
          id: invoice.invoice_id,
          number: invoice.invoice_number,
          date: invoice.invoice_date.toISOString(),
          totalAmount: Number(invoice.total_amount),
          status: invoice.payment_status,
        },
        creditNotes,
        creditNoteCount: creditNotes.length,
      },
    });
  } catch (error) {
    console.error("Failed to load credit notes details", error);
    return NextResponse.json(
      { error: "Failed to load credit notes details." },
      { status: 500 },
    );
  }
}
