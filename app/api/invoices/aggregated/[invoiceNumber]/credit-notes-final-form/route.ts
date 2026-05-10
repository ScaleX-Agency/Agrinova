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

    const invoice = await prisma.invoice.findUnique({
      where: { invoice_number: invoiceNumber },
      select: {
        invoice_id: true,
        is_active: true,
        invoice_number: true,
        invoice_date: true,
        total_amount: true,
        status: true,
        notes: true,
        customer: {
          select: {
            customer_id: true,
            name: true,
            phone: true,
            address: true,
          },
        },
        rep: {
          select: {
            rep_id: true,
            full_name: true,
            phone: true,
          },
        },
        location: {
          select: {
            location_id: true,
            code: true,
            name: true,
            address: true,
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
        creditNotes: {
          where: { is_active: true },
          select: {
            credit_note_id: true,
            amount: true,
            notes: true,
            created_at: true,
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
                lines: {
                  select: {
                    return_line_id: true,
                    product_id: true,
                    quantity: true,
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

    if (!invoice || !invoice.is_active) {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 },
      );
    }

    const totalInvoiceAmount = Number(invoice.total_amount);
    const totalCredits = invoice.creditNotes.reduce(
      (sum, cn) => sum + Number(cn.amount),
      0,
    );
    const netAfterCredits = totalInvoiceAmount - totalCredits;

    const productCreditsMap = new Map<
      number,
      {
        productId: number;
        productCode: string;
        productName: string;
        packSize: string;
        creditedQuantity: number;
        creditedAmount: number;
      }
    >();

    for (const cn of invoice.creditNotes) {
      for (const line of cn.sales_return_note.lines) {
        const key = line.product_id;
        const entry = productCreditsMap.get(key);
        if (entry) {
          entry.creditedQuantity += line.quantity;
          entry.creditedAmount += Number(line.line_total);
        } else {
          productCreditsMap.set(key, {
            productId: line.product_id,
            productCode: line.product.product_code,
            productName: line.product.product_name,
            packSize: line.product.pack_size,
            creditedQuantity: line.quantity,
            creditedAmount: Number(line.line_total),
          });
        }
      }
    }

    const productCredits = Array.from(productCreditsMap.values()).map((p) => ({
      ...p,
      creditedAmount: Number(p.creditedAmount.toFixed(2)),
    }));

    const creditNotes = invoice.creditNotes.map((cn) => ({
      creditNoteId: cn.credit_note_id,
      amount: Number(cn.amount),
      notes: cn.notes,
      createdAt: cn.created_at.toISOString(),
      createdBy: cn.creator.full_name,
      returnNumber: cn.sales_return_note.return_number,
      returnDate: cn.sales_return_note.return_date.toISOString(),
      returnTotalAmount: Number(cn.sales_return_note.total_amount),
    }));

    return NextResponse.json({
      data: {
        header: {
          invoice: {
            id: invoice.invoice_id,
            number: invoice.invoice_number,
            date: invoice.invoice_date.toISOString(),
            status: invoice.status,
            notes: invoice.notes,
          },
          customer: {
            id: invoice.customer.customer_id,
            name: invoice.customer.name,
            phone: invoice.customer.phone,
            address: invoice.customer.address,
          },
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
        creditNotes,
        productCredits,
        summary: {
          invoiceTotal: Number(totalInvoiceAmount.toFixed(2)),
          totalCredits: Number(totalCredits.toFixed(2)),
          netAfterCredits: Number(netAfterCredits.toFixed(2)),
          creditNoteCount: creditNotes.length,
          productsWithCredits: productCredits.length,
        },
      },
    });
  } catch (error) {
    console.error("Failed to load credit notes final form", error);
    return NextResponse.json(
      { error: "Failed to load credit notes final form." },
      { status: 500 },
    );
  }
}
