import ExcelJS from "exceljs";

type TransferLine = {
  productName: string;
  productCode: string;
  packSize: string;
  quantity: number;
};

type TransferExportRow = {
  transferNo: string;
  transferDate: string;
  fromLocationName: string;
  toLocationName: string;
  lines: TransferLine[];
};

type ExportTransferParams = {
  fromLabel: string;
  toLabel: string;
  rows: TransferExportRow[];
};

function formatLocationName(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (normalized.includes("colombo 2")) return "Col 2";
  if (normalized.includes("head office")) return "Head office";
  return name.replace(/\s+branch$/i, "").trim();
}

function formatDateDDMMM(dateStr: string): string {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[date.getMonth()];
  return `${day}-${month}`;
}

export async function exportStockTransfersToExcel(
  params: ExportTransferParams,
): Promise<void> {
  const { fromLabel, toLabel, rows } = params;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Stock Transfers");

  // Define Columns (Total 9 Columns: A to I)
  ws.columns = [
    { key: "index", width: 6 },
    { key: "date", width: 15 },
    { key: "sourceLocation", width: 20 },
    { key: "destination", width: 20 },
    { key: "productName", width: 25 },
    { key: "productNameMerge", width: 15 },
    { key: "productCode", width: 15 },
    { key: "packSize", width: 15 },
    { key: "quantity", width: 10 },
  ];

  // Document Title
  ws.getCell("A1").value = "Stock Transfers";
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.mergeCells("A1:I1");

  // Date Range Info
  ws.getCell("A2").value = "From";
  ws.getCell("B2").value = fromLabel;
  ws.getCell("A3").value = "To";
  ws.getCell("B3").value = toLabel;

  // Set borders for metadata range
  const thinBorder = {
    top: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
    left: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
    bottom: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
    right: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
  };

  for (let r = 2; r <= 3; r += 1) {
    for (let c = 1; c <= 2; c += 1) {
      ws.getCell(r, c).border = thinBorder;
    }
  }

  // Set headers
  const headerRowIndex = 5;
  const headerRow = ws.getRow(headerRowIndex);
  headerRow.values = [
    "No",
    "Date",
    "Source Location",
    "Destination Location",
    "Product Name",
    "",
    "Product Code",
    "Pack Size",
    "Qty",
  ];
  ws.mergeCells("E5:F5");

  headerRow.font = { bold: true, color: { argb: "FF334155" } };
  for (let c = 1; c <= 9; c += 1) {
    const cell = ws.getCell(headerRowIndex, c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;
  }

  let currentRow = 6;
  let index = 1;

  for (const row of rows) {
    const lines = row.lines || [];
    const L = lines.length;

    const formattedDate = formatDateDDMMM(row.transferDate);
    const formattedFromLoc = formatLocationName(row.fromLocationName);
    const formattedToLoc = formatLocationName(row.toLocationName);

    if (L === 0) {
      // If there are no lines, write an empty row
      ws.getCell(currentRow, 1).value = index;
      ws.getCell(currentRow, 2).value = formattedDate;
      ws.getCell(currentRow, 3).value = formattedFromLoc;
      ws.getCell(currentRow, 4).value = formattedToLoc;
      ws.mergeCells(currentRow, 5, currentRow, 6);

      for (let c = 1; c <= 9; c += 1) {
        const cell = ws.getCell(currentRow, c);
        cell.border = thinBorder;
        if (c <= 4) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
      }
      currentRow += 1;
      index += 1;
      continue;
    }

    const endRow = currentRow + L - 1;

    // Merge metadata columns vertically
    ws.mergeCells(currentRow, 1, endRow, 1);
    ws.getCell(currentRow, 1).value = index;

    ws.mergeCells(currentRow, 2, endRow, 2);
    ws.getCell(currentRow, 2).value = formattedDate;

    ws.mergeCells(currentRow, 3, endRow, 3);
    ws.getCell(currentRow, 3).value = formattedFromLoc;

    ws.mergeCells(currentRow, 4, endRow, 4);
    ws.getCell(currentRow, 4).value = formattedToLoc;

    // Write each line
    for (let i = 0; i < L; i += 1) {
      const line = lines[i];
      const r = currentRow + i;

      // Merge product name columns E (5) & F (6)
      ws.mergeCells(r, 5, r, 6);
      ws.getCell(r, 5).value = line.productName;

      ws.getCell(r, 7).value = line.productCode;
      ws.getCell(r, 8).value = line.packSize;
      ws.getCell(r, 9).value = line.quantity;
    }

    // Apply formatting and borders to all cells in the block
    for (let r = currentRow; r <= endRow; r += 1) {
      for (let c = 1; c <= 9; c += 1) {
        const cell = ws.getCell(r, c);
        cell.border = thinBorder;

        // Alignment
        if (c <= 4) {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
        } else if (c >= 5 && c <= 8) {
          cell.alignment = { vertical: "middle", horizontal: "left" };
        } else if (c === 9) {
          cell.alignment = { vertical: "middle", horizontal: "right" };
        }
      }
    }

    currentRow += L;
    index += 1;
  }

  // Generate buffer and trigger download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `agrinova-stock-transfers-${today}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
