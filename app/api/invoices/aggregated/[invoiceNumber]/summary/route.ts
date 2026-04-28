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
        },
        salesReturnNotes: {
          where: { is_active: true },
          select: {
            return_id: true,
            return_number: true,
            return_date: true,
            total_amount: true,
            lines: {
              select: {
                return_line_id: true,
                product_id: true,
                quantity: true,
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
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 },
      );
    }

    const productSummaryMap = new Map<
      number,
      {
        productId: number;
        productCode: string;
        productName: string;
        packSize: string;
        initialQuantity: number;
        initialUnitPrice: number;
        initialLineTotal: number;
        initialNetLineTotal: number;
        returnedQuantity: number;
        returnedLineTotal: number;
        returnCount: number;
        returnNumbers: string[];
      }
    >();

    for (const line of invoice.invoice_lines) {
      const key = line.product_id;
      productSummaryMap.set(key, {
        productId: line.product_id,
        productCode: line.product.product_code,
        productName: line.product.product_name,
        packSize: line.product.pack_size,
        initialQuantity: line.quantity,
        initialUnitPrice: Number(line.unit_price),
        initialLineTotal: Number(line.line_total),
        initialNetLineTotal: Number(line.net_line_total),
        returnedQuantity: 0,
        returnedLineTotal: 0,
        returnCount: 0,
        returnNumbers: [],
      });
    }

    for (const srn of invoice.salesReturnNotes) {
      for (const line of srn.lines) {
        const key = line.product_id;
        const entry = productSummaryMap.get(key);
        if (entry) {
          entry.returnedQuantity += line.quantity;
          entry.returnedLineTotal += Number(line.line_total);
          entry.returnCount += 1;
          if (!entry.returnNumbers.includes(srn.return_number)) {
            entry.returnNumbers.push(srn.return_number);
          }
        }
      }
    }

    const productSummaries = Array.from(productSummaryMap.values())
      .map((item) => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        packSize: item.packSize,
        initial: {
          quantity: item.initialQuantity,
          unitPrice: item.initialUnitPrice,
          lineTotal: Number(item.initialLineTotal.toFixed(2)),
          netLineTotal: Number(item.initialNetLineTotal.toFixed(2)),
        },
        returned: {
          quantity: item.returnedQuantity,
          lineTotal: Number(item.returnedLineTotal.toFixed(2)),
          returnCount: item.returnCount,
          returnNumbers: item.returnNumbers,
        },
        net: {
          quantity: item.initialQuantity - item.returnedQuantity,
          lineTotal: Number(
            (item.initialLineTotal - item.returnedLineTotal).toFixed(2),
          ),
        },
      }))
      .sort((a, b) => a.productCode.localeCompare(b.productCode));

    const totalInitial = productSummaries.reduce(
      (sum, p) => sum + p.initial.lineTotal,
      0,
    );
    const totalReturned = productSummaries.reduce(
      (sum, p) => sum + p.returned.lineTotal,
      0,
    );
    const totalNet = productSummaries.reduce(
      (sum, p) => sum + p.net.lineTotal,
      0,
    );

    return NextResponse.json({
      data: {
        invoice: {
          id: invoice.invoice_id,
          number: invoice.invoice_number,
          date: invoice.invoice_date.toISOString(),
          status: invoice.status,
        },
        summary: {
          totalProducts: productSummaries.length,
          totalInitialAmount: Number(totalInitial.toFixed(2)),
          totalReturnedAmount: Number(totalReturned.toFixed(2)),
          totalNetAmount: Number(totalNet.toFixed(2)),
        },
        products: productSummaries,
      },
    });
  } catch (error) {
    console.error("Failed to load invoice summary", error);
    return NextResponse.json(
      { error: "Failed to load invoice summary." },
      { status: 500 },
    );
  }
}