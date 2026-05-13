import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createSettlementCommission } from "@/lib/commissionSettlement";
import type {
  CreateSalesReturnRequestDto,
  ReturnNumberAvailabilityResponse,
  CreateSalesReturnResponse,
} from "@/types/api";

const toPositiveInt = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(0, Math.trunc(numberValue));
};

const toNonNegativeNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(0, numberValue);
};

const getDatedPrefix = (prefix: string, date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${prefix}-${year}${month}-`;
};

const getNextGrnNumber = async (tx: Prisma.TransactionClient, date: Date) => {
  const prefix = getDatedPrefix("GRN-RET", date);
  const latest = await tx.goodsReturnNote.findFirst({
    where: { return_number: { startsWith: prefix } },
    orderBy: { return_number: "desc" },
    select: { return_number: true },
  });
  const sequence = latest
    ? Number(latest.return_number.split("-").at(-1) ?? "0")
    : 0;
  return `${prefix}${String((Number.isFinite(sequence) ? sequence : 0) + 1).padStart(3, "0")}`;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkReturnNo = searchParams.get("checkReturnNo") === "true";
    const returnNumber = searchParams.get("returnNumber")?.trim() ?? "";

    if (!checkReturnNo) {
      return NextResponse.json(
        { error: "Invalid query parameters." },
        { status: 400 },
      );
    }

    if (!returnNumber) {
      return NextResponse.json(
        { error: "Return number is required." },
        { status: 400 },
      );
    }

    const existing = await prisma.salesReturnNote.findFirst({
      where: {
        return_number: returnNumber,
        is_active: true,
      },
      select: { return_id: true },
    });

    const responseBody: ReturnNumberAvailabilityResponse = {
      data: {
        returnNumber,
        isUnique: existing === null,
      },
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Return number check failed", error);
    return NextResponse.json(
      { error: "Failed to check return number." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateSalesReturnRequestDto;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoiceId = toPositiveInt(body.invoiceId);
    const returnNumber = (body.returnNumber ?? "").trim();
    if (!invoiceId) {
      return NextResponse.json({ error: "Invalid invoice ID." }, { status: 400 });
    }
    if (!returnNumber) {
      return NextResponse.json({ error: "Return number is required." }, { status: 400 });
    }

    if (!body.returnDate || Number.isNaN(new Date(body.returnDate).getTime())) {
      return NextResponse.json({ error: "Invalid return date." }, { status: 400 });
    }
    const returnDate = new Date(body.returnDate);

    const inputLines = Array.isArray(body.lines) ? body.lines : [];
    if (inputLines.length === 0) {
      return NextResponse.json(
        { error: "At least one return line is required." },
        { status: 400 },
      );
    }

    const normalizedLines = inputLines.map((line, index) => {
      const lineNumber = index + 1;
      const lineId = toPositiveInt(line.lineId);
      const productId = toPositiveInt(line.productId);
      const quantityUsable = toPositiveInt(line.quantityUsable);
      const quantityUnusable = toPositiveInt(line.quantityUnusable);
      const returnQty = quantityUsable + quantityUnusable;
      const lineTotal = toNonNegativeNumber(line.lineTotal, -1);
      const condition = (line.condition ?? "").trim();
      const reasonForReturn = (line.reasonForReturn ?? "").trim();

      if (!lineId || !productId) {
        throw new Error(`Line ${lineNumber}: invalid line or product reference.`);
      }
      if (!returnQty) {
        throw new Error(`Line ${lineNumber}: return quantity must be greater than 0.`);
      }
      if (lineTotal < 0) {
        throw new Error(`Line ${lineNumber}: line total must be 0 or greater.`);
      }
      if (!condition) {
        throw new Error(`Line ${lineNumber}: condition is required.`);
      }
      if (!reasonForReturn) {
        throw new Error(`Line ${lineNumber}: reason for return is required.`);
      }

      return {
        lineId,
        productId,
        returnQty,
        quantityUsable,
        quantityUnusable,
        lineTotal,
        condition,
        reasonForReturn,
      };
    });

    const created = await prisma.$transaction(
      async (tx) => {
        const invoice = await tx.invoice.findUnique({
          where: { invoice_id: invoiceId },
          select: {
            invoice_id: true,
            is_active: true,
            invoice_date: true,
            customer_id: true,
            location_id: true,
            total_amount: true,
            paid_amount: true,
            credited_amount: true,
            rep_id: true,
            invoice_lines: {
              select: {
                line_id: true,
                product_id: true,
                quantity: true,
                issued_qty: true,
                returned_qty: true,
                balance_amount: true,
              },
            },
          },
        });

        if (!invoice || !invoice.is_active) {
          throw new Error("Invoice not found or inactive.");
        }

        const invoiceLineById = new Map(
          invoice.invoice_lines.map((line) => [line.line_id, line]),
        );
        const stockAddableByProduct = new Map<number, number>();
        const unusableByProduct = new Map<number, number>();

        for (const inputLine of normalizedLines) {
          const invoiceLine = invoiceLineById.get(inputLine.lineId);
          if (!invoiceLine || invoiceLine.product_id !== inputLine.productId) {
            throw new Error(
              `Line ${inputLine.lineId}: line does not belong to selected invoice.`,
            );
          }

          const maxReturnableQty = Math.max(
            0,
            invoiceLine.issued_qty - invoiceLine.returned_qty,
          );
          if (inputLine.returnQty > maxReturnableQty) {
            throw new Error(
              `Line ${inputLine.lineId}: return qty exceeds max returnable (${maxReturnableQty}).`,
            );
          }
          if (inputLine.lineTotal > Number(invoiceLine.balance_amount)) {
            throw new Error(
              `Line ${inputLine.lineId}: deduction exceeds line balance (${Number(invoiceLine.balance_amount).toFixed(2)}).`,
            );
          }

          stockAddableByProduct.set(
            inputLine.productId,
            (stockAddableByProduct.get(inputLine.productId) ?? 0) +
              inputLine.quantityUsable,
          );
          unusableByProduct.set(
            inputLine.productId,
            (unusableByProduct.get(inputLine.productId) ?? 0) +
              inputLine.quantityUnusable,
          );
        }

        const existingActiveReturnNumber = await tx.salesReturnNote.findFirst({
          where: {
            return_number: returnNumber,
            is_active: true,
          },
          select: { return_id: true },
        });
        if (existingActiveReturnNumber) {
          throw new Error("An active return with this number already exists.");
        }
        const grnNumber = await getNextGrnNumber(tx, returnDate);

        const totalAmount = normalizedLines.reduce(
          (sum, line) => sum + line.lineTotal,
          0,
        );

        const srn = await tx.salesReturnNote.create({
          data: {
            return_number: returnNumber,
            return_date: returnDate,
            customer_id: invoice.customer_id,
            location_id: invoice.location_id,
            invoice_id: invoice.invoice_id,
            total_amount: totalAmount,
            notes: body.notes?.trim() || null,
            created_by: currentUser.user_id,
            lines: {
              create: normalizedLines.map((line) => ({
                product_id: line.productId,
                quantity_usable: line.quantityUsable,
                quantity_unusable: line.quantityUnusable,
                condition: line.condition,
                reason_for_return: line.reasonForReturn,
                line_total: line.lineTotal,
              })),
            },
          },
          select: {
            return_id: true,
            return_number: true,
          },
        });

        const grn = await tx.goodsReturnNote.create({
          data: {
            return_number: grnNumber,
            return_date: returnDate,
            customer_id: invoice.customer_id,
            location_id: invoice.location_id,
            srn_id: srn.return_id,
            notes: body.notes?.trim() || null,
            created_by: currentUser.user_id,
            lines: {
              create: normalizedLines.map((line) => ({
                product_id: line.productId,
                quantity: line.quantityUsable,
              })),
            },
          },
          select: {
            return_id: true,
            return_number: true,
          },
        });

        await Promise.all(
          normalizedLines.map((line) => {
            const invoiceLine = invoiceLineById.get(line.lineId)!;
            const nextReturnedQty = invoiceLine.returned_qty + line.returnQty;
            const nextBalanceQty = Math.max(
              0,
              invoiceLine.issued_qty - nextReturnedQty,
            );
            const currentLineBalanceAmount = Number(invoiceLine.balance_amount);
            const nextLineBalanceAmount = Math.max(
              0,
              currentLineBalanceAmount - line.lineTotal,
            );
            return tx.invoiceLine.update({
              where: { line_id: line.lineId },
              data: {
                returned_qty: nextReturnedQty,
                balance_qty: nextBalanceQty,
                credited_amount: { increment: line.lineTotal },
                balance_amount: nextLineBalanceAmount,
              },
            });
          }),
        );

        const productIdsNeedingStock = Array.from(
          new Set([
            ...Array.from(stockAddableByProduct.entries())
              .filter(([, qty]) => qty > 0)
              .map(([productId]) => productId),
            ...Array.from(unusableByProduct.entries())
              .filter(([, qty]) => qty > 0)
              .map(([productId]) => productId),
          ]),
        );

        const existingStocks = productIdsNeedingStock.length
          ? await tx.stock.findMany({
              where: {
                location_id: invoice.location_id,
                product_id: { in: productIdsNeedingStock },
              },
              select: {
                stock_id: true,
                product_id: true,
                quantity_on_hand: true,
              },
            })
          : [];

        const stockByProduct = new Map(
          existingStocks.map((stock) => [stock.product_id, stock]),
        );

        for (const [productId, addQty] of stockAddableByProduct.entries()) {
          if (addQty <= 0) continue;

          const stock = stockByProduct.get(productId)
            ? await tx.stock.update({
                where: { stock_id: stockByProduct.get(productId)!.stock_id },
                data: {
                  quantity_on_hand: { increment: addQty },
                },
                select: { stock_id: true },
              })
            : await tx.stock.create({
                data: {
                  product_id: productId,
                  location_id: invoice.location_id,
                  quantity_on_hand: addQty,
                },
                select: { stock_id: true },
              });

          await tx.stockMovement.create({
            data: {
              stock_id: stock.stock_id,
              product_id: productId,
              created_by: currentUser.user_id,
              movement_type: "RETURN",
              quantity: addQty,
              movement_date: returnDate,
            },
          });
        }

        for (const [productId, unusableQty] of unusableByProduct.entries()) {
          if (unusableQty <= 0) continue;
          const existingStock = stockByProduct.get(productId);
          const stockForAudit = existingStock
            ? { stock_id: existingStock.stock_id }
            : await tx.stock.upsert({
                where: {
                  product_id_location_id: {
                    product_id: productId,
                    location_id: invoice.location_id,
                  },
                },
                update: {},
                create: {
                  product_id: productId,
                  location_id: invoice.location_id,
                  quantity_on_hand: 0,
                },
                select: { stock_id: true },
              });

          await tx.stockMovement.create({
            data: {
              stock_id: stockForAudit.stock_id,
              product_id: productId,
              created_by: currentUser.user_id,
              movement_type: "RETURN_UNUSABLE",
              quantity: unusableQty,
              movement_date: returnDate,
            },
          });
        }

        const creditNote = await tx.creditNote.create({
          data: {
            srn_id: srn.return_id,
            invoice_id: invoice.invoice_id,
            amount: totalAmount,
            notes: body.notes?.trim() || null,
            created_by: currentUser.user_id,
          },
          select: {
            credit_note_id: true,
            amount: true,
          },
        });

        await tx.invoiceSettlement.create({
          data: {
            invoice_id: invoice.invoice_id,
            credit_note_id: creditNote.credit_note_id,
            amount: creditNote.amount,
            settlement_type: "CREDIT_NOTE",
            settled_date: returnDate,
          },
        });

        const totalAmountNumber = Number(invoice.total_amount);
        const paidAmount = Number(invoice.paid_amount);
        const creditedAmount = Number(invoice.credited_amount);
        const nextCreditedAmount = creditedAmount + Number(creditNote.amount);
        const nextBalanceAmount = Math.max(
          0,
          totalAmountNumber - paidAmount - nextCreditedAmount,
        );
        const nextPaymentStatus =
          nextBalanceAmount <= 0
            ? "PAID"
            : paidAmount > 0 || nextCreditedAmount > 0
              ? "PARTIAL"
              : "UNPAID";

        await tx.invoice.update({
          where: { invoice_id: invoice.invoice_id },
          data: {
            credited_amount: nextCreditedAmount,
            balance_amount: nextBalanceAmount,
            payment_status: nextPaymentStatus,
          },
        });

        // Auto-create Commission record for this credit note
        // The settlement needs its own settlement_id, so we fetch it
        const cnSettlement = await tx.invoiceSettlement.findFirst({
          where: {
            invoice_id: invoice.invoice_id,
            credit_note_id: creditNote.credit_note_id,
            is_active: true,
          },
          select: { settlement_id: true },
        });

        if (cnSettlement) {
          await createSettlementCommission(
            tx,
            invoice.invoice_id,
            cnSettlement.settlement_id,
            "CREDIT_NOTE",
            invoice.invoice_date,
            returnDate,
            invoice.rep_id,
            Number(creditNote.amount),
          );
        }

        return {
          salesReturnId: srn.return_id,
          salesReturnNumber: srn.return_number,
          goodsReturnId: grn.return_id,
          goodsReturnNumber: grn.return_number,
          creditNoteId: creditNote.credit_note_id,
          creditAmount: Number(creditNote.amount),
        };
      },
      { timeout: 20000, maxWait: 10000 },
    );

    const responseBody: CreateSalesReturnResponse = {
      data: {
        success: true,
        salesReturnId: created.salesReturnId,
        salesReturnNumber: created.salesReturnNumber,
        goodsReturnId: created.goodsReturnId,
        goodsReturnNumber: created.goodsReturnNumber,
        creditNoteId: created.creditNoteId,
        creditAmount: created.creditAmount,
      },
    };

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const isValidationError =
        error.message.includes("Line") ||
        error.message.includes("Invoice not found") ||
        error.message.includes("already exists");

      if (isValidationError) {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const targets = Array.isArray(error.meta?.target)
        ? (error.meta.target as string[])
        : [];
      if (targets.includes("return_number")) {
        return NextResponse.json(
          { error: "Duplicate return number conflict. Please retry." },
          { status: 409 },
        );
      }
      if (targets.includes("product_id") && targets.includes("location_id")) {
        return NextResponse.json(
          { error: "Stock record conflict detected. Please retry." },
          { status: 409 },
        );
      }
    }

    console.error("Create sales return failed", error);
    return NextResponse.json(
      { error: "Failed to create sales return." },
      { status: 500 },
    );
  }
}
