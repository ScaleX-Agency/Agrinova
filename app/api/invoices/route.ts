import { NextResponse } from "next/server";
import { GINStatus, InvoiceStatus, LinePromotionType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CreateInvoiceRequestDto,
  CreateInvoiceSuccessResponse,
  InvoiceNumberAvailabilityResponse,
  InvoicesResponse,
} from "@/types/api";
import { getCurrentUser } from "@/lib/auth";

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
    const month = searchParams.get("month"); // legacy
    const range = searchParams.get("range"); // day, week, month, year, all, custom
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const checkInvoiceNo = searchParams.get("checkInvoiceNo") === "true";
    const invoiceNo = searchParams.get("invoiceNo")?.trim();

    if (checkInvoiceNo) {
      if (!invoiceNo) {
        return NextResponse.json(
          { error: "Invoice number is required." },
          { status: 400 },
        );
      }

      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          invoice_number: invoiceNo,
          is_active: true,
        },
        select: {
          invoice_id: true,
        },
      });

      const responseBody: InvoiceNumberAvailabilityResponse = {
        data: {
          invoiceNo,
          isUnique: existingInvoice === null,
        },
      };

      return NextResponse.json(responseBody);
    }

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

    let dateFilter: Prisma.DateTimeFilter | undefined;

    if (range && range !== "all") {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;

      if (range === "day") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (range === "week") {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
      } else if (range === "month") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else if (range === "year") {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear() + 1, 0, 1);
      } else if (range === "custom") {
        start = startDateParam ? new Date(startDateParam) : null;
        if (endDateParam) {
          const endDate = new Date(endDateParam);
          end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
        }
      }

      if (start || end) {
        dateFilter = {};
        if (start) dateFilter.gte = start;
        if (end) dateFilter.lt = end;
      }
    } else if (startDateParam || endDateParam) {
      dateFilter = {};
      if (startDateParam) dateFilter.gte = new Date(startDateParam);
      if (endDateParam) {
        const end = new Date(endDateParam);
        dateFilter.lt = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
      }
    } else if (month) {
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

      dateFilter = { gte: rangeStart, lt: rangeEnd };
    }

    const where: Prisma.InvoiceWhereInput = {
      is_active: true,
      ...(unlinkedOnly ? { goods_issue_notes: { none: {} } } : {}),
      ...(issuableOnly ? { gin_status: { not: "ISSUED" } } : {}),
      ...(parsedPaymentStatus ? { payment_status: parsedPaymentStatus } : {}),
      ...(parsedGinStatus ? { gin_status: parsedGinStatus } : {}),
      ...(dateFilter ? { invoice_date: dateFilter } : {}),
    };

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: [{ invoice_date: "desc" }, { invoice_id: "desc" }],
      select: {
        invoice_id: true,
        invoice_number: true,
        invoice_date: true,
        total_amount: true,
        payment_status: true,
        paid_amount: true,
        credited_amount: true,
        balance_amount: true,
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
        invoice_lines: {
          select: {
            issued_qty: true,
            returned_qty: true,
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
        paidAmount: Number(invoice.paid_amount),
        creditedAmount: Number(invoice.credited_amount),
        balanceAmount: Number(invoice.balance_amount),
        totalReturnableQty: invoice.invoice_lines.reduce(
          (sum, line) => sum + Math.max(0, line.issued_qty - line.returned_qty),
          0,
        ),
        status: invoice.payment_status,
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
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const createdBy = currentUser.user_id;

    const invoiceNumber = body.invoiceNo.trim();
    const invoiceNotes = body.notes?.trim() ? body.notes.trim() : null;

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
        select: { location_id: true, status: true },
      });

      if (!location) {
        throw new Error("Selected inventory location was not found.");
      }
      if (location.status !== "ACTIVE") {
        throw new Error("Cannot create invoice for an inactive location.");
      }

      const activeDuplicateInvoice = await tx.invoice.findFirst({
        where: {
          invoice_number: invoiceNumber,
          is_active: true,
        },
        select: {
          invoice_id: true,
        },
      });

      if (activeDuplicateInvoice) {
        throw new Error("An invoice with this number already exists. Please use a unique invoice number.");
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
          paid_amount: 0,
          credited_amount: 0,
          balance_amount: totalAmount,
          payment_status: "UNPAID",
          notes: invoiceNotes,
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
          balance_qty: line.quantity + line.free_quantity,
          unit_price: line.unit_price,
          line_total: line.line_total,
          promotion_type: line.promotion_type,
          discount: line.discount,
          free_quantity: line.free_quantity,
          net_line_total: line.net_line_total,
          credited_amount: 0,
          balance_amount: line.net_line_total,
        })),
      });

      return {
        invoiceId: createdInvoice.invoice_id,
      };
    }, { timeout: 20000, maxWait: 10000 });

    const responseBody: CreateInvoiceSuccessResponse = {
      success: true,
      invoiceId: created.invoiceId,
    };

    return NextResponse.json({ data: responseBody }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "An invoice with this number already exists. Please use a unique invoice number." },
          { status: 409 }
        );
      }
    }

    if (error instanceof Error) {
      // Avoid matching Prisma's auto-generated message blocks which include comments from code
      const msg = error.message;
      if (msg.includes("An invoice with this number already exists")) {
        return NextResponse.json(
          { error: "An invoice with this number already exists. Please use a unique invoice number." },
          { status: 409 },
        );
      }

      const isValidationError =
        msg.startsWith("Line ") ||
        msg.startsWith("Stock record not found") ||
        msg.includes("Missing required invoice fields.") ||
        msg.includes("product is required");

      if (isValidationError) {
        return NextResponse.json({ error: msg }, { status: 422 });
      }
    }

    console.error("Create invoice failed", error);
    return NextResponse.json(
      { error: "Failed to create invoice." },
      { status: 500 },
    );
  }
}
