import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PeriodType = "daily" | "monthly" | "yearly" | "custom";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function toNum(value: number | string | { toString(): string } | null | undefined) {
  return Number(value ?? 0);
}

function canAccess(roleName?: string) {
  const role = roleName?.toLowerCase();
  return role === "admin" || role === "operator";
}

function parsePeriod(search: URLSearchParams) {
  const now = new Date();
  const periodTypeRaw = search.get("periodType");
  const periodType: PeriodType =
    periodTypeRaw === "daily" ||
    periodTypeRaw === "monthly" ||
    periodTypeRaw === "yearly" ||
    periodTypeRaw === "custom"
      ? periodTypeRaw
      : "monthly";

  if (periodType === "daily") {
    const raw = search.get("date");
    const base = raw ? new Date(raw) : now;
    if (Number.isNaN(base.getTime())) throw new Error("Invalid date. Use YYYY-MM-DD.");
    return {
      startDate: startOfDay(base),
      endDate: endOfDay(base),
      label: base.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      periodType,
    };
  }

  if (periodType === "monthly") {
    const raw = search.get("month");
    const m = raw?.match(/^(\d{4})-(\d{2})$/);
    const year = m ? Number(m[1]) : now.getFullYear();
    const month = m ? Number(m[2]) - 1 : now.getMonth();
    if (month < 0 || month > 11) throw new Error("Invalid month.");
    const start = startOfDay(new Date(year, month, 1));
    const end = endOfDay(new Date(year, month + 1, 0));
    return {
      startDate: start,
      endDate: end,
      label: start.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
      periodType,
    };
  }

  if (periodType === "yearly") {
    const raw = search.get("year");
    const year = raw ? Number(raw) : now.getFullYear();
    if (!Number.isInteger(year)) throw new Error("Invalid year.");
    return {
      startDate: startOfDay(new Date(year, 0, 1)),
      endDate: endOfDay(new Date(year, 11, 31)),
      label: String(year),
      periodType,
    };
  }

  const fromRaw = search.get("from");
  const toRaw = search.get("to");
  if (!fromRaw || !toRaw) throw new Error("Custom period requires from and to.");

  const from = new Date(fromRaw);
  const to = new Date(toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new Error("Invalid custom dates.");

  const start = startOfDay(from);
  const end = endOfDay(to);
  if (start > end) throw new Error("from cannot be after to.");

  return {
    startDate: start,
    endDate: end,
    label: `${start.toLocaleDateString("en-GB")} - ${end.toLocaleDateString("en-GB")}`,
    periodType,
  };
}

function groupTrendDate(date: Date, periodType: PeriodType) {
  if (periodType === "yearly") {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return date.toISOString().slice(0, 10);
}

function trendLabel(key: string, periodType: PeriodType) {
  if (periodType === "yearly") {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short" });
  }
  return new Date(key).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ repId: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(currentUser.role?.role_name)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const repId = Number((await params).repId);
  if (!Number.isInteger(repId) || repId <= 0) {
    return NextResponse.json({ error: "Invalid rep id." }, { status: 400 });
  }

  try {
    const search = new URL(request.url).searchParams;
    const period = parsePeriod(search);
    const locationIdRaw = search.get("locationId");
    const locationId = locationIdRaw && locationIdRaw !== "all" ? Number(locationIdRaw) : null;
    if (locationIdRaw && locationIdRaw !== "all" && (!Number.isInteger(locationId) || (locationId as number) <= 0)) {
      return NextResponse.json({ error: "Invalid locationId." }, { status: 400 });
    }

    const now = new Date();

    const rep = await prisma.salesRep.findUnique({
      where: { rep_id: repId },
      select: {
        rep_id: true,
        full_name: true,
        phone: true,
        _count: { select: { customers: true } },
      },
    });
    if (!rep) return NextResponse.json({ error: "Sales rep not found." }, { status: 404 });

    const commonInvoiceWhere = {
      rep_id: repId,
      is_active: true,
      ...(locationId ? { location_id: locationId } : {}),
    };

    const [allInvoices, periodInvoices, allReceipts, periodReceipts, commissions, pendingSettlements] = await Promise.all([
      prisma.invoice.findMany({
        where: commonInvoiceWhere,
        select: {
          invoice_id: true,
          invoice_number: true,
          customer_id: true,
          invoice_date: true,
          total_amount: true,
          paid_amount: true,
          credited_amount: true,
          balance_amount: true,
          payment_status: true,
          customer: { select: { name: true } },
          location: { select: { location_id: true, code: true, name: true } },
        },
      }),
      prisma.invoice.findMany({
        where: {
          ...commonInvoiceWhere,
          invoice_date: { gte: period.startDate, lte: period.endDate },
        },
        select: {
          invoice_id: true,
          invoice_number: true,
          customer_id: true,
          invoice_date: true,
          total_amount: true,
          credited_amount: true,
          payment_status: true,
          customer: { select: { name: true } },
          location: { select: { location_id: true, code: true, name: true } },
          invoice_lines: {
            select: {
              product_id: true,
              quantity: true,
              net_line_total: true,
              product: { select: { product_code: true, product_name: true } },
            },
          },
        },
      }),
      prisma.receipt.findMany({
        where: {
          is_active: true,
          invoice: commonInvoiceWhere,
        },
        select: {
          receipt_id: true,
          receipt_date: true,
          amount: true,
          payment_method: true,
          invoice: {
            select: {
              invoice_id: true,
              invoice_number: true,
              invoice_date: true,
              customer: { select: { name: true } },
            },
          },
        },
      }),
      prisma.receipt.findMany({
        where: {
          is_active: true,
          receipt_date: { gte: period.startDate, lte: period.endDate },
          invoice: commonInvoiceWhere,
        },
        select: {
          receipt_id: true,
          receipt_date: true,
          amount: true,
          payment_method: true,
          invoice: {
            select: {
              invoice_id: true,
              invoice_number: true,
              invoice_date: true,
              customer: { select: { name: true } },
            },
          },
        },
      }),
      prisma.commission.findMany({
        where: {
          rep_id: repId,
          is_active: true,
          invoiceSettlement: {
            is: {
              is_active: true,
              invoice: locationId ? { location_id: locationId } : undefined,
            },
          },
        },
        select: {
          commission_id: true,
          commission_amount: true,
          commission_rate: true,
          days_to_pay: true,
          status: true,
          created_at: true,
          invoiceSettlement: {
            select: {
              settlement_id: true,
              settlement_type: true,
              amount: true,
              settled_date: true,
              invoice: {
                select: {
                  invoice_id: true,
                  invoice_number: true,
                  customer: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.invoiceSettlement.findMany({
        where: {
          is_active: true,
          commission_issued: false,
          settlement_type: { in: ["RECEIPT", "CREDIT_NOTE"] },
          invoice: {
            rep_id: repId,
            ...(locationId ? { location_id: locationId } : {}),
          },
        },
        select: {
          settlement_id: true,
          settlement_type: true,
          amount: true,
          settled_date: true,
          invoice: { select: { invoice_id: true, invoice_number: true, customer: { select: { name: true } } } },
          receipt: { select: { receipt_id: true, receipt_date: true } },
        },
        orderBy: [{ settled_date: "desc" }, { settlement_id: "desc" }],
      }),
    ]);

    const periodNetSales = periodInvoices.reduce((sum, i) => sum + toNum(i.total_amount) - toNum(i.credited_amount), 0);
    const periodCollections = periodReceipts.reduce((sum, r) => sum + toNum(r.amount), 0);
    const lifetimeSales = allInvoices.reduce((sum, i) => sum + toNum(i.total_amount) - toNum(i.credited_amount), 0);
    const outstanding = allInvoices.reduce((sum, i) => sum + toNum(i.balance_amount), 0);
    const overdueAmount = allInvoices
      .filter((i) => toNum(i.balance_amount) > 0 && Math.floor((now.getTime() - i.invoice_date.getTime()) / DAY_MS) > 65)
      .reduce((sum, i) => sum + toNum(i.balance_amount), 0);

    const weightedDays = allReceipts.reduce(
      (acc, receipt) => {
        const days = Math.max(0, Math.floor((receipt.receipt_date.getTime() - receipt.invoice.invoice_date.getTime()) / DAY_MS));
        const amount = toNum(receipt.amount);
        acc.amount += amount;
        acc.days += amount * days;
        return acc;
      },
      { amount: 0, days: 0 },
    );

    const trendMap = new Map<string, { sales: number; collections: number }>();
    for (const inv of periodInvoices) {
      const key = groupTrendDate(inv.invoice_date, period.periodType);
      const current = trendMap.get(key) ?? { sales: 0, collections: 0 };
      current.sales += toNum(inv.total_amount) - toNum(inv.credited_amount);
      trendMap.set(key, current);
    }
    for (const rec of periodReceipts) {
      const key = groupTrendDate(rec.receipt_date, period.periodType);
      const current = trendMap.get(key) ?? { sales: 0, collections: 0 };
      current.collections += toNum(rec.amount);
      trendMap.set(key, current);
    }
    const trend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({
        label: trendLabel(key, period.periodType),
        sales: Number(value.sales.toFixed(2)),
        collections: Number(value.collections.toFixed(2)),
      }));

    let aging0_30 = 0;
    let aging31_65 = 0;
    let aging65p = 0;

    const openInvoices = allInvoices
      .filter((i) => toNum(i.balance_amount) > 0)
      .sort((a, b) => a.invoice_date.getTime() - b.invoice_date.getTime())
      .map((i) => {
        const days = Math.max(0, Math.floor((now.getTime() - i.invoice_date.getTime()) / DAY_MS));
        const balance = toNum(i.balance_amount);
        if (days <= 30) aging0_30 += balance;
        else if (days <= 65) aging31_65 += balance;
        else aging65p += balance;

        return {
          invoiceId: i.invoice_id,
          invoiceNumber: i.invoice_number,
          customerName: i.customer?.name ?? "",
          invoiceDate: i.invoice_date.toISOString(),
          total: Number(toNum(i.total_amount).toFixed(2)),
          paid: Number(toNum(i.paid_amount).toFixed(2)),
          credited: Number(toNum(i.credited_amount).toFixed(2)),
          balance: Number(balance.toFixed(2)),
          daysOutstanding: days,
          status: i.payment_status,
        };
      });

    const topProductMap = new Map<number, { productId: number; productCode: string; productName: string; quantity: number; netRevenue: number }>();
    for (const invoice of periodInvoices) {
      for (const line of invoice.invoice_lines) {
        const current = topProductMap.get(line.product_id) ?? {
          productId: line.product_id,
          productCode: line.product.product_code,
          productName: line.product.product_name,
          quantity: 0,
          netRevenue: 0,
        };
        current.quantity += line.quantity;
        current.netRevenue += toNum(line.net_line_total);
        topProductMap.set(line.product_id, current);
      }
    }

    const topProducts = Array.from(topProductMap.values())
      .sort((a, b) => b.netRevenue - a.netRevenue)
      .slice(0, 10)
      .map((p) => ({
        ...p,
        quantity: Number(p.quantity.toFixed(2)),
        netRevenue: Number(p.netRevenue.toFixed(2)),
      }));

    const locationMap = new Map<number, { locationId: number; locationCode: string; locationName: string; netSales: number; collections: number; outstanding: number }>();
    for (const invoice of periodInvoices) {
      const loc = invoice.location;
      if (!loc) continue;
      const current = locationMap.get(loc.location_id) ?? {
        locationId: loc.location_id,
        locationCode: loc.code,
        locationName: loc.name,
        netSales: 0,
        collections: 0,
        outstanding: 0,
      };
      current.netSales += toNum(invoice.total_amount) - toNum(invoice.credited_amount);
      locationMap.set(loc.location_id, current);
    }
    for (const invoice of allInvoices) {
      const loc = invoice.location;
      if (!loc) continue;
      const current = locationMap.get(loc.location_id) ?? {
        locationId: loc.location_id,
        locationCode: loc.code,
        locationName: loc.name,
        netSales: 0,
        collections: 0,
        outstanding: 0,
      };
      current.outstanding += toNum(invoice.balance_amount);
      locationMap.set(loc.location_id, current);
    }
    for (const receipt of periodReceipts) {
      const matching = periodInvoices.find((inv) => inv.invoice_id === receipt.invoice.invoice_id);
      if (!matching?.location) continue;
      const loc = matching.location;
      const current = locationMap.get(loc.location_id);
      if (!current) continue;
      current.collections += toNum(receipt.amount);
    }

    const locationBreakdown = Array.from(locationMap.values())
      .map((loc) => ({
        ...loc,
        netSales: Number(loc.netSales.toFixed(2)),
        collections: Number(loc.collections.toFixed(2)),
        outstanding: Number(loc.outstanding.toFixed(2)),
      }))
      .sort((a, b) => b.netSales - a.netSales);

    const customerMap = new Map<number, { customerId: number; customerName: string; invoiceCount: number; netSales: number; collections: number; outstanding: number; overdueAmount: number; lastInvoiceDate: Date | null }>();
    for (const invoice of periodInvoices) {
      const current = customerMap.get(invoice.customer_id) ?? {
        customerId: invoice.customer_id,
        customerName: invoice.customer?.name ?? "",
        invoiceCount: 0,
        netSales: 0,
        collections: 0,
        outstanding: 0,
        overdueAmount: 0,
        lastInvoiceDate: null,
      };
      current.invoiceCount += 1;
      current.netSales += toNum(invoice.total_amount) - toNum(invoice.credited_amount);
      current.lastInvoiceDate = !current.lastInvoiceDate || invoice.invoice_date > current.lastInvoiceDate ? invoice.invoice_date : current.lastInvoiceDate;
      customerMap.set(invoice.customer_id, current);
    }

    for (const invoice of allInvoices) {
      const current = customerMap.get(invoice.customer_id) ?? {
        customerId: invoice.customer_id,
        customerName: invoice.customer?.name ?? "",
        invoiceCount: 0,
        netSales: 0,
        collections: 0,
        outstanding: 0,
        overdueAmount: 0,
        lastInvoiceDate: invoice.invoice_date,
      };
      const balance = toNum(invoice.balance_amount);
      current.outstanding += balance;
      const days = Math.max(0, Math.floor((now.getTime() - invoice.invoice_date.getTime()) / DAY_MS));
      if (balance > 0 && days > 65) current.overdueAmount += balance;
      customerMap.set(invoice.customer_id, current);
    }

    for (const receipt of periodReceipts) {
      const customerId = periodInvoices.find((i) => i.invoice_id === receipt.invoice.invoice_id)?.customer_id;
      if (!customerId) continue;
      const current = customerMap.get(customerId);
      if (!current) continue;
      current.collections += toNum(receipt.amount);
    }

    const customerPerformance = Array.from(customerMap.values())
      .map((c) => ({
        customerId: c.customerId,
        customerName: c.customerName,
        invoiceCount: c.invoiceCount,
        netSales: Number(c.netSales.toFixed(2)),
        collections: Number(c.collections.toFixed(2)),
        outstanding: Number(c.outstanding.toFixed(2)),
        overdueAmount: Number(c.overdueAmount.toFixed(2)),
        lastInvoiceDate: c.lastInvoiceDate ? c.lastInvoiceDate.toISOString() : null,
      }))
      .sort((a, b) => b.netSales - a.netSales);

    const approvedCommission = commissions.reduce((sum, c) => sum + toNum(c.commission_amount), 0);
    const pendingCommission = pendingSettlements.reduce((sum, s) => {
      const signed = s.settlement_type === "CREDIT_NOTE" ? -toNum(s.amount) : toNum(s.amount);
      return sum + signed;
    }, 0);

    const commissionLedger = commissions.map((c) => ({
      commissionId: c.commission_id,
      settlementId: c.invoiceSettlement?.settlement_id ?? null,
      settlementType: c.invoiceSettlement?.settlement_type ?? null,
      settlementDate: c.invoiceSettlement?.settled_date ? c.invoiceSettlement.settled_date.toISOString() : null,
      invoiceNo: c.invoiceSettlement?.invoice.invoice_number ?? null,
      customerName: c.invoiceSettlement?.invoice.customer?.name ?? null,
      settlementAmount: c.invoiceSettlement ? Number(toNum(c.invoiceSettlement.amount).toFixed(2)) : 0,
      commissionRate: Number((toNum(c.commission_rate) * 100).toFixed(2)),
      commissionAmount: Number(toNum(c.commission_amount).toFixed(2)),
      daysToPay: c.days_to_pay ?? 0,
      status: c.status,
      createdAt: c.created_at.toISOString(),
    }));

    const pendingCommissionRows = pendingSettlements.map((s) => ({
      settlementId: s.settlement_id,
      settlementType: s.settlement_type,
      invoiceId: s.invoice.invoice_id,
      invoiceNo: s.invoice.invoice_number ?? "",
      customerName: s.invoice.customer?.name ?? "",
      receiptId: s.receipt?.receipt_id ?? null,
      receiptDate: s.receipt?.receipt_date ? s.receipt.receipt_date.toISOString() : null,
      settlementDate: s.settled_date.toISOString(),
      settlementAmount: Number((s.settlement_type === "CREDIT_NOTE" ? -toNum(s.amount) : toNum(s.amount)).toFixed(2)),
    }));

    const transactions = [
      ...periodInvoices.map((i) => ({
        type: "invoice" as const,
        id: i.invoice_id,
        reference: i.invoice_number,
        date: i.invoice_date.toISOString(),
        amount: Number((toNum(i.total_amount) - toNum(i.credited_amount)).toFixed(2)),
        status: i.payment_status,
      })),
      ...periodReceipts.map((r) => ({
        type: "receipt" as const,
        id: r.receipt_id,
        reference: `RCP-${String(r.receipt_id).padStart(4, "0")}`,
        date: r.receipt_date.toISOString(),
        amount: Number(toNum(r.amount).toFixed(2)),
        status: r.payment_method,
      })),
      ...pendingSettlements
        .filter((s) => s.settlement_type === "CREDIT_NOTE")
        .map((s) => ({
          type: "credit" as const,
          id: s.settlement_id,
          reference: `CRN-SET-${s.settlement_id}`,
          date: s.settled_date.toISOString(),
          amount: Number((-toNum(s.amount)).toFixed(2)),
          status: "PENDING_COMMISSION",
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      rep: {
        repId: rep.rep_id,
        repName: rep.full_name,
        phone: rep.phone,
        assignedCustomers: rep._count.customers,
      },
      period: {
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        label: period.label,
      },
      kpis: {
        lifetimeSales: Number(lifetimeSales.toFixed(2)),
        periodNetSales: Number(periodNetSales.toFixed(2)),
        collections: Number(periodCollections.toFixed(2)),
        outstanding: Number(outstanding.toFixed(2)),
        overdueAmount: Number(overdueAmount.toFixed(2)),
        avgDaysToCollect: weightedDays.amount > 0 ? Number((weightedDays.days / weightedDays.amount).toFixed(1)) : null,
        invoiceCount: periodInvoices.length,
        approvedCommission: Number(approvedCommission.toFixed(2)),
        pendingCommission: Number(pendingCommission.toFixed(2)),
      },
      trend,
      aging: [
        { bucket: "0-30", amount: Number(aging0_30.toFixed(2)) },
        { bucket: "31-65", amount: Number(aging31_65.toFixed(2)) },
        { bucket: "65+", amount: Number(aging65p.toFixed(2)) },
      ],
      topProducts,
      locationBreakdown,
      customerPerformance,
      openInvoices,
      commissionLedger,
      pendingCommissionRows,
      transactions,
    });
  } catch (error) {
    console.error("Failed to load sales rep detail", error);
    const message = error instanceof Error ? error.message : "Failed to load sales rep detail.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
