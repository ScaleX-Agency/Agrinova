import * as XLSX from "xlsx";
import type { StockOverviewRow } from "@/types/inventory";

export function exportStockToExcel(params: {
  rows: StockOverviewRow[];
}): void {
  const { rows } = params;
  const today = new Date().toISOString().split("T")[0];

  const data = rows.map((row) => ({
    "Product Code": row.product_code,
    "Product Name": row.product_name,
    "Pack Size": row.pack_size,
    "Balance Qty": row.quantity_on_hand,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 16 },
    { wch: 36 },
    { wch: 18 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock Balance");
  XLSX.writeFile(wb, `agrinova-stock-balance-${today}.xlsx`);
}
