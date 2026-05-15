import ExcelJS from "exceljs";

type OutstandingRow = {
  invoiceNumber: string;
  date: string;
  amount: number;
  balance: number;
};

type ExportParams = {
  customerName: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  rows: OutstandingRow[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function exportCustomerOutstandingToExcel(params: ExportParams): Promise<void> {
  const { customerName, periodLabel, periodStart, periodEnd, rows } = params;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Outstanding");

  ws.columns = [
    { header: "Invoice Number", key: "invoiceNumber", width: 20 },
    { header: "Date", key: "date", width: 15 },
    { header: "Amount (LKR)", key: "amount", width: 18 },
    { header: "Balance (LKR)", key: "balance", width: 18 },
    { header: "Remark", key: "remark", width: 20 },
  ];

  ws.getCell("A1").value = "Outstanding Invoices";
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.mergeCells("A1:E1");

  ws.getCell("A2").value = "Customer";
  ws.getCell("B2").value = customerName;
  ws.getCell("A3").value = "From";
  ws.getCell("B3").value = formatDate(periodStart);
  ws.getCell("A4").value = "To";
  ws.getCell("B4").value = formatDate(periodEnd);

  const headerRowIndex = 7;
  const headerRow = ws.getRow(headerRowIndex);
  headerRow.values = ["Invoice Number", "Date", "Amount (LKR)", "Balance (LKR)", "Remark"];
  headerRow.font = { bold: true, color: { argb: "FF334155" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };

  for (const row of rows) {
    ws.addRow({
      invoiceNumber: row.invoiceNumber,
      date: row.date,
      amount: row.amount,
      balance: row.balance,
      remark: "",
    });
  }

  const currencyFmt = '"LKR" #,##0.00';
  for (let r = headerRowIndex + 1; r <= ws.rowCount; r += 1) {
    ws.getCell(`C${r}`).numFmt = currencyFmt;
    ws.getCell(`D${r}`).numFmt = currencyFmt;
  }

  const thinBorder = {
    top: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
    left: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
    bottom: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
    right: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
  };

  for (let r = 2; r <= 4; r += 1) {
    for (let c = 1; c <= 2; c += 1) {
      ws.getCell(r, c).border = thinBorder;
    }
  }

  const tableEndRow = Math.max(ws.rowCount, headerRowIndex);
  for (let r = headerRowIndex; r <= tableEndRow; r += 1) {
    for (let c = 1; c <= 5; c += 1) {
      ws.getCell(r, c).border = thinBorder;
    }
  }

  ws.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: tableEndRow, column: 5 },
  };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `agrinova-outstanding-${customerName.replace(/\s+/g, "-").toLowerCase()}-${today}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
