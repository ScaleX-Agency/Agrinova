import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
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
        is_active: true,
        invoice_date: true,
        location_id: true,
        gin_status: true,
        payment_status: true,
        total_amount: true,
        paid_amount: true,
        credited_amount: true,
        balance_amount: true,
        vat_percentage: true,
        po_number: true,
        vat_number: true,
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
            line_id: true,
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
            credited_amount: true,
            balance_amount: true,
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

    if (!invoice || !invoice.is_active) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    const totalAmount = Number(invoice.total_amount);
    const totalPaid = Number(invoice.paid_amount);
    const outstandingAmount = Number(invoice.balance_amount);
    const totalReturnableQty = invoice.invoice_lines.reduce(
      (sum, line) => sum + Math.max(0, line.issued_qty - line.returned_qty),
      0,
    );

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
        totalReturnableQty,
        vatPercentage: Number(invoice.vat_percentage ?? 0),
        poNumber: invoice.po_number,
        vatNumber: invoice.vat_number,
        lines: invoice.invoice_lines.map((line: InvoiceLineRecord) => ({
          lineId: line.line_id,
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
          creditedAmount: Number(line.credited_amount),
          balanceAmount: Number(line.balance_amount),
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const invoiceId = Number((await params).invoiceId);
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return NextResponse.json({ error: "Invalid invoiceId." }, { status: 400 });
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { invoice_id: invoiceId },
        select: {
          invoice_id: true,
          invoice_number: true,
          is_active: true,
          goods_issue_notes: {
            where: { is_active: true },
            select: { gin_id: true },
          },
          receipts: {
            where: { is_active: true },
            select: { receipt_id: true },
          },
          returnedCheques: {
            where: { is_active: true },
            select: { returned_cheque_id: true },
          },
          salesReturnNotes: {
            where: { is_active: true },
            select: { return_id: true },
          },
          creditNotes: {
            where: { is_active: true },
            select: { credit_note_id: true },
          },
          invoiceSettlements: {
            where: { is_active: true },
            select: { settlement_id: true },
          },
        },
      });

      if (!invoice || !invoice.is_active) {
        throw new Error("Invoice not found or already inactive.");
      }

      if (invoice.goods_issue_notes.length > 0) {
        throw new Error("Cannot delete invoice with active goods issue notes.");
      }
      if (invoice.receipts.length > 0) {
        throw new Error("Cannot delete invoice with active receipts.");
      }
      if (invoice.returnedCheques.length > 0) {
        throw new Error("Cannot delete invoice with active returned cheque records.");
      }
      if (invoice.salesReturnNotes.length > 0) {
        throw new Error("Cannot delete invoice with active sales return notes.");
      }
      if (invoice.creditNotes.length > 0) {
        throw new Error("Cannot delete invoice with active credit notes.");
      }
      if (invoice.invoiceSettlements.length > 0) {
        throw new Error("Cannot delete invoice with active settlements.");
      }

      await tx.invoice.update({
        where: { invoice_id: invoice.invoice_id },
        data: {
          is_active: false,
          deleted_by: currentUser.user_id,
        },
      });

      return invoice;
    }, { timeout: 20000, maxWait: 10000 });

    return NextResponse.json({
      data: {
        success: true,
        invoiceId: deleted.invoice_id,
        invoiceNo: deleted.invoice_number,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete invoice.";
    const status =
      message.includes("not found") || message.includes("already inactive")
        ? 404
        : message.includes("Cannot delete")
          ? 422
          : 500;
    console.error("Failed to delete invoice", error);
    return NextResponse.json({ error: message }, { status });
  }
}
