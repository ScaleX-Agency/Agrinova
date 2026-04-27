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
export type InventoryLocationsResponse = ApiResult<
  InventoryLocationOptionDto[]
>;

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
  locationId: number;
  ginStatus: "PENDING" | "ISSUED" | "PARTIAL";
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
  commissionId: number;
  daysToPay: number;
  commissionRate: number;
  commissionAmount: number;
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
  receiptCount: number;
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
  commissionId: number;
  receiptId: number | null;
  receiptNo: string | null;
  receiptDate: string | null;
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  salesStatus: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
  customerName: string;
  locationId: number | null;
  locationCode: string | null;
  categories: string[];
  invoiceAmount: number;
  cashCollected: number;
  daysToPay: number;
  commissionRate: number;
  commissionAmount: number;
  dueDate: string;
  paidDate: string | null;
  status: "PENDING" | "PAID" | "OVERDUE";
};

export type ReceiptCommissionDetailDto = {
  commissionId: number;
  receiptId: number | null;
  receiptNo: string | null;
  receiptDate: string | null;
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  salesRepName: string;
  invoiceAmount: number;
  daysToPay: number;
  commissionRate: number;
  commissionAmount: number;
  dueDate: string;
  paidDate: string | null;
  status: "PENDING" | "PAID" | "OVERDUE";
};

export type ReceiptCommissionResponse = ApiResult<ReceiptCommissionDetailDto>;

export type CommissionRepDetailDto = {
  repId: number;
  repName: string;
  month: string;
  rows: CommissionReceiptDetailDto[];
  receiptCount: number;
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

export type CreateGoodsIssueNoteResponse =
  ApiResult<CreateGoodsIssueNoteSuccessResponse>;

export type GoodsIssueNoteOptionDto = {
  id: number;
  ginNumber: string;
  date: string;
  ginStatus: "PENDING" | "ISSUED" | "PARTIAL";
  invoiceId: number | null;
  invoiceNumber: string | null;
  customerId: number;
  customerName: string;
  locationId: number;
  locationCode: string;
  lineCount: number;
  lines?: {
    productId: number;
    quantity: number;
  }[];
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

export type GoodsReceivingEntryType = "LOCAL_PURCHASE" | "FOREIGN_IMPORT";

export type GoodsReceivingNoteOptionDto = {
  id: number;
  grnNumber: string;
  date: string;
  entryType: GoodsReceivingEntryType;
  locationId: number;
  locationCode: string;
  locationName: string;
  referenceNo: string | null;
  notes: string | null;
  lineCount: number;
  createdByUserId: number;
  createdByName: string;
};

export type GoodsReceivingNoteLineDto = {
  lineId: number;
  productId: number;
  productCode: string;
  productName: string;
  packSize: string;
  quantity: number;
};

export type GoodsReceivingNoteDetailDto = {
  id: number;
  grnNumber: string;
  date: string;
  entryType: GoodsReceivingEntryType;
  locationId: number;
  locationCode: string;
  locationName: string;
  referenceNo: string | null;
  notes: string | null;
  createdByUserId: number;
  createdByName: string;
  createdByUsername: string;
  lines: GoodsReceivingNoteLineDto[];
};

export type GoodsReceivingNotesResponse = ApiResult<
  GoodsReceivingNoteOptionDto[]
>;
export type GoodsReceivingNoteDetailResponse = ApiResult<GoodsReceivingNoteDetailDto>;

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
  ginStatus: "PENDING" | "ISSUED" | "PARTIAL";
  locationCode: string | null;
};

export type InvoicesResponse = ApiResult<InvoiceOptionDto[]>;
