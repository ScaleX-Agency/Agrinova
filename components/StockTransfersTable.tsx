"use client";

import Pagination from "rc-pagination";
import "rc-pagination/assets/index.css";
import type { StockTransferRecord } from "@/types/inventory";

interface Props {
  rows: StockTransferRecord[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    setPage: (page: number) => void;
  };
  onCreateTransfer: () => void;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function StockTransfersTable({
  rows,
  pagination,
  onCreateTransfer,
}: Props) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <span className="text-[13px] font-semibold text-stone-700">
          Transfer Records
        </span>
        <span className="text-[11px] text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full">
          {pagination?.total ?? rows.length} records
        </span>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-stone-100">
            {["Transfer #", "Date", "From", "To", "Products", "Total Qty", "Notes", "By"].map((head, idx) => (
              <th
                key={head}
                className={`px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-stone-400 bg-white ${
                  idx === 5 ? "text-right" : "text-left"
                }`}
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center">
                <p className="text-[14px] font-medium text-stone-500">No stock transfers recorded yet</p>
                <p className="text-[12px] text-stone-400 mt-1 mb-4">Create your first transfer between inventory locations.</p>
                <button
                  onClick={onCreateTransfer}
                  className="inline-flex items-center px-3 py-2 text-[12px] font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors"
                >
                  Transfer Stock
                </button>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.transfer_id} className="border-b border-stone-50 hover:bg-stone-50/70 transition-colors">
                <td className="px-3.5 py-3 text-[12px] font-medium text-blue-800 [font-family:var(--font-jetbrains)]">
                  {row.transfer_no}
                </td>
                <td className="px-3.5 py-3 text-[12px] text-stone-500">{fmtDate(row.transfer_date)}</td>
                <td className="px-3.5 py-3 text-[12px] text-stone-700">{row.from_location_code}</td>
                <td className="px-3.5 py-3 text-[12px] text-stone-700">{row.to_location_code}</td>
                <td className="px-3.5 py-3 text-[12px] text-stone-700">{row.line_count}</td>
                <td className="px-3.5 py-3 text-[12px] text-right text-stone-700 [font-family:var(--font-jetbrains)]">{row.total_qty}</td>
                <td className="px-3.5 py-3 text-[12px] text-stone-500 max-w-[220px] truncate">{row.notes ?? "-"}</td>
                <td className="px-3.5 py-3 text-[12px] text-stone-500">{row.created_by_name}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pagination && pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 bg-stone-50">
          <span className="text-[12px] text-stone-500">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
            {pagination.total} entries
          </span>
          <Pagination
            current={pagination.page}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onChange={(p) => pagination.setPage(p)}
            className="text-[12px]"
          />
        </div>
      )}
    </div>
  );
}
