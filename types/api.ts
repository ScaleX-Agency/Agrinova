import type { StockOverviewRow } from "@/types/inventory";

export type ApiResult<T> = {
  data?: T;
  error?: string;
};

export type SalesRepOptionDto = {
  id: number;
  label: string;
};

export type CustomerOptionDto = {
  id: number;
  label: string;
};

export type InventoryLocationOptionDto = {
  id: number;
  code: string;
  label: string;
};

export type StockByLocationResponse = ApiResult<StockOverviewRow[]>;
export type SalesRepsResponse = ApiResult<SalesRepOptionDto[]>;
export type CustomersByRepResponse = ApiResult<CustomerOptionDto[]>;
export type InventoryLocationsResponse = ApiResult<InventoryLocationOptionDto[]>;

export type CreateInvoiceLineDto = {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
};

export type CreateInvoiceRequestDto = {
  invoiceNo: string;
  invoiceDate: string;
  customerId: number;
  repId: number;
  locationId: number;
  lines: CreateInvoiceLineDto[];
  createdBy: number;
};

export type CreateInvoiceSuccessResponse = {
  success: true;
  invoiceId: number;
};

export type CreateInvoiceResponse = ApiResult<CreateInvoiceSuccessResponse>;

export type InvoiceLineDto = {
  productId: number;
  productName: string;
  packSize: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoiceDetailDto = {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  customerId: number;
  customerName: string;
  repId: number;
  repName: string;
  totalAmount: number;
  totalPaid: number;
  outstandingAmount: number;
  lines: InvoiceLineDto[];
};

export type InvoiceDetailResponse = ApiResult<InvoiceDetailDto>;

export type ReceiptMethod = "CASH" | "CHEQUE" | "BANK_TRANSFER";

export type CreateReceiptRequestDto = {
  invoiceId: number;
  collectedBy: number;
  receiptDate: string;
  amountReceived: number;
  paymentMethod: ReceiptMethod;
  chequeNo?: string;
  chequeDate?: string;
  bankName?: string;
};

export type CreateReceiptSuccessResponse = {
  success: true;
  receiptId: number;
  receiptNo: string;
};

export type CreateReceiptResponse = ApiResult<CreateReceiptSuccessResponse>;

export type ReceiptOptionDto = {
  id: number;
  receiptNo: string;
  receiptDate: string;
  invoiceId: number;
  invoiceNo: string;
  customerName: string;
  amountReceived: number;
  paymentMethod: ReceiptMethod;
};

export type ReceiptDetailDto = {
  id: number;
  receiptNo: string;
  receiptDate: string;
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  salesRepName: string;
  amountReceived: number;
  paymentMethod: ReceiptMethod;
  collectedBy: string;
  chequeNo: string | null;
  chequeDate: string | null;
  bankName: string | null;
};

export type ReceiptsResponse = ApiResult<ReceiptOptionDto[]>;
export type ReceiptDetailResponse = ApiResult<ReceiptDetailDto>;

export type RepCommissionSummaryDto = {
  repId: number;
  repName: string;
  invoiceCount: number;
  totalSales: number;
  cashCollected: number;
  avgDays: number;
  commissionRate: number;
  commissionAmount: number;
};

export type CommissionSummaryDto = {
  month: string;
  startDate: string;
  endDate: string;
  rows: RepCommissionSummaryDto[];
  grandTotalCommission: number;
};

export type CommissionReceiptDetailDto = {
  receiptId: number;
  receiptNo: string;
  receiptDate: string;
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  invoiceAmount: number;
  cashCollected: number;
  daysToPay: number;
  commissionRate: number;
  commissionAmount: number;
};

export type CommissionRepDetailDto = {
  repId: number;
  repName: string;
  month: string;
  rows: CommissionReceiptDetailDto[];
  invoiceCount: number;
  totalSales: number;
  cashCollected: number;
  avgDays: number;
  commissionAmount: number;
};

export type CommissionSummaryResponse = ApiResult<CommissionSummaryDto>;
export type CommissionRepDetailResponse = ApiResult<CommissionRepDetailDto>;

export type GoodsIssueNoteLineInputDto = {
  productId: number;
  quantity: number;
};

export type CreateGoodsIssueNoteRequestDto = {
  ginNumber: string;
  ginDate: string;
  invoiceId: number;
  locationId: number;
  preparedBy: string;
  receivedBy: string;
  createdBy: number;
  lines: GoodsIssueNoteLineInputDto[];
};

export type CreateGoodsIssueNoteSuccessResponse = {
  success: true;
  ginId: number;
};

export type CreateGoodsIssueNoteResponse = ApiResult<CreateGoodsIssueNoteSuccessResponse>;

export type GoodsIssueNoteOptionDto = {
  id: number;
  ginNumber: string;
  date: string;
  invoiceId: number | null;
  invoiceNumber: string | null;
  customerId: number;
  customerName: string;
  locationId: number;
  locationCode: string;
  lineCount: number;
};

export type GoodsIssueNoteLineDto = {
  productId: number;
  productName: string;
  packSize: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type GoodsIssueNoteDetailDto = {
  id: number;
  ginNumber: string;
  date: string;
  invoiceId: number | null;
  invoiceNumber: string | null;
  customerId: number;
  customerName: string;
  repId: number;
  locationId: number;
  locationCode: string;
  locationName: string;
  preparedBy: string;
  receivedBy: string;
  lines: GoodsIssueNoteLineDto[];
};

export type GoodsIssueNotesResponse = ApiResult<GoodsIssueNoteOptionDto[]>;
export type GoodsIssueNoteDetailResponse = ApiResult<GoodsIssueNoteDetailDto>;

export type InvoiceOptionDto = {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  customerId: number;
  customerName: string;
  repId: number;
  repName: string;
  totalAmount: number;
  status: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
  locationCode: string | null;
};

export type InvoicesResponse = ApiResult<InvoiceOptionDto[]>;