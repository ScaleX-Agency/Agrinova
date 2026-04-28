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
            discount: true,
            free_quantity: true,
            promotion_type: true,
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
            created_by: true,
            creator: {
              select: {
                full_name: true,
              },
            },
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

    const productNetMap = new Map<
      number,
      {
        productId: number;
        productCode: string;
        productName: string;
        packSize: string;
        initialQuantity: number;
        initialUnitPrice: number;
        initialLineTotal: number;
        initialDiscount: number;
        initialNetLineTotal: number;
        returnedQuantity: number;
        returnedLineTotal: number;
        netQuantity: number;
        netLineTotal: number;
        returnDetails: Array<{
          returnNumber: string;
          returnDate: string;
          quantity: number;
          lineTotal: number;
          reason: string;
        }>;
      }
    >();

    for (const line of invoice.invoice_lines) {
      productNetMap.set(line.product_id, {
        productId: line.product_id,
        productCode: line.product.product_code,
        productName: line.product.product_name,
        packSize: line.product.pack_size,
        initialQuantity: line.quantity,
        initialUnitPrice: Number(line.unit_price),
        initialLineTotal: Number(line.line_total),
        initialDiscount: Number(line.discount),
        initialNetLineTotal: Number(line.net_line_total),
        returnedQuantity: 0,
        returnedLineTotal: 0,
        netQuantity: 0,
        netLineTotal: 0,
        returnDetails: [],
      });
    }

    for (const srn of invoice.salesReturnNotes) {
      for (const line of srn.lines) {
        const entry = productNetMap.get(line.product_id);
        if (entry) {
          entry.returnedQuantity += line.quantity;
          entry.returnedLineTotal += Number(line.line_total);
          entry.returnDetails.push({
            returnNumber: srn.return_number,
            returnDate: srn.return_date.toISOString(),
            quantity: line.quantity,
            lineTotal: Number(line.line_total),
            reason: line.reason_for_return || "",
          });
        }
      }
    }

    const finalProductLines = Array.from(productNetMap.values()).map((item) => {
      const netQuantity = item.initialQuantity - item.returnedQuantity;
      const netLineTotal = item.initialNetLineTotal - item.returnedLineTotal;

      return {
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        packSize: item.packSize,
        initial: {
          quantity: item.initialQuantity,
          unitPrice: item.initialUnitPrice,
          lineTotal: Number(item.initialLineTotal.toFixed(2)),
          discount: Number(item.initialDiscount.toFixed(2)),
          netLineTotal: Number(item.initialNetLineTotal.toFixed(2)),
        },
        returned: {
          quantity: item.returnedQuantity,
          lineTotal: Number(item.returnedLineTotal.toFixed(2)),
          returnCount: item.returnDetails.length,
        },
        net: {
          quantity: netQuantity,
          lineTotal: Number(netLineTotal.toFixed(2)),
        },
        returnDetails: item.returnDetails,
      };
    });

    const initialSubtotal = finalProductLines.reduce(
      (sum, p) => sum + p.initial.lineTotal,
      0,
    );
    const initialDiscountTotal = finalProductLines.reduce(
      (sum, p) => sum + p.initial.discount,
      0,
    );
    const initialNetTotal = finalProductLines.reduce(
      (sum, p) => sum + p.initial.netLineTotal,
      0,
    );
    const totalReturned = finalProductLines.reduce(
      (sum, p) => sum + p.returned.lineTotal,
      0,
    );
    const finalNetTotal = finalProductLines.reduce(
      (sum, p) => sum + p.net.lineTotal,
      0,
    );

    const totalReturns = invoice.salesReturnNotes.reduce(
      (sum, srn) => sum + Number(srn.total_amount),
      0,
    );

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
        lines: finalProductLines,
        returns: invoice.salesReturnNotes.map((srn) => ({
          returnId: srn.return_id,
          returnNumber: srn.return_number,
          returnDate: srn.return_date.toISOString(),
          totalAmount: Number(srn.total_amount),
          notes: srn.notes,
          createdBy: srn.creator.full_name,
        })),
        summary: {
          initial: {
            subtotal: Number(initialSubtotal.toFixed(2)),
            discount: Number(initialDiscountTotal.toFixed(2)),
            netTotal: Number(initialNetTotal.toFixed(2)),
          },
          returns: {
            totalAmount: Number(totalReturns.toFixed(2)),
            totalProducts: finalProductLines.filter((p) => p.returned.quantity > 0)
              .length,
          },
          final: {
            netTotal: Number(finalNetTotal.toFixed(2)),
            productsWithReturns: finalProductLines.filter(
              (p) => p.returned.quantity > 0,
            ).length,
            totalProducts: finalProductLines.length,
          },
        },
      },
    });
  } catch (error) {
    console.error("Failed to load invoice final form", error);
    return NextResponse.json(
      { error: "Failed to load invoice final form." },
      { status: 500 },
    );
  }
}