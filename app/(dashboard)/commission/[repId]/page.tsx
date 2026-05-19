"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Loader2,
  Phone,
  RefreshCcw,
} from "lucide-react";

type PeriodType = "daily" | "monthly" | "yearly" | "custom";

type DetailResponse = {
  rep: {
    repId: number;
    repName: string;
    phone: string | null;
    assignedCustomers: number;
  };
  period: { startDate: string; endDate: string; label: string };
  kpis: {
    lifetimeSales: number;
    periodNetSales: number;
    collections: number;
    outstanding: number;
    overdueAmount: number;
    avgDaysToCollect: number | null;
    invoiceCount: number;
    approvedCommission: number;
    pendingCommission: number;
  };
  trend: Array<{ label: string; sales: number; collections: number }>;
  aging: Array<{ bucket: string; amount: number }>;
  topProducts: Array<{ productId: number; productCode: string; productName: string; quantity: number; netRevenue: number }>;
  locationBreakdown: Array<{ locationId: number; locationCode: string; locationName: string; netSales: number; collections: number; outstanding: number }>;
  customerPerformance: Array<{ customerId: number; customerName: string; invoiceCount: number; netSales: number; collections: number; outstanding: number; overdueAmount: number; lastInvoiceDate: string | null }>;
  openInvoices: Array<{ invoiceId: number; invoiceNumber: string; customerName: string; invoiceDate: string; total: number; paid: number; credited: number; balance: number; daysOutstanding: number; status: string }>;
  commissionLedger: Array<{ type: "Receipt" | "Sales Return" | "Check Return" | "Unknown"; commissionId: number; settlementId: number | null; settlementType: string | null; settlementDate: string | null; invoiceNo: string | null; invoiceDate: string | null; customerName: string | null; receiptNo: string | null; receiptDate: string | null; paymentMethod: "CASH" | "CHEQUE" | "BANK_TRANSFER" | null; salesReturnNo: string | null; settlementAmount: number; commissionRate: number; commissionAmount: number; daysToPay: number; status: string; createdAt: string }>;
  pendingCommissionRows: Array<{ settlementId: number; settlementType: string; invoiceId: number; invoiceNo: string; customerName: string; receiptId: number | null; receiptDate: string | null; settlementDate: string; settlementAmount: number }>;
  transactions: Array<{ type: "invoice" | "receipt" | "credit"; id: number; reference: string; date: string; amount: number; status: string }>;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthISO() {
  return new Date().toISOString().slice(0, 7);
}

function yearISO() {
  return String(new Date().getFullYear());
}

export default function CommissionRepDetailPage() {
  const params = useParams<{ repId: string }>();
  const repId = Number(params.repId);

  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [date, setDate] = useState(todayISO());
  const [month, setMonth] = useState(monthISO());
  const [year, setYear] = useState(yearISO());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [dateFilterBasedOn, setDateFilterBasedOn] = useState<"invoice" | "settlement">("invoice");
  const [isExporting, setIsExporting] = useState(false);

  const filters = useMemo(() => ({ periodType, date, month, year, from, to, dateFilterBasedOn }), [periodType, date, month, year, from, to, dateFilterBasedOn]);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("periodType", filters.periodType);
    if (filters.periodType === "daily") sp.set("date", filters.date);
    if (filters.periodType === "monthly") sp.set("month", filters.month);
    if (filters.periodType === "yearly") sp.set("year", filters.year);
    if (filters.periodType === "custom") {
      sp.set("from", filters.from);
      sp.set("to", filters.to);
    }
    sp.set("dateFilterBasedOn", filters.dateFilterBasedOn);
    return sp.toString();
  }, [filters]);

  const detailQuery = useQuery({
    queryKey: ["sales-rep-sales-detail", repId, filters],
    queryFn: async () => {
      const response = await fetch(`/api/sales-rep-sales/${repId}?${queryString}`, { cache: "no-store" });
      const data = (await response.json()) as DetailResponse | { error?: string };
      if (!response.ok) throw new Error((data as { error?: string }).error ?? "Failed to load sales rep detail.");
      return data as DetailResponse;
    },
    enabled: Number.isInteger(repId) && repId > 0,
  });

  const reset = () => {
    setPeriodType("monthly");
    setDate(todayISO());
    setMonth(monthISO());
    setYear(yearISO());
    setFrom(todayISO());
    setTo(todayISO());
  };

  const groupedInvoices = useMemo(() => {
    const ledger = (detailQuery.data?.commissionLedger ?? []).filter((row) => row.commissionAmount !== 0);
    const byInvoice = new Map<string, {
      invoiceNo: string;
      customerName: string;
      invoiceDate: string;
      totalCommission: number;
      rows: typeof ledger;
    }>();

    for (const row of ledger) {
      const key = row.invoiceNo ?? `invoice-${row.commissionId}`;
      const existing = byInvoice.get(key);
      if (!existing) {
        byInvoice.set(key, {
          invoiceNo: row.invoiceNo ?? "-",
          customerName: row.customerName ?? "-",
          invoiceDate: row.invoiceDate ?? "",
          totalCommission: row.commissionAmount,
          rows: [row],
        });
        continue;
      }
      existing.totalCommission += row.commissionAmount;
      existing.rows.push(row);
    }

    return Array.from(byInvoice.values()).sort((a, b) =>
      (b.invoiceDate || "").localeCompare(a.invoiceDate || ""),
    );
  }, [detailQuery.data]);

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const paymentMethodLabel = (method: "CASH" | "CHEQUE" | "BANK_TRANSFER" | null) => {
    if (method === "CHEQUE") return "Cheque";
    if (method === "BANK_TRANSFER") return "Bank Transfer";
    if (method === "CASH") return "Cash";
    return "-";
  };

  const handleExportExcel = async () => {
    if (!detailQuery.data) return;
    setIsExporting(true);
    try {
      const { exportRepCommissionToExcel } = await import("@/lib/exportRepCommission");
      const groups = groupedInvoices.map((group) => ({
        invoiceNo: group.invoiceNo,
        customerName: group.customerName,
        invoiceDate: formatDate(group.invoiceDate),
        totalCommission: group.totalCommission,
        settlements: group.rows.map((row) => {
          const referenceNo =
            row.settlementType === "RECEIPT" || row.settlementType === "CHEQUE_RETURN"
              ? row.receiptNo ?? "-"
              : row.settlementType === "CREDIT_NOTE"
                ? row.salesReturnNo ?? "SRN"
                : "-";
          const displayPaymentMethod =
            row.settlementType === "CREDIT_NOTE"
              ? "Sales Return"
              : paymentMethodLabel(row.paymentMethod);

          return {
            receiptDate: formatDate(row.receiptDate ?? row.settlementDate),
            receiptNumber: referenceNo,
            paymentMethod: displayPaymentMethod,
            amount: row.settlementAmount,
            dayGap: row.daysToPay,
            commissionRate: row.commissionRate / 100,
            commissionAmount: row.commissionAmount,
          };
        }),
      }));

      await exportRepCommissionToExcel({
        repName: detailQuery.data.rep.repName,
        fromLabel: formatDate(detailQuery.data.period.startDate),
        toLabel: formatDate(detailQuery.data.period.endDate),
        groups,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/commission" className="inline-flex items-center gap-1 text-[12px] text-stone-500 hover:text-stone-700">
            <ArrowLeft size={13} /> Back to Commission
          </Link>
          <h1 className="mt-1 text-[28px] leading-tight text-stone-900 font-semibold">{detailQuery.data?.rep.repName ?? "Sales Rep"}</h1>
          <p className="text-[13px] text-stone-500 mt-1 inline-flex items-center gap-2">
            <Phone size={13} /> {detailQuery.data?.rep.phone ?? "-"} | Assigned Customers: {detailQuery.data?.rep.assignedCustomers ?? "-"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting || !detailQuery.data}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-700 px-3 py-2 text-[12px] font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-green-700"
          >
            {isExporting ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Exporting...
              </>
            ) : (
              <>
                <Download size={13} /> Export Excel
              </>
            )}
          </button>
          <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50">
            <RefreshCcw size={13} /> Reset
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Filter By</span>
            <select className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" value={dateFilterBasedOn} onChange={(e) => setDateFilterBasedOn(e.target.value as "invoice" | "settlement")}>
              <option value="settlement">Settlement Date</option>
              <option value="invoice">Invoice Date</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Period Type</span>
            <select className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" value={periodType} onChange={(e) => setPeriodType(e.target.value as PeriodType)}>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {periodType === "daily" && (
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" />
            </label>
          )}
          {periodType === "monthly" && (
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Month</span>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" />
            </label>
          )}
          {periodType === "yearly" && (
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">Year</span>
              <input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" />
            </label>
          )}
          {periodType === "custom" && (
            <>
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">From</span>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.1em] text-stone-500">To</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]" />
              </label>
            </>
          )}
        </div>
      </section>

      {detailQuery.isLoading ? (
        <div className="space-y-4">
          <div className="h-[420px] rounded-2xl border border-stone-200 bg-white animate-pulse" />
        </div>
      ) : detailQuery.error ? (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
          {(detailQuery.error as Error).message}
        </div>
      ) : !detailQuery.data ? (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[13px]">
          No data available.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px] border-collapse">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    {[
                      "Invoice No",
                      "Customer",
                      "Invoice Date",
                      "Type",
                      "Receipt Date",
                      "Receipt Number",
                      "Payment Method",
                      "Amount",
                      "Day Gap",
                      "Commission Rate",
                      "Commission Amount",
                      "Total Commission",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-stone-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-[13px] text-stone-400">
                        No commission records.
                      </td>
                    </tr>
                  ) : (
                    groupedInvoices.map((group) =>
                      group.rows.map((row, idx) => {
                        const isNegative = row.commissionAmount < 0;
                        return (
                          <tr
                            key={row.commissionId}
                            className="border-b border-stone-100"
                          >
                      {idx === 0 && (
                              <>
                                <td rowSpan={group.rows.length} className="px-3 py-2 align-top text-[12px] font-medium text-[#2b2d7e] [font-family:var(--font-jetbrains)]">
                                  {group.invoiceNo}
                                </td>
                                <td rowSpan={group.rows.length} className="px-3 py-2 align-top text-[12px] text-stone-800">
                                  {group.customerName}
                                </td>
                                <td rowSpan={group.rows.length} className="px-3 py-2 align-top text-[12px] text-stone-700">
                                  {formatDate(group.invoiceDate)}
                                </td>
                              </>
                      )}
                            <td className="px-3 py-2 text-[12px] text-stone-700">{row.type}</td>
                            <td className="px-3 py-2 text-[12px] text-stone-700">{formatDate(row.receiptDate ?? row.settlementDate)}</td>
                            <td className={`px-3 py-2 text-[12px] [font-family:var(--font-jetbrains)] ${row.settlementType === "CREDIT_NOTE" ? "text-red-700 font-medium" : "text-stone-700"}`}>
                              {row.settlementType === "RECEIPT" || row.settlementType === "CHEQUE_RETURN"
                                ? row.receiptNo ?? "-"
                                : row.settlementType === "CREDIT_NOTE"
                                  ? row.salesReturnNo ?? "SRN"
                                  : "-"}
                            </td>
                            <td className="px-3 py-2 text-[12px] text-stone-700">
                              {row.settlementType === "CREDIT_NOTE" ? "Sales Return" : paymentMethodLabel(row.paymentMethod)}
                            </td>
                            <td className={`px-3 py-2 text-[12px] [font-family:var(--font-jetbrains)] ${row.settlementAmount < 0 ? "text-red-700 font-medium" : "text-stone-800"}`}>
                              {formatCurrency(row.settlementAmount)}
                            </td>
                            <td className="px-3 py-2 text-[12px] text-stone-700">{row.daysToPay}</td>
                            <td className="px-3 py-2 text-[12px] text-stone-700">{row.commissionRate.toFixed(2)}%</td>
                            <td className={`px-3 py-2 text-[12px] [font-family:var(--font-jetbrains)] ${isNegative ? "text-red-700 font-medium" : "text-stone-800"}`}>
                              {formatCurrency(row.commissionAmount)}
                            </td>
                            {idx === 0 && (
                              <td rowSpan={group.rows.length} className={`px-3 py-2 align-top text-[12px] font-semibold [font-family:var(--font-jetbrains)] ${group.totalCommission < 0 ? "text-red-700" : "text-stone-900"}`}>
                                {formatCurrency(group.totalCommission)}
                              </td>
                            )}
                          </tr>
                        );
                      }),
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
