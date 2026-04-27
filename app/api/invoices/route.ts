import { NextResponse } from "next/server";
import { GINStatus, InvoiceStatus, LinePromotionType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCommissionDueDate } from "@/lib/commission";
import type {
  CreateInvoiceRequestDto,
  CreateInvoiceSuccessResponse,
  InvoicesResponse,
} from "@/types/api";

const toPositiveInt = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(0, Math.trunc(numberValue));
};

const VALID_PROMO_TYPES = new Set<LinePromotionType>(["NONE", "DISCOUNT", "FREE_QTY"]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const unlinkedOnly = searchParams.get("unlinkedOnly") === "true";
    const issuableOnly = searchParams.get("issuableOnly") === "true";
    const paymentStatus = searchParams.get("paymentStatus");
    const ginStatus = searchParams.get("ginStatus");
    const month = searchParams.get("month");

    const invoiceStatusValues = new Set(Object.values(InvoiceStatus));
    const ginStatusValues = new Set(Object.values(GINStatus));

    let parsedPaymentStatus: InvoiceStatus | undefined;
    let parsedGinStatus: GINStatus | undefined;

    if (paymentStatus) {
      if (!invoiceStatusValues.has(paymentStatus as InvoiceStatus)) {
        return NextResponse.json({ error: "Invalid payment status filter." }, { status: 400 });
      }
      parsedPaymentStatus = paymentStatus as InvoiceStatus;
    }

    if (ginStatus) {
      if (!ginStatusValues.has(ginStatus as GINStatus)) {
        return NextResponse.json({ error: "Invalid GIN status filter." }, { status: 400 });
      }
      parsedGinStatus = ginStatus as GINStatus;
    }

    let monthDateFilter: Prisma.DateTimeFilter | undefined;
    if (month) {
      const monthMatch = /^(\d{4})-(\d{2})$/.exec(month);
      if (!monthMatch) {
        return NextResponse.json({ error: "Invalid month filter format." }, { status: 400 });
      }

      const year = Number(monthMatch[1]);
      const monthNumber = Number(monthMatch[2]);
      if (!Number.isInteger(year) || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
        return NextResponse.json({ error: "Invalid month filter value." }, { status: 400 });
      }

      const rangeStart = new Date(Date.UTC(year, monthNumber - 1, 1));
      const rangeEnd =
        monthNumber === 12
          ? new Date(Date.UTC(year + 1, 0, 1))
          : new Date(Date.UTC(year, monthNumber, 1));

      monthDateFilter = { gte: rangeStart, lt: rangeEnd };
    }

    const where: Prisma.InvoiceWhereInput = {
      ...(unlinkedOnly ? { goods_issue_notes: { none: {} } } : {}),
      ...(issuableOnly ? { gin_status: { not: "ISSUED" } } : {}),
      ...(parsedPaymentStatus ? { status: parsedPaymentStatus } : {}),
      ...(parsedGinStatus ? { gin_status: parsedGinStatus } : {}),
      ...(monthDateFilter ? { invoice_date: monthDateFilter } : {}),
    };

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: [{ invoice_date: "desc" }, { invoice_id: "desc" }],
      select: {
        invoice_id: true,
        invoice_number: true,
        invoice_date: true,
        total_amount: true,
        status: true,
        gin_status: true,
        customer_id: true,
        rep_id: true,
        customer: {
          select: {
            name: true,
          },
        },
        rep: {
          select: {
            full_name: true,
          },
        },
        location: {
          select: {
            code: true,
          },
        },
      },
    });

    const responseBody: InvoicesResponse = {
      data: invoices.map((invoice) => ({
        id: invoice.invoice_id,
        invoiceNo: invoice.invoice_number,
        invoiceDate: invoice.invoice_date.toISOString(),
        customerId: invoice.customer_id,
        customerName: invoice.customer.name,
        repId: invoice.rep_id,
        repName: invoice.rep.full_name,
        totalAmount: Number(invoice.total_amount),
        status: invoice.status,
        ginStatus: invoice.gin_status,
        locationCode: invoice.location.code,
      })),
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Failed to load invoices", error);
    return NextResponse.json(
      { error: "Failed to load invoices." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateInvoiceRequestDto;

    const customerId = toPositiveInt(body.customerId);
    const repId = toPositiveInt(body.repId);
    const locationId = toPositiveInt(body.locationId);
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const createdBy = toPositiveInt(body.createdBy, 1);
    const invoiceNumber = body.invoiceNo.trim();

    console.log("Received invoice creation request", {
      customerId,
      repId,
      locationId,
      invoiceNumber,
      lineCount: lines.length,
      invoiceDate: body.invoiceDate,
    });


    if (!customerId || !repId || !locationId || !createdBy || !invoiceNumber) {
      return NextResponse.json(
        { error: "Missing required invoice fields." },
        { status: 400 },
      );
    }

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "At least one product line is required." },
        { status: 400 },
      );
    }

    const normalizedLines: {
      product_id: number;
      quantity: number;
      unit_price: number;
      line_total: number;
      promotion_type: LinePromotionType;
      discount: number;
      free_quantity: number;
      net_line_total: number;
    }[] = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const productId = toPositiveInt(line?.productId);
      const quantity = toPositiveInt(line?.quantity);
      const unitPrice = Number(line?.unitPrice);
      const discount = Number(line?.discount ?? 0);
      const freeQuantity = toPositiveInt(line?.freeQuantity ?? 0);
      const promoTypeRaw = line?.promotionType ?? "NONE";
      const promotionType: LinePromotionType = VALID_PROMO_TYPES.has(promoTypeRaw as LinePromotionType)
        ? (promoTypeRaw as LinePromotionType)
        : "NONE";

      if (!productId) {
        return NextResponse.json(
          { error: `Line ${index + 1}: product is required.` },
          { status: 400 },
        );
      }

      if (!quantity) {
        return NextResponse.json(
          { error: `Line ${index + 1}: quantity must be at least 1.` },
          { status: 400 },
        );
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return NextResponse.json(
          { error: `Line ${index + 1}: unit price must be 0 or greater.` },
          { status: 400 },
        );
      }

      if (promotionType === "DISCOUNT" && (!Number.isFinite(discount) || discount < 0 || discount > 100)) {
        return NextResponse.json(
          { error: `Line ${index + 1}: discount must be between 0 and 100.` },
          { status: 400 },
        );
      }

      if (promotionType === "FREE_QTY" && freeQuantity < 0) {
        return NextResponse.json(
          { error: `Line ${index + 1}: free quantity must be 0 or greater.` },
          { status: 400 },
        );
      }

      // line_total = qty × unit_price (before any promotion)
      const lineTotal = quantity * unitPrice;

      // net_line_total = what the customer pays
      let netLineTotal: number;
      if (promotionType === "DISCOUNT") {
        netLineTotal = Math.max(0, lineTotal * (1 - discount / 100));
      } else {
        // NONE or FREE_QTY — customer pays for sold quantity only
        netLineTotal = lineTotal;
      }

      normalizedLines.push({
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        promotion_type: promotionType,
        discount: promotionType === "DISCOUNT" ? discount : 0,
        free_quantity: promotionType === "FREE_QTY" ? freeQuantity : 0,
        net_line_total: netLineTotal,
      });
    }

    if (!body.invoiceDate || Number.isNaN(new Date(body.invoiceDate).getTime())) {
      return NextResponse.json(
        { error: "Invoice date is invalid." },
        { status: 400 },
      );
    }

    const invoiceDate = new Date(body.invoiceDate);

    const created = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { customer_id: customerId },
        include: {
          assigned_rep: {
            select: {
              rep_id: true,
            },
          },
        },
      });

      if (!customer) {
        throw new Error("Selected customer was not found.");
      }

      if (customer.assigned_rep.rep_id !== repId) {
        throw new Error("Selected sales rep is not assigned to the selected customer.");
      }

      const location = await tx.inventoryLocation.findUnique({
        where: { location_id: locationId },
        select: { location_id: true },
      });

      if (!location) {
        throw new Error("Selected inventory location was not found.");
      }

      // Validate stock: quantity + free_quantity must not exceed quantity_on_hand
      for (let i = 0; i < normalizedLines.length; i++) {
        const line = normalizedLines[i];
        const totalRequiredQty = line.quantity + line.free_quantity;

        const stock = await tx.stock.findUnique({
          where: {
            product_id_location_id: {
              product_id: line.product_id,
              location_id: locationId,
            },
          },
          select: { quantity_on_hand: true, stock_id: true },
        });

        if (!stock) {
          throw new Error(`Stock record not found for product on line ${i + 1}.`);
        }

        if (totalRequiredQty > stock.quantity_on_hand) {
          throw new Error(
            `Line ${i + 1}: Insufficient stock. Required ${totalRequiredQty} ` +
            `(${line.quantity} sold + ${line.free_quantity} free), available ${stock.quantity_on_hand}.`,
          );
        }
      }

      // Total amount is the sum of net line totals (what the customer actually pays)
      const totalAmount = normalizedLines.reduce((sum, line) => sum + line.net_line_total, 0);

      const createdInvoice = await tx.invoice.create({
        data: {
          invoice_number: invoiceNumber,
          customer_id: customer.customer_id,
          rep_id: repId,
          location_id: location.location_id,
          created_by: createdBy,
          invoice_date: invoiceDate,
          total_amount: totalAmount,
          status: "UNPAID",
        },
        select: {
          invoice_id: true,
        },
      });

      await tx.invoiceLine.createMany({
        data: normalizedLines.map((line) => ({
          invoice_id: createdInvoice.invoice_id,
          product_id: line.product_id,
          quantity: line.quantity,
          unit_price: line.unit_price,
          line_total: line.line_total,
          promotion_type: line.promotion_type,
          discount: line.discount,
          free_quantity: line.free_quantity,
          net_line_total: line.net_line_total,
        })),
      });

      return {
        invoiceId: createdInvoice.invoice_id,
      };
    });

    const responseBody: CreateInvoiceSuccessResponse = {
      success: true,
      invoiceId: created.invoiceId,
    };

    return NextResponse.json({ data: responseBody }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const isValidationError =
        error.message.includes("customer") ||
        error.message.includes("Selected sales rep") ||
        error.message.includes("inventory location") ||
        error.message.includes("Insufficient stock") ||
        error.message.includes("Stock record not found");

      if (isValidationError) {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }
    }

    console.error("Create invoice failed", error);
    return NextResponse.json(
      { error: "Failed to create invoice." },
      { status: 500 },
    );
  }
}
