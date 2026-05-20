import ExcelJS from "exceljs";

type InvoiceExportRow = {
  customerName: string;
  invoiceNo: string;
  date: string;
  amount: number;
};

type ExportInvoiceParams = {
  fromLabel: string;
  toLabel: string;
  rows: InvoiceExportRow[];
};

export async function exportInvoicesToExcel(params: ExportInvoiceParams): Promise<void> {
  const { fromLabel, toLabel, rows } = params;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Invoices");

  ws.columns = [
    { header: "Invoice No", key: "invoiceNo", width: 20 },
    { header: "Customer Name", key: "customerName", width: 30 },
    { header: "Date", key: "date", width: 15 },
    { header: "Amount (LKR)", key: "amount", width: 18 },
  ];

  ws.getCell("A1").value = "Invoices";
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.mergeCells("A1:D1");

  ws.getCell("A2").value = "From";
  ws.getCell("B2").value = fromLabel;
  ws.getCell("A3").value = "To";
  ws.getCell("B3").value = toLabel;

  const headerRowIndex = 5;
  const headerRow = ws.getRow(headerRowIndex);
  headerRow.values = ["Invoice No", "Customer Name", "Date", "Amount (LKR)"];
  headerRow.font = { bold: true, color: { argb: "FF334155" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

  for (const row of rows) {
    ws.addRow(row);
  }

  for (let r = headerRowIndex + 1; r <= ws.rowCount; r += 1) {
    ws.getCell(`D${r}`).numFmt = '"LKR" #,##0.00';
  }

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

  const tableEndRow = Math.max(ws.rowCount, headerRowIndex);
  for (let r = headerRowIndex; r <= tableEndRow; r += 1) {
    for (let c = 1; c <= 4; c += 1) {
      ws.getCell(r, c).border = thinBorder;
    }
  }

  ws.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: tableEndRow, column: 4 },
  };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `agrinova-invoices-${today}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
