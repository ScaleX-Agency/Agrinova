"use client";

import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import type {
  ApprovePendingCommissionsResponse,
  CommissionConfigResponse,
  PendingCommissionsResponse,
  PendingCommissionRowDto,
} from "@/types/api";

type PeriodType = "daily" | "weekly" | "monthly" | "yearly" | "custom";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export default function PendingCommissionTab({
  periodType,
  date,
  month,
  year,
  from,
  to,
  repId,
}: {
  periodType: PeriodType;
  date: string;
  month: string;
  year: string;
  from: string;
  to: string;
  repId: string;
}) {
  const qc = useQueryClient();
  const [rateEdits, setRateEdits] = useState<Record<number, number | undefined>>({});
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [configDraft, setConfigDraft] = useState<{
    sameDayRate: number;
    rangeMinDays: number;
    rangeMaxDays: number;
    rangeRate: number;
    overRangeRate: number;
  } | null>(null);

  const pendingQuery = useQuery({
    queryKey: ["commission-pending", periodType, date, month, year, from, to, repId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("periodType", periodType);
      if (periodType === "daily" || periodType === "weekly") params.set("date", date);
      if (periodType === "monthly") params.set("month", month);
      if (periodType === "yearly") params.set("year", year);
      if (periodType === "custom") {
        params.set("from", from);
        params.set("to", to);
      }
      params.set("repId", repId);
      const response = await fetch(`/api/commission/pending?${params.toString()}`);
      const result = (await response.json()) as PendingCommissionsResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load pending commissions.");
      return result.data?.rows ?? [];
    },
  });

  const configQuery = useQuery({
    queryKey: ["commission-config"],
    queryFn: async () => {
      const response = await fetch("/api/commission/config");
      const result = (await response.json()) as CommissionConfigResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to load commission config.");
      return result.data;
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/commission/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(effectiveConfig),
      });
      const result = (await response.json()) as CommissionConfigResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to update commission config.");
      return result.data;
    },
    onSuccess: (data) => {
      if (data) setConfigDraft(data);
      qc.invalidateQueries({ queryKey: ["commission-config"] });
      qc.invalidateQueries({ queryKey: ["commission-pending"] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (
      items: Array<{ commissionId: number; rateOverride?: number }>,
    ) => {
      const payload = { items };
      const response = await fetch("/api/commission/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as ApprovePendingCommissionsResponse;
      if (!response.ok) throw new Error(result.error ?? "Failed to approve commissions.");
      return result.data;
    },
    onSuccess: () => {
      setRateEdits({});
      qc.invalidateQueries({ queryKey: ["commission-pending"] });
      qc.invalidateQueries({ queryKey: ["commission-summary"] });
      qc.invalidateQueries({ queryKey: ["commission-dashboard"] });
      qc.invalidateQueries({ queryKey: ["sales-rep-sales"] });
    },
  });

  const rows = useMemo(() => pendingQuery.data ?? [], [pendingQuery.data]);
  const effectiveConfig = configDraft ??
    configQuery.data ?? {
      sameDayRate: 2.5,
      rangeMinDays: 1,
      rangeMaxDays: 59,
      rangeRate: 2.0,
      overRangeRate: 0,
    };

  const totalPending = useMemo(
    () =>
      rows.reduce((sum, row) => {
        if (row.settlementType === "CREDIT_NOTE") {
          // Credit note commissions use their computed amount (negative), no rate edit
          return sum + Number(row.computedCommissionAmount);
        }
        const override = rateEdits[row.commissionId];
        const rate = typeof override === "number" ? override / 100 : row.appliedRate / 100;
        return sum + row.settlementAmount * rate;
      }, 0),
    [rows, rateEdits],
  );

  const canSaveConfig = !!configQuery.data && !saveConfigMutation.isPending;

  const toggleExpand = (commissionId: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(commissionId)) next.delete(commissionId);
      else next.add(commissionId);
      return next;
    });
  };

  const getDisplayAmount = (row: PendingCommissionRowDto) => {
    if (row.settlementType === "CREDIT_NOTE") {
      return Number(row.computedCommissionAmount);
    }
    const override = rateEdits[row.commissionId];
    const rate = typeof override === "number" ? override / 100 : row.appliedRate / 100;
    return row.settlementAmount * rate;
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <p className="text-[13px] font-semibold text-[#2b2d7e]">Commission Condition</p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["Same-day %", "sameDayRate"],
            ["Range Min", "rangeMinDays"],
            ["Range Max", "rangeMaxDays"],
            ["Range %", "rangeRate"],
            ["Over-range %", "overRangeRate"],
          ].map(([label, key]) => (
            <label key={key} className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.08em] text-stone-500">{label}</span>
              <input
                type="number"
                step="0.01"
                value={effectiveConfig[key as keyof typeof effectiveConfig]}
                onChange={(event) =>
                  setConfigDraft((prev) => ({
                    ...(prev ?? effectiveConfig),
                    [key]: Number(event.target.value),
                  }))
                }
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[13px]"
              />
            </label>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={!canSaveConfig}
            onClick={() => saveConfigMutation.mutate()}
            className="rounded-xl bg-[#1a5c2e] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
          >
            {saveConfigMutation.isPending ? "Saving..." : "Save Conditions"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-[#2b2d7e]">Pending Commissions</p>
          <p className="text-[12px] text-stone-500">
            {rows.length} rows | Total {formatCurrency(totalPending)}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] border-collapse">
            <thead>
              <tr className="border-b border-stone-200">
                {[
                  "",
                  "Invoice #",
                  "Receipt #",
                  "Type",
                  "Customer",
                  "Sales Rep",
                  "Invoice Date",
                  "Settlement Date",
                  "Days",
                  "Settlement Amount",
                  "Rate %",
                  "Commission",
                  "Action",
                ].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-stone-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isCredit = row.settlementType === "CREDIT_NOTE";
                const rate = isCredit
                  ? row.appliedRate
                  : (rateEdits[row.commissionId] ?? row.appliedRate);
                const amount = getDisplayAmount(row);
                const isExpanded = expandedRows.has(row.commissionId);
                const hasReversals = row.reversalDetails.length > 0;

                return (
                  <Fragment key={row.commissionId}>
                    <tr className={`border-b border-stone-100 ${isCredit ? "bg-red-50/40" : ""}`}>
                      <td className="px-2 py-2 text-[12px]">
                        {hasReversals && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(row.commissionId)}
                            className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[12px] [font-family:var(--font-jetbrains)]">{row.invoiceNo}</td>
                      <td className="px-3 py-2 text-[12px] [font-family:var(--font-jetbrains)]">
                        {row.receiptNo ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-[12px]">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            isCredit
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-stone-200 text-stone-700"
                          }`}
                        >
                          {isCredit ? "Credit Reversal" : "Receipt"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[12px]">{row.customerName}</td>
                      <td className="px-3 py-2 text-[12px]">{row.repName}</td>
                      <td className="px-3 py-2 text-[12px]">{formatDate(row.invoiceDate)}</td>
                      <td className="px-3 py-2 text-[12px]">{formatDate(row.settlementDate)}</td>
                      <td className="px-3 py-2 text-[12px]">{row.daysToPay}</td>
                      <td className={`px-3 py-2 text-[12px] ${isCredit ? "text-red-700" : ""}`}>
                        {formatCurrency(row.settlementAmount)}
                      </td>
                      <td className="px-3 py-2 text-[12px]">
                        {isCredit ? (
                          <span className="inline-block w-20 rounded border border-stone-200 bg-stone-100 px-2 py-1 text-stone-400">
                            {rate.toFixed(2)}
                          </span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            value={rate}
                            onChange={(event) =>
                              setRateEdits((prev) => ({
                                ...prev,
                                [row.commissionId]: Number(event.target.value),
                              }))
                            }
                            className="w-20 rounded border border-stone-200 px-2 py-1"
                          />
                        )}
                      </td>
                      <td className={`px-3 py-2 text-[12px] font-semibold ${amount < 0 ? "text-red-700" : "text-[#1a5c2e]"}`}>
                        {formatCurrency(amount)}
                      </td>
                      <td className="px-3 py-2 text-[12px]">
                        <button
                          type="button"
                          disabled={approveMutation.isPending}
                          onClick={() =>
                            approveMutation.mutate([
                              {
                                commissionId: row.commissionId,
                                rateOverride: isCredit ? undefined : rateEdits[row.commissionId],
                              },
                            ])
                          }
                          className="rounded-lg border border-[#c0c3f0] px-2 py-1 text-[11px] font-medium text-[#2b2d7e] disabled:opacity-60"
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                    {hasReversals && isExpanded && (
                      <tr key={`${row.commissionId}-details`} className="border-b border-stone-100">
                        <td colSpan={13} className="px-6 py-3 bg-stone-50/50">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                            Reversal Breakdown
                          </p>
                          <table className="w-full max-w-[700px] border-collapse">
                            <thead>
                              <tr className="border-b border-stone-200">
                                <th className="px-3 py-1.5 text-left text-[10px] uppercase text-stone-400">Source Receipt</th>
                                <th className="px-3 py-1.5 text-right text-[10px] uppercase text-stone-400">Allocated</th>
                                <th className="px-3 py-1.5 text-right text-[10px] uppercase text-stone-400">Rate</th>
                                <th className="px-3 py-1.5 text-right text-[10px] uppercase text-stone-400">Reversal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.reversalDetails.map((detail) => (
                                <tr key={detail.allocationId} className="border-b border-stone-100">
                                  <td className="px-3 py-1.5 text-[12px] [font-family:var(--font-jetbrains)]">
                                    {detail.sourceReceiptNo ?? "—"}
                                  </td>
                                  <td className="px-3 py-1.5 text-right text-[12px]">
                                    {formatCurrency(detail.allocatedAmount)}
                                  </td>
                                  <td className="px-3 py-1.5 text-right text-[12px]">
                                    {detail.appliedRate.toFixed(2)}%
                                  </td>
                                  <td className="px-3 py-1.5 text-right text-[12px] font-semibold text-red-700">
                                    {formatCurrency(detail.reversalAmount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-[13px] text-stone-500">
                    No pending commissions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
