import ExcelJS from "exceljs";

type SalesRepSalesExportRow = {
  itemCode: string;
  name: string;
  packSize: string;
  qty: number;
  freeQty: number;
  unitPrice: number;
  grossAmount: number;
  discount: number;
  netAmount: number;
};

type SalesRepSalesExportParams = {
  periodLabel: string;
  repLabel: string;
  locationLabel: string;
  customerLabel: string;
  productLabel: string;
  rows: SalesRepSalesExportRow[];
};

export async function exportSalesRepSalesToExcel(
  params: SalesRepSalesExportParams,
): Promise<void> {
  const {
    periodLabel,
    repLabel,
    locationLabel,
    customerLabel,
    productLabel,
    rows,
  } = params;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Product Sale Details");

  ws.columns = [
    { header: "Item Code", key: "itemCode", width: 18 },
    { header: "Name", key: "name", width: 34 },
    { header: "Pack Size", key: "packSize", width: 16 },
    { header: "Qty", key: "qty", width: 10 },
    { header: "Free Qty", key: "freeQty", width: 12 },
    { header: "Unit Price", key: "unitPrice", width: 15 },
    { header: "Gross Amount", key: "grossAmount", width: 18 },
    { header: "Discount", key: "discount", width: 14 },
    { header: "Net Amount", key: "netAmount", width: 16 },
  ];

  ws.getCell("A1").value = "Product Sale Details";
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.mergeCells("A1:I1");

  ws.getCell("A2").value = "Period";
  ws.getCell("B2").value = periodLabel;
  ws.getCell("A3").value = "Sales Rep";
  ws.getCell("B3").value = repLabel;
  ws.getCell("A4").value = "Location";
  ws.getCell("B4").value = locationLabel;
  ws.getCell("A5").value = "Customer";
  ws.getCell("B5").value = customerLabel;
  ws.getCell("A6").value = "Product";
  ws.getCell("B6").value = productLabel;

  const headerRowIndex = 8;
  const headerRow = ws.getRow(headerRowIndex);
  headerRow.values = [
    "Item Code",
    "Name",
    "Pack Size",
    "Qty",
    "Free Qty",
    "Unit Price",
    "Gross Amount",
    "Discount",
    "Net Amount",
  ];
  headerRow.font = { bold: true, color: { argb: "FF334155" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };

  for (const row of rows) {
    ws.addRow(row);
  }

  const dataStart = headerRowIndex + 1;
  const dataEnd = ws.rowCount;
  for (let r = dataStart; r <= dataEnd; r += 1) {
    ws.getCell(`F${r}`).numFmt = '"LKR" #,##0.00';
    ws.getCell(`G${r}`).numFmt = '"LKR" #,##0.00';
    ws.getCell(`H${r}`).numFmt = '"LKR" #,##0.00';
    ws.getCell(`I${r}`).numFmt = '"LKR" #,##0.00';
  }

  const thinBorder = {
    top: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
    left: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
    bottom: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
    right: { style: "thin" as const, color: { argb: "FFD6D3D1" } },
  };

  for (let r = 2; r <= 6; r += 1) {
    for (let c = 1; c <= 2; c += 1) {
      ws.getCell(r, c).border = thinBorder;
    }
  }

  const tableEndRow = Math.max(dataEnd, headerRowIndex);
  for (let r = headerRowIndex; r <= tableEndRow; r += 1) {
    for (let c = 1; c <= 9; c += 1) {
      ws.getCell(r, c).border = thinBorder;
    }
  }

  ws.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: tableEndRow, column: 9 },
  };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `agrinova-product-sale-details-${today}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
