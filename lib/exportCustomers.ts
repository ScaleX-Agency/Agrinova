import ExcelJS from "exceljs";

type CustomerExportRow = {
  name: string;
  address: string;
  contactNo: string;
};

export async function exportCustomersToExcel(rows: CustomerExportRow[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Customer Details");

  ws.columns = [
    { header: "Name", key: "name", width: 30 },
    { header: "Address", key: "address", width: 40 },
    { header: "Contact No", key: "contactNo", width: 20 },
  ];

  ws.getCell("A1").value = "Customer Details";
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.mergeCells("A1:C1");

  const headerRowIndex = 3;
  const headerRow = ws.getRow(headerRowIndex);
  headerRow.values = ["Name", "Address", "Contact No"];
  headerRow.font = { bold: true, color: { argb: "FF334155" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

  for (const row of rows) {
    ws.addRow(row);
  }

  const thinBorder = {
    top: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
    left: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
    bottom: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
    right: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
  };

  const tableEndRow = Math.max(ws.rowCount, headerRowIndex);
  for (let r = headerRowIndex; r <= tableEndRow; r += 1) {
    for (let c = 1; c <= 3; c += 1) {
      ws.getCell(r, c).border = thinBorder;
    }
  }

  ws.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: tableEndRow, column: 3 },
  };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `agrinova-customer-details-${today}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
