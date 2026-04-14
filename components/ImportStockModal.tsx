"use client";

import { useState } from "react";
import { Upload, Download, X } from "lucide-react";
import { StockOverviewRow } from "@/types/inventory";

interface Props {
  onClose: () => void;
  onSaved: (rows: StockOverviewRow[]) => void;
}

export default function ImportStockModal({ onClose, onSaved }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [errorRows, setErrorRows] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);

  const handleDownloadTemplate = () => {
    const csv = "product_code,location_code,quantity,entry_type,date,notes\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agrinova-stock-import-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      const headers = lines[0].split(",").map((h) => h.trim());

      const parsed = lines.slice(1, 6).map((line, idx) => {
        const values = line.split(",").map((v) => v.trim());
        const rowData: any = {};
        headers.forEach((h, i) => {
          rowData[h] = values[i];
        });
        return { ...rowData, _rowIndex: idx + 1 };
      });

      setPreview(parsed);

      // Basic validation: assume any missing code is an error
      const errs = parsed
        .filter(
          (r) =>
            !r.product_code || !r.location_code || isNaN(Number(r.quantity)),
        )
        .map((r) => r._rowIndex);

      setErrorRows(errs);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!file || errorRows.length > 0) return;
    setImporting(true);

    try {
      const res = await fetch("/api/inventory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preview),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to import stock");
      }

      const { imported } = await res.json();
      onSaved(imported);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 min-h-[600px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#181c27] border border-[#2a2f45] rounded-2xl w-full max-w-[560px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a2f45] flex items-center justify-between shrink-0">
          <p className="text-[16px] font-semibold text-[#e8eaf0]">
            Import Stock from CSV
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#242840] hover:bg-[#2a2f45] text-stone-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex-1 overflow-y-auto space-y-5">
          {/* Dropzone */}
          <div className="relative border-dashed border-2 border-[#2a2f45] dark:border-[#323752] rounded-xl p-8 text-center bg-[#1e2335]/50 hover:bg-[#1e2335] transition-colors cursor-pointer group">
            <input
              type="file"
              accept=".csv"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center justify-center pointer-events-none">
              <Upload
                size={28}
                className="text-[#555c78] mb-3 group-hover:text-blue-400 transition-colors"
              />
              <p className="text-[14px] font-medium text-[#e8eaf0] mb-1">
                {file ? file.name : "Drop a CSV file here, or click to browse"}
              </p>
              <p className="text-[12px] text-[#8b91a8]">
                Columns required: product_code, location_code, quantity
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[#93c5fd] hover:text-[#bfdbfe] transition-colors"
            >
              <Download size={13} /> Download template
            </button>
          </div>

          {/* Preview Table */}
          {preview.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#555c78] mb-2">
                Preview (First 5 Rows)
              </p>
              <div className="border border-[#2a2f45] rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#1e2335]">
                    <tr>
                      <th className="px-4 py-2 text-[10px] uppercase font-medium text-[#555c78]">
                        Product Code
                      </th>
                      <th className="px-4 py-2 text-[10px] uppercase font-medium text-[#555c78]">
                        Location
                      </th>
                      <th className="px-4 py-2 text-[10px] uppercase font-medium text-[#555c78]">
                        Qty
                      </th>
                      <th className="px-4 py-2 text-[10px] uppercase font-medium text-[#555c78]">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#181c27]">
                    {preview.map((row, i) => {
                      const isErr = errorRows.includes(row._rowIndex);
                      return (
                        <tr
                          key={i}
                          className={`border-b border-[#2a2f45] last:border-0 ${isErr ? "bg-red-900/20" : ""}`}
                        >
                          <td className="px-4 py-2.5 text-[12px] text-[#e8eaf0] font-mono">
                            {row.product_code || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-[#e8eaf0] font-mono">
                            {row.location_code || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-[#e8eaf0]">
                            {row.quantity || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-[#e8eaf0]">
                            {row.entry_type || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {errorRows.length > 0 && (
                <p className="text-[12px] text-[#f87171] mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f87171]" />
                  Some rows have invalid data. Please correct them before
                  importing.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2a2f45] flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-[#8b91a8] hover:bg-[#242840] hover:text-[#e8eaf0] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || errorRows.length > 0 || importing}
            className="px-4 py-2 text-[13px] font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {importing
              ? "Importing…"
              : `Import ${preview.length > 0 ? preview.length : ""} Rows`}
          </button>
        </div>
      </div>
    </div>
  );
}
