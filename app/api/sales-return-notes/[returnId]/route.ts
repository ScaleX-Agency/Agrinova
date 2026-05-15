import { NextResponse } from "next/server";
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { rebuildInvoiceCreditNoteCommissions } from "@/lib/commissionSettlement";

const parsePositiveInt = (value: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const toInvoiceStatus = (balanceAmount: number, paidAmount: number, creditedAmount: number): InvoiceStatus => {
  if (balanceAmount <= 0) return "PAID";
  if (paidAmount > 0 || creditedAmount > 0) return "PARTIAL";
  return "UNPAID";
};

const toNum = (value: number | string | { toString(): string } | null | undefined) =>
  Number(value ?? 0);

const canAccess = (roleName?: string) => {
  const role = roleName?.toLowerCase();
  return role === "admin" || role === "operator";
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ returnId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccess(user.role?.role_name)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const returnId = parsePositiveInt((await params).returnId);
    if (!returnId) {
      return NextResponse.json({ error: "Invalid return id." }, { status: 400 });
    }

    const srn = await prisma.salesReturnNote.findUnique({
      where: { return_id: returnId },
      select: {
        return_id: true,
        return_number: true,
        return_date: true,
        total_amount: true,
        notes: true,
        is_active: true,
        customer: {
          select: {
            customer_id: true,
            name: true,
            phone: true,
          },
        },
        invoice: {
          select: {
            invoice_id: true,
            invoice_number: true,
            invoice_date: true,
            total_amount: true,
            credited_amount: true,
            balance_amount: true,
            payment_status: true,
          },
        },
        location: {
          select: {
            location_id: true,
            code: true,
            name: true,
          },
        },
        creator: {
          select: {
            full_name: true,
          },
        },
        lines: {
          orderBy: { return_line_id: "asc" },
          select: {
            return_line_id: true,
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
        },
        goodsReturnNotes: {
          where: { is_active: true },
          orderBy: [{ return_date: "desc" }, { return_id: "desc" }],
          select: {
            return_id: true,
            return_number: true,
            return_date: true,
            lines: {
              select: {
                product_id: true,
                quantity: true,
              },
            },
          },
        },
        creditNotes: {
          where: { is_active: true },
          orderBy: [{ created_at: "desc" }, { credit_note_id: "desc" }],
          select: {
            credit_note_id: true,
            amount: true,
            created_at: true,
          },
        },
      },
    });

    if (!srn || !srn.is_active) {
      return NextResponse.json({ error: "Sales return note not found." }, { status: 404 });
    }

    const goodsReturn = srn.goodsReturnNotes[0] ?? null;
    const creditNote = srn.creditNotes[0] ?? null;

    const lineRows = srn.lines.map((line) => ({
      lineId: line.return_line_id,
      productId: line.product.product_id,
      productCode: line.product.product_code,
      productName: line.product.product_name,
      packSize: line.product.pack_size,
      usableQty: line.quantity_usable,
      unusableQty: line.quantity_unusable,
      totalQty: line.quantity_usable + line.quantity_unusable,
      condition: line.condition,
      reasonForReturn: line.reason_for_return,
      lineTotal: Number(toNum(line.line_total).toFixed(2)),
    }));

    const goodsReturnTotalQty = goodsReturn
      ? goodsReturn.lines.reduce((sum, line) => sum + line.quantity, 0)
      : 0;

    return NextResponse.json({
      data: {
        returnId: srn.return_id,
        srnNumber: srn.return_number,
        srnDate: srn.return_date.toISOString(),
        notes: srn.notes,
        customer: {
          customerId: srn.customer.customer_id,
          name: srn.customer.name,
          phone: srn.customer.phone,
        },
        invoice: {
          invoiceId: srn.invoice.invoice_id,
          invoiceNumber: srn.invoice.invoice_number,
          invoiceDate: srn.invoice.invoice_date.toISOString(),
          totalAmount: Number(toNum(srn.invoice.total_amount).toFixed(2)),
          creditedAmount: Number(toNum(srn.invoice.credited_amount).toFixed(2)),
          balanceAmount: Number(toNum(srn.invoice.balance_amount).toFixed(2)),
          paymentStatus: srn.invoice.payment_status,
        },
        location: {
          locationId: srn.location.location_id,
          code: srn.location.code,
          name: srn.location.name,
        },
        packageSummary: {
          srnNumber: srn.return_number,
          srnAmount: Number(toNum(srn.total_amount).toFixed(2)),
          grnNumber: goodsReturn?.return_number ?? "Missing",
          grnDate: goodsReturn?.return_date.toISOString() ?? null,
          grnTotalQty: goodsReturnTotalQty,
          creditNoteNumber: creditNote ? `CN-${creditNote.credit_note_id}` : "Missing",
          creditNoteDate: creditNote?.created_at.toISOString() ?? null,
          creditAmount: Number(toNum(creditNote?.amount).toFixed(2)),
        },
        createdBy: srn.creator.full_name,
        lines: lineRows,
      },
    });
  } catch (error) {
    console.error("Failed to load sales return note detail", error);
    return NextResponse.json({ error: "Failed to load sales return note detail." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ returnId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const returnId = parsePositiveInt((await params).returnId);
    if (!returnId) {
      return NextResponse.json({ error: "Invalid return id." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const srn = await tx.salesReturnNote.findUnique({
        where: { return_id: returnId },
        select: {
          return_id: true,
          return_number: true,
          return_date: true,
          location_id: true,
          invoice_id: true,
          is_active: true,
          lines: {
            select: {
              product_id: true,
              quantity_usable: true,
              quantity_unusable: true,
              line_total: true,
            },
          },
          goodsReturnNotes: {
            where: { is_active: true },
            select: {
              return_id: true,
              location_id: true,
              lines: {
                select: {
                  product_id: true,
                  quantity: true,
                },
              },
            },
          },
          creditNotes: {
            where: { is_active: true },
            select: {
              credit_note_id: true,
              amount: true,
              invoiceSettlements: {
                where: { is_active: true },
                select: {
                  settlement_id: true,
                },
              },
            },
          },
          invoice: {
            select: {
              invoice_id: true,
              rep_id: true,
              total_amount: true,
              paid_amount: true,
              credited_amount: true,
              invoice_lines: {
                select: {
                  line_id: true,
                  product_id: true,
                  issued_qty: true,
                  returned_qty: true,
                  balance_qty: true,
                  credited_amount: true,
                  balance_amount: true,
                  net_line_total: true,
                },
              },
            },
          },
        },
      });

      if (!srn || !srn.is_active) {
        throw new Error("Sales return note not found or already inactive.");
      }

      if (srn.goodsReturnNotes.length === 0) {
        throw new Error("No active goods return note is linked to this SRN.");
      }

      if (srn.creditNotes.length === 0) {
        throw new Error("No active credit note is linked to this SRN.");
      }

      const goodsReturn = srn.goodsReturnNotes[0];

      const returnedByProduct = new Map<number, { returnedQty: number; creditedAmount: number; unusableQty: number }>();
      for (const line of srn.lines) {
        const current = returnedByProduct.get(line.product_id) ?? {
          returnedQty: 0,
          creditedAmount: 0,
          unusableQty: 0,
        };
        current.returnedQty += line.quantity_usable + line.quantity_unusable;
        current.creditedAmount += Number(line.line_total);
        current.unusableQty += line.quantity_unusable;
        returnedByProduct.set(line.product_id, current);
      }

      const invoiceLinesByProduct = new Map<number, (typeof srn.invoice.invoice_lines)[number][]>();
      for (const line of srn.invoice.invoice_lines) {
        const lines = invoiceLinesByProduct.get(line.product_id) ?? [];
        lines.push(line);
        invoiceLinesByProduct.set(line.product_id, lines);
      }

      for (const [productId, aggregate] of returnedByProduct.entries()) {
        const invoiceLines = invoiceLinesByProduct.get(productId) ?? [];
        if (invoiceLines.length !== 1) {
          throw new Error(
            `Expected exactly one invoice line for product ${productId}, found ${invoiceLines.length}.`,
          );
        }

        const invoiceLine = invoiceLines[0];
        if (invoiceLine.returned_qty < aggregate.returnedQty) {
          throw new Error(`Cannot reverse returns for product ${productId}; returned quantity mismatch.`);
        }

        const currentCredited = Number(invoiceLine.credited_amount);
        if (currentCredited + 0.0001 < aggregate.creditedAmount) {
          throw new Error(`Cannot reverse credits for product ${productId}; credited amount mismatch.`);
        }
      }

      const goodsReturnQtyByProduct = new Map<number, number>();
      for (const line of goodsReturn.lines) {
        goodsReturnQtyByProduct.set(
          line.product_id,
          (goodsReturnQtyByProduct.get(line.product_id) ?? 0) + line.quantity,
        );
      }

      const stockProductIds = Array.from(goodsReturnQtyByProduct.keys());
      const stocks = stockProductIds.length
        ? await tx.stock.findMany({
            where: {
              location_id: goodsReturn.location_id,
              product_id: { in: stockProductIds },
            },
            select: {
              stock_id: true,
              product_id: true,
              quantity_on_hand: true,
            },
          })
        : [];
      const stockByProduct = new Map(stocks.map((stock) => [stock.product_id, stock]));

      for (const [productId, qty] of goodsReturnQtyByProduct.entries()) {
        if (qty <= 0) continue;
        const stock = stockByProduct.get(productId);
        if (!stock) {
          throw new Error(`Stock record not found for product ${productId} to reverse goods return.`);
        }
        if (stock.quantity_on_hand < qty) {
          throw new Error(
            `Cannot delete SRN because stock would go negative for product ${productId}.`,
          );
        }
      }

      for (const [productId, qty] of goodsReturnQtyByProduct.entries()) {
        if (qty <= 0) continue;
        const stock = stockByProduct.get(productId)!;

        await tx.stock.update({
          where: { stock_id: stock.stock_id },
          data: {
            quantity_on_hand: { decrement: qty },
          },
        });

      }

      for (const [productId, aggregate] of returnedByProduct.entries()) {
        if (aggregate.unusableQty <= 0) continue;

        if (!stockByProduct.get(productId)) {
          await tx.stock.upsert({
            where: {
              product_id_location_id: {
                product_id: productId,
                location_id: srn.location_id,
              },
            },
            update: {},
            create: {
              product_id: productId,
              location_id: srn.location_id,
              quantity_on_hand: 0,
            },
            select: {
              stock_id: true,
            },
          });
        }

      }

      for (const [productId, aggregate] of returnedByProduct.entries()) {
        const invoiceLine = (invoiceLinesByProduct.get(productId) ?? [])[0];
        const nextReturnedQty = invoiceLine.returned_qty - aggregate.returnedQty;
        const nextCreditedAmount = Math.max(
          0,
          Number(invoiceLine.credited_amount) - aggregate.creditedAmount,
        );
        const nextBalanceAmount = Math.min(
          Number(invoiceLine.net_line_total),
          Number(invoiceLine.balance_amount) + aggregate.creditedAmount,
        );
        const nextBalanceQty = Math.max(0, invoiceLine.issued_qty - nextReturnedQty);

        await tx.invoiceLine.update({
          where: { line_id: invoiceLine.line_id },
          data: {
            returned_qty: nextReturnedQty,
            balance_qty: nextBalanceQty,
            credited_amount: nextCreditedAmount,
            balance_amount: nextBalanceAmount,
          },
        });
      }

      let totalCreditAmountToReverse = 0;
      for (const creditNote of srn.creditNotes) {
        totalCreditAmountToReverse += Number(creditNote.amount);

        for (const settlement of creditNote.invoiceSettlements) {
          // Deactivate reversal allocations for commissions linked to this settlement
          const commissions = await tx.commission.findMany({
            where: {
              settlement_id: settlement.settlement_id,
              is_active: true,
            },
            select: { commission_id: true },
          });

          for (const commission of commissions) {
            await tx.commissionReversalAllocation.updateMany({
              where: {
                commission_id: commission.commission_id,
                is_active: true,
              },
              data: { is_active: false },
            });
          }

          // Cancel commissions
          await tx.commission.updateMany({
            where: {
              settlement_id: settlement.settlement_id,
              is_active: true,
            },
            data: {
              is_active: false,
              status: "CANCELLED",
            },
          });

          // Deactivate settlement
          await tx.invoiceSettlement.update({
            where: { settlement_id: settlement.settlement_id },
            data: {
              is_active: false,
              commission_issued: false,
            },
          });
        }

        await tx.creditNote.update({
          where: { credit_note_id: creditNote.credit_note_id },
          data: {
            is_active: false,
            deleted_by: user.user_id,
          },
        });
      }

      const currentInvoiceCreditedAmount = Number(srn.invoice.credited_amount);
      if (currentInvoiceCreditedAmount + 0.0001 < totalCreditAmountToReverse) {
        throw new Error("Cannot reverse invoice credits; credited amount mismatch.");
      }

      const nextInvoiceCreditedAmount = Math.max(
        0,
        currentInvoiceCreditedAmount - totalCreditAmountToReverse,
      );
      const totalAmount = Number(srn.invoice.total_amount);
      const paidAmount = Number(srn.invoice.paid_amount);
      const nextInvoiceBalanceAmount = Math.max(
        0,
        Number((totalAmount - paidAmount - nextInvoiceCreditedAmount).toFixed(2)),
      );
      const nextInvoiceStatus = toInvoiceStatus(
        nextInvoiceBalanceAmount,
        paidAmount,
        nextInvoiceCreditedAmount,
      );

      await tx.invoice.update({
        where: { invoice_id: srn.invoice_id },
        data: {
          credited_amount: nextInvoiceCreditedAmount,
          balance_amount: nextInvoiceBalanceAmount,
          payment_status: nextInvoiceStatus,
        },
      });

      await rebuildInvoiceCreditNoteCommissions(
        tx,
        srn.invoice_id,
        srn.invoice.rep_id,
      );

      await tx.goodsReturnNote.updateMany({
        where: {
          srn_id: srn.return_id,
          is_active: true,
        },
        data: {
          is_active: false,
          deleted_by: user.user_id,
        },
      });

      await tx.salesReturnNote.update({
        where: { return_id: srn.return_id },
        data: {
          is_active: false,
          deleted_by: user.user_id,
        },
      });

      return {
        returnId: srn.return_id,
        returnNumber: srn.return_number,
      };
    }, { timeout: 20000, maxWait: 10000 });

    return NextResponse.json({
      data: {
        success: true,
        returnId: result.returnId,
        returnNumber: result.returnNumber,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete sales return note.";
    const status =
      message.includes("not found") || message.includes("already inactive")
        ? 404
        : message.includes("Forbidden")
          ? 403
          : message.includes("Unauthorized")
            ? 401
            : 422;
    console.error("Failed to delete sales return note", error);
    return NextResponse.json({ error: message }, { status });
  }
}
