import ExcelJS from "exceljs";

type CommissionExportSettlementRow = {
  receiptDate: string;
  receiptNumber: string;
  paymentMethod: string;
  amount: number;
  dayGap: number;
  commissionRate: number;
  commissionAmount: number;
};

type CommissionExportInvoiceGroup = {
  invoiceNo: string;
  customerName: string;
  invoiceDate: string;
  totalCommission: number;
  settlements: CommissionExportSettlementRow[];
};

type ExportRepCommissionParams = {
  repName: string;
  fromLabel: string;
  toLabel: string;
  groups: CommissionExportInvoiceGroup[];
};

export async function exportRepCommissionToExcel(
  params: ExportRepCommissionParams,
): Promise<void> {
  const { repName, fromLabel, toLabel, groups } = params;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Commission");

  ws.columns = [
    { header: "Invoice No", key: "invoiceNo", width: 18 },
    { header: "Customer", key: "customerName", width: 28 },
    { header: "Invoice Date", key: "invoiceDate", width: 15 },
    { header: "Receipt Date", key: "receiptDate", width: 15 },
    { header: "Receipt Number", key: "receiptNumber", width: 18 },
    { header: "Payment Method", key: "paymentMethod", width: 16 },
    { header: "Amount (LKR)", key: "amount", width: 16 },
    { header: "Day Gap", key: "dayGap", width: 12 },
    { header: "Commission Rate", key: "commissionRate", width: 16 },
    { header: "Commission Amount (LKR)", key: "commissionAmount", width: 22 },
    { header: "Total Commission (LKR)", key: "totalCommission", width: 21 },
  ];

  ws.getCell("A1").value = "Rep Commission";
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.mergeCells("A1:K1");

  ws.getCell("A2").value = "Sales Rep";
  ws.getCell("B2").value = repName;
  ws.getCell("A3").value = "From";
  ws.getCell("B3").value = fromLabel;
  ws.getCell("A4").value = "To";
  ws.getCell("B4").value = toLabel;

  const headerRowIndex = 6;
  const headerRow = ws.getRow(headerRowIndex);
  headerRow.values = [
    "Invoice No",
    "Customer",
    "Invoice Date",
    "Receipt Date",
    "Receipt Number",
    "Payment Method",
    "Amount (LKR)",
    "Day Gap",
    "Commission Rate",
    "Commission Amount (LKR)",
    "Total Commission (LKR)",
  ];
  headerRow.font = { bold: true, color: { argb: "FF334155" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };

  for (const group of groups) {
    const groupStartRow = ws.rowCount + 1;
    for (const settlement of group.settlements) {
      ws.addRow({
        invoiceNo: group.invoiceNo,
        customerName: group.customerName,
        invoiceDate: group.invoiceDate,
        receiptDate: settlement.receiptDate,
        receiptNumber: settlement.receiptNumber,
        paymentMethod: settlement.paymentMethod,
        amount: settlement.amount,
        dayGap: settlement.dayGap,
        commissionRate: settlement.commissionRate,
        commissionAmount: settlement.commissionAmount,
        totalCommission: group.totalCommission,
      });
    }
    const groupEndRow = ws.rowCount;
    if (groupEndRow > groupStartRow) {
      ws.mergeCells(`A${groupStartRow}:A${groupEndRow}`);
      ws.mergeCells(`B${groupStartRow}:B${groupEndRow}`);
      ws.mergeCells(`C${groupStartRow}:C${groupEndRow}`);
      ws.mergeCells(`K${groupStartRow}:K${groupEndRow}`);

      for (const col of ["A", "B", "C"] as const) {
        const cell = ws.getCell(`${col}${groupStartRow}`);
        cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
      }
      ws.getCell(`K${groupStartRow}`).alignment = {
        vertical: "top",
        horizontal: "right",
      };
    }
  }

  for (let r = headerRowIndex + 1; r <= ws.rowCount; r += 1) {
    ws.getCell(`G${r}`).numFmt = '"LKR" #,##0.00';
    ws.getCell(`J${r}`).numFmt = '"LKR" #,##0.00';
    ws.getCell(`K${r}`).numFmt = '"LKR" #,##0.00';
    ws.getCell(`I${r}`).numFmt = "0.00%";
    ws.getCell(`G${r}`).alignment = { horizontal: "right" };
    ws.getCell(`H${r}`).alignment = { horizontal: "right" };
    ws.getCell(`I${r}`).alignment = { horizontal: "right" };
    ws.getCell(`J${r}`).alignment = { horizontal: "right" };
    ws.getCell(`K${r}`).alignment = { horizontal: "right" };
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
    for (let c = 1; c <= 11; c += 1) {
      ws.getCell(r, c).border = thinBorder;
    }
  }

  ws.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: tableEndRow, column: 11 },
  };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `agrinova-rep-commission-${repName.replace(/\s+/g, "-").toLowerCase()}-${today}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
