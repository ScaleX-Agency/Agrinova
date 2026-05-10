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
        receipts: {
          where: { is_active: true },
          select: {
            receipt_id: true,
            receipt_date: true,
            amount: true,
            payment_method: true,
            cheque_no: true,
            cheque_date: true,
            bank_name: true,
            notes: true,
            created_at: true,
            creator: {
              select: {
                full_name: true,
              },
            },
          },
          orderBy: { receipt_date: "asc" },
        },
        invoiceSettlements: {
          select: {
            settlement_id: true,
            settled_date: true,
            amount: true,
            receipt: {
              select: {
                receipt_id: true,
              },
            },
          },
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
    const totalPaid = invoice.receipts.reduce((sum, r) => sum + Number(r.amount), 0);
    const outstanding = Math.max(0, totalInvoiceAmount - totalPaid);

    const byMethod: Record<string, number> = {
      CASH: 0,
      CHEQUE: 0,
      BANK_TRANSFER: 0,
    };

    for (const receipt of invoice.receipts) {
      byMethod[receipt.payment_method] += Number(receipt.amount);
    }

    const receiptsMap = new Map<
      number,
      {
        receiptId: number;
        receiptDate: string;
        amount: number;
        paymentMethod: string;
        chequeNo: string | null;
        chequeDate: string | null;
        bankName: string | null;
        notes: string | null;
        createdAt: string;
        createdBy: string;
      }
    >();

    for (const receipt of invoice.receipts) {
      receiptsMap.set(receipt.receipt_id, {
        receiptId: receipt.receipt_id,
        receiptDate: receipt.receipt_date.toISOString(),
        amount: Number(receipt.amount),
        paymentMethod: receipt.payment_method,
        chequeNo: receipt.cheque_no,
        chequeDate: receipt.cheque_date?.toISOString() ?? null,
        bankName: receipt.bank_name,
        notes: receipt.notes,
        createdAt: receipt.created_at.toISOString(),
        createdBy: receipt.creator.full_name,
      });
    }

    const receipts = Array.from(receiptsMap.values());

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
        receipts,
        summary: {
          invoiceTotal: Number(totalInvoiceAmount.toFixed(2)),
          totalPaid: Number(totalPaid.toFixed(2)),
          outstanding: Number(outstanding.toFixed(2)),
          paymentBreakdown: {
            cash: Number(byMethod.CASH.toFixed(2)),
            cheque: Number(byMethod.CHEQUE.toFixed(2)),
            bankTransfer: Number(byMethod.BANK_TRANSFER.toFixed(2)),
          },
          receiptCount: receipts.length,
        },
      },
    });
  } catch (error) {
    console.error("Failed to load receipts final form", error);
    return NextResponse.json(
      { error: "Failed to load receipts final form." },
      { status: 500 },
    );
  }
}
