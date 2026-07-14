import type { StockOverviewRow } from "@/types/inventory";

export type ApiResult<T> = {
  data?: T;
  error?: string;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedApiResult<T> = {
  data?: T;
  pagination?: PaginationMeta;
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
  /** line_total = qty × unitPrice, before any promotion */
  lineTotal: number;
  promotionType: "NONE" | "DISCOUNT" | "FREE_QTY";
  /** Percentage discount. Relevant only when promotionType === "DISCOUNT" */
  discount: number;
  /** Free units given. Relevant only when promotionType === "FREE_QTY" */
  freeQuantity: number;
  /** Amount the customer actually pays after promotion */
  netLineTotal: number;
};

export type CreateInvoiceRequestDto = {
  invoiceNo: string;
  invoiceDate: string;
  customerId: number;
  repId: number;
  locationId: number;
  notes?: string;
  vatPercentage?: number;
  lines: CreateInvoiceLineDto[];
};

export type CreateInvoiceSuccessResponse = {
  success: true;
  invoiceId: number;
};

export type CreateInvoiceResponse = ApiResult<CreateInvoiceSuccessResponse>;

export type InvoiceNumberAvailabilityDto = {
  invoiceNo: string;
  isUnique: boolean;
};

export type InvoiceNumberAvailabilityResponse =
  ApiResult<InvoiceNumberAvailabilityDto>;

export type InvoiceLineDto = {
  lineId: number;
  productId: number;
  productName: string;
  packSize: string;
  quantity: number;
  issuedQuantity: number;
  returnedQuantity: number;
  balanceQuantity: number;
  unitPrice: number;
  promotionType: "NONE" | "DISCOUNT" | "FREE_QTY";
  discount: number;
  freeQuantity: number;
  lineTotal: number;
  netLineTotal: number;
  creditedAmount: number;
  balanceAmount: number;
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
  status: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
  ginStatus: "PENDING" | "ISSUED" | "PARTIAL";
  totalAmount: number;
  totalPaid: number;
  creditedAmount: number;
  outstandingAmount: number;
  totalReturnableQty: number;
  vatPercentage: number;
  lines: InvoiceLineDto[];
};

export type InvoiceDetailResponse = ApiResult<InvoiceDetailDto>;

export type ReceiptMethod = "CASH" | "CHEQUE" | "BANK_TRANSFER";

export type CreateReceiptRequestDto = {
  receiptNo: string;
  invoiceId: number;
  collectedBy: number;
  receiptDate: string;
  amountReceived: number;
  paymentMethod: ReceiptMethod;
  chequeNo?: string;
  chequeDate?: string;
  bankName?: string;
  notes?: string;
};

export type CreateReceiptSuccessResponse = {
  success: true;
  receiptId: number;
  receiptNo: string;
  commissionId: number | null;
  daysToPay: number | null;
  commissionRate: number | null;
  commissionAmount: number | null;
};

export type CreateReceiptResponse = ApiResult<CreateReceiptSuccessResponse>;

export type ReceiptNumberAvailabilityDto = {
  receiptNo: string;
  isUnique: boolean;
};

export type ReceiptNumberAvailabilityResponse =
  ApiResult<ReceiptNumberAvailabilityDto>;

export type ReceiptOptionDto = {
  id: number;
  receiptNo: string;
  receiptDate: string;
  invoiceId: number;
  invoiceNo: string;
  customerName: string;
  amountReceived: number;
  paymentMethod: ReceiptMethod;
  isReturned?: boolean;
  returnedAt?: string | null;
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
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  isReturned?: boolean;
  returnedAt?: string | null;
};

export type ReceiptsResponse = PaginatedApiResult<ReceiptOptionDto[]> & {
  stats?: {
    totalCollected: number;
    cashCount: number;
  };
};
export type ReceiptDetailResponse = ApiResult<ReceiptDetailDto>;

export type CreateReturnedChequeRequestDto = {
  receiptId: number;
  returnDate: string;
  reason: string;
  bankReference?: string;
  notes?: string;
};

export type ReturnedChequeOptionDto = {
  id: number;
  receiptId: number;
  receiptNo: string;
  invoiceId: number;
  invoiceNo: string;
  customerName: string;
  chequeNo: string | null;
  chequeDate: string | null;
  bankName: string | null;
  amount: number;
  returnDate: string;
  reason: string;
  createdBy: string;
};

export type ReturnedChequesResponse = PaginatedApiResult<ReturnedChequeOptionDto[]>;

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

export type CommissionConfigDto = {
  configId: number;
  sameDayRate: number;
  rangeMinDays: number;
  rangeMaxDays: number;
  rangeRate: number;
  overRangeRate: number;
};

export type CommissionConfigResponse = ApiResult<CommissionConfigDto>;

export type UpdateCommissionConfigRequestDto = {
  sameDayRate: number;
  rangeMinDays: number;
  rangeMaxDays: number;
  rangeRate: number;
  overRangeRate: number;
};

export type PendingCommissionReversalDetailDto = {
  allocationId: number;
  sourceReceiptId: number | null;
  sourceReceiptNo: string | null;
  allocatedAmount: number;
  appliedRate: number;
  reversalAmount: number;
};

export type PendingCommissionRowDto = {
  commissionId: number;
  settlementId: number;
  settlementType: "RECEIPT" | "CREDIT_NOTE";
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  receiptId: number | null;
  receiptNo: string | null;
  receiptDate: string | null;
  customerName: string;
  repId: number;
  repName: string;
  settlementDate: string;
  settlementAmount: number;
  daysToPay: number;
  appliedRate: number;
  computedCommissionAmount: number;
  conditionLabel: string;
  reversalDetails: PendingCommissionReversalDetailDto[];
};

export type PendingCommissionsResponse = ApiResult<{
  rows: PendingCommissionRowDto[];
}>;

export type ApprovePendingCommissionItemDto = {
  commissionId: number;
  rateOverride?: number;
};

export type ApprovePendingCommissionsRequestDto = {
  items: ApprovePendingCommissionItemDto[];
};

export type ApprovePendingCommissionsResponse = ApiResult<{
  approvedCount: number;
  commissionIds: number[];
}>;

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
  notes?: string;
};

export type CreateGoodsIssueNoteSuccessResponse = {
  success: true;
  ginId: number;
  ginNumber: string;
};

export type CreateGoodsIssueNoteResponse =
  ApiResult<CreateGoodsIssueNoteSuccessResponse>;

export type GinNumberAvailabilityDto = {
  ginNumber: string;
  isUnique: boolean;
};

export type GinNumberAvailabilityResponse =
  ApiResult<GinNumberAvailabilityDto>;

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
  locationName?: string;
  lineCount: number;
  lines?: {
    productId: number;
    quantity: number;
    productName?: string;
    productCode?: string;
    packSize?: string;
  }[];
};

export type GoodsIssueNoteLineDto = {
  productId: number;
  productName: string;
  packSize: string;
  quantity: number;
};

export type GoodsIssueNoteDetailDto = {
  id: number;
  ginNumber: string;
  date: string;
  invoiceId: number | null;
  invoiceNumber: string | null;
  customerId: number;
  customerName: string;
  locationId: number;
  locationCode: string;
  locationName: string;
  notes: string | null;
  lines: GoodsIssueNoteLineDto[];
};

export type GoodsIssueNotesResponse = PaginatedApiResult<GoodsIssueNoteOptionDto[]>;
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
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
  lines: GoodsReceivingNoteLineDto[];
};

export type GoodsReceivingNotesResponse = PaginatedApiResult<
  GoodsReceivingNoteOptionDto[]
>;
export type GoodsReceivingNoteDetailResponse = ApiResult<GoodsReceivingNoteDetailDto>;

export type StockTransferOptionDto = {
  id: number;
  transferNo: string;
  transferDate: string;
  fromLocationId: number;
  fromLocationCode: string;
  fromLocationName: string;
  toLocationId: number;
  toLocationCode: string;
  toLocationName: string;
  lineCount: number;
  totalQty: number;
  notes: string | null;
  createdByName: string;
};

export type StockTransfersResponse = PaginatedApiResult<StockTransferOptionDto[]>;

export type ProductRepackOptionDto = {
  id: number;
  repackNo: string;
  repackDate: string;
  locationId: number;
  locationCode: string;
  locationName: string;
  sourceProductId: number;
  sourceProductCode: string;
  sourceProductName: string;
  sourceQuantity: number;
  targetProductId: number;
  targetProductCode: string;
  targetProductName: string;
  targetQuantity: number;
  notes: string | null;
  createdByName: string;
};

export type ProductRepacksResponse = PaginatedApiResult<ProductRepackOptionDto[]>;
export type ProductRepackDetailResponse = ApiResult<ProductRepackOptionDto>;

export type InvoiceOptionDto = {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  customerId: number;
  customerName: string;
  repId: number;
  repName: string;
  totalAmount: number;
  paidAmount: number;
  creditedAmount: number;
  balanceAmount: number;
  totalReturnableQty: number;
  status: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
  ginStatus: "PENDING" | "ISSUED" | "PARTIAL";
  locationCode: string | null;
  vatPercentage: number;
};

export type CreateSalesReturnLineDto = {
  lineId: number;
  productId: number;
  quantityUsable: number;
  quantityUnusable: number;
  condition: string;
  reasonForReturn: string;
  lineTotal: number;
};

export type CreateSalesReturnRequestDto = {
  invoiceId: number;
  returnNumber: string;
  returnDate: string;
  notes?: string;
  lines: CreateSalesReturnLineDto[];
};

export type ReturnNumberAvailabilityDto = {
  returnNumber: string;
  isUnique: boolean;
};

export type ReturnNumberAvailabilityResponse =
  ApiResult<ReturnNumberAvailabilityDto>;

export type CreateSalesReturnSuccessResponse = {
  success: true;
  salesReturnId: number;
  salesReturnNumber: string;
  goodsReturnId: number;
  goodsReturnNumber: string;
  creditNoteId: number;
  creditAmount: number;
};

export type CreateSalesReturnResponse =
  ApiResult<CreateSalesReturnSuccessResponse>;

export type InvoicesResponse = PaginatedApiResult<InvoiceOptionDto[]> & {
  stats?: {
    totalValue: number;
    paidCount: number;
    partialCount: number;
  };
};

export type InvoiceAggregatedCustomerDto = {
  id: number;
  name: string;
  phone: string | null;
};

export type InvoiceAggregatedSalesRepDto = {
  id: number;
  name: string;
};

export type InvoiceAggregatedLocationDto = {
  id: number;
  code: string;
  name: string;
};

export type InvoiceAggregatedLineDto = {
  lineId: number;
  productId: number;
  productCode: string;
  productName: string;
  packSize: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  netLineTotal: number;
};

export type InvoiceAggregatedSalesReturnLineDto = {
  lineId: number;
  productId: number;
  productCode: string;
  productName: string;
  packSize: string;
  quantity: number;
  condition: string;
  reasonForReturn: string;
  lineTotal: number;
};

export type InvoiceAggregatedSalesReturnDto = {
  returnId: number;
  returnNumber: string;
  returnDate: string;
  totalAmount: number;
  notes: string | null;
  lines: InvoiceAggregatedSalesReturnLineDto[];
};

export type InvoiceAggregatedDetailsDto = {
  invoice: {
    id: number;
    number: string;
    date: string;
    totalAmount: number;
    status: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
    notes: string | null;
    customer: InvoiceAggregatedCustomerDto;
    salesRep: InvoiceAggregatedSalesRepDto;
    location: InvoiceAggregatedLocationDto;
  };
  lines: InvoiceAggregatedLineDto[];
  salesReturns: InvoiceAggregatedSalesReturnDto[];
};

export type InvoiceAggregatedDetailsResponse = ApiResult<InvoiceAggregatedDetailsDto>;

export type InvoiceAggregatedSummaryProductInitialDto = {
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  netLineTotal: number;
};

export type InvoiceAggregatedSummaryProductReturnedDto = {
  quantity: number;
  lineTotal: number;
  returnCount: number;
  returnNumbers: string[];
};

export type InvoiceAggregatedSummaryProductNetDto = {
  quantity: number;
  lineTotal: number;
};

export type InvoiceAggregatedSummaryProductDto = {
  productId: number;
  productCode: string;
  productName: string;
  packSize: string;
  initial: InvoiceAggregatedSummaryProductInitialDto;
  returned: InvoiceAggregatedSummaryProductReturnedDto;
  net: InvoiceAggregatedSummaryProductNetDto;
};

export type InvoiceAggregatedSummaryDto = {
  invoice: {
    id: number;
    number: string;
    date: string;
    status: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
  };
  summary: {
    totalProducts: number;
    totalInitialAmount: number;
    totalReturnedAmount: number;
    totalNetAmount: number;
  };
  products: InvoiceAggregatedSummaryProductDto[];
};

export type InvoiceAggregatedSummaryResponse = ApiResult<InvoiceAggregatedSummaryDto>;

export type InvoiceAggregatedFinalFormHeaderDto = {
  invoice: {
    id: number;
    number: string;
    date: string;
    status: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
    notes: string | null;
  };
  customer: {
    id: number;
    name: string;
    phone: string | null;
    address: string | null;
  };
  salesRep: {
    id: number;
    name: string;
    phone: string | null;
  };
  location: {
    id: number;
    code: string;
    name: string;
    address: string | null;
  };
};

export type InvoiceAggregatedFinalFormLineInitialDto = {
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  discount: number;
  netLineTotal: number;
};

export type InvoiceAggregatedFinalFormLineReturnedDto = {
  quantity: number;
  lineTotal: number;
  returnCount: number;
};

export type InvoiceAggregatedFinalFormLineNetDto = {
  quantity: number;
  lineTotal: number;
};

export type InvoiceAggregatedReturnDetailDto = {
  returnNumber: string;
  returnDate: string;
  quantity: number;
  lineTotal: number;
  reason: string;
};

export type InvoiceAggregatedFinalFormLineDto = {
  productId: number;
  productCode: string;
  productName: string;
  packSize: string;
  initial: InvoiceAggregatedFinalFormLineInitialDto;
  returned: InvoiceAggregatedFinalFormLineReturnedDto;
  net: InvoiceAggregatedFinalFormLineNetDto;
  returnDetails: InvoiceAggregatedReturnDetailDto[];
};

export type InvoiceAggregatedFinalFormReturnDto = {
  returnId: number;
  returnNumber: string;
  returnDate: string;
  totalAmount: number;
  notes: string | null;
  createdBy: string;
};

export type InvoiceAggregatedFinalFormSummaryDto = {
  initial: {
    subtotal: number;
    discount: number;
    netTotal: number;
  };
  returns: {
    totalAmount: number;
    totalProducts: number;
  };
  final: {
    netTotal: number;
    productsWithReturns: number;
    totalProducts: number;
  };
};

export type InvoiceAggregatedFinalFormDto = {
  header: InvoiceAggregatedFinalFormHeaderDto;
  lines: InvoiceAggregatedFinalFormLineDto[];
  returns: InvoiceAggregatedFinalFormReturnDto[];
  summary: InvoiceAggregatedFinalFormSummaryDto;
};

export type InvoiceAggregatedFinalFormResponse = ApiResult<InvoiceAggregatedFinalFormDto>;

export type InvoiceAggregatedReceiptDto = {
  receiptId: number;
  receiptDate: string;
  amount: number;
  paymentMethod: "CASH" | "CHEQUE" | "BANK_TRANSFER";
  chequeNo: string | null;
  chequeDate: string | null;
  bankName: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: string;
  settlementAmount: number;
};

export type InvoiceAggregatedReceiptsDetailsDto = {
  invoice: {
    id: number;
    number: string;
    date: string;
    totalAmount: number;
    status: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
  };
  receipts: InvoiceAggregatedReceiptDto[];
  receiptCount: number;
};

export type InvoiceAggregatedReceiptsDetailsResponse = ApiResult<InvoiceAggregatedReceiptsDetailsDto>;

export type InvoiceAggregatedReceiptsSummaryDto = {
  invoice: {
    id: number;
    number: string;
    date: string;
    totalAmount: number;
    status: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
  };
  summary: {
    totalPaid: number;
    totalReceived: number;
    outstanding: number;
    receiptCount: number;
    paymentBreakdown: {
      cash: number;
      cheque: number;
      bankTransfer: number;
    };
    firstReceiptDate: string | null;
    lastReceiptDate: string | null;
  };
};

export type InvoiceAggregatedReceiptsSummaryResponse = ApiResult<InvoiceAggregatedReceiptsSummaryDto>;

export type InvoiceAggregatedReceiptsFinalFormDto = {
  header: {
    invoice: {
      id: number;
      number: string;
      date: string;
      status: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
      notes: string | null;
    };
    customer: {
      id: number;
      name: string;
      phone: string | null;
      address: string | null;
    };
    salesRep: {
      id: number;
      name: string;
      phone: string | null;
    };
    location: {
      id: number;
      code: string;
      name: string;
      address: string | null;
    };
  };
  lines: {
    lineId: number;
    productId: number;
    productCode: string;
    productName: string;
    packSize: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    netLineTotal: number;
  }[];
  receipts: InvoiceAggregatedReceiptDto[];
  summary: {
    invoiceTotal: number;
    totalPaid: number;
    outstanding: number;
    paymentBreakdown: {
      cash: number;
      cheque: number;
      bankTransfer: number;
    };
    receiptCount: number;
  };
};

export type InvoiceAggregatedReceiptsFinalFormResponse = ApiResult<InvoiceAggregatedReceiptsFinalFormDto>;

export type InvoiceAggregatedCreditNoteSalesReturnLineDto = {
  lineId: number;
  productId: number;
  productCode: string;
  productName: string;
  packSize: string;
  quantity: number;
  condition: string;
  reasonForReturn: string;
  lineTotal: number;
};

export type InvoiceAggregatedCreditNoteSalesReturnDto = {
  returnId: number;
  returnNumber: string;
  returnDate: string;
  totalAmount: number;
  notes: string | null;
  customerId: number;
  customerName: string;
  lines: InvoiceAggregatedCreditNoteSalesReturnLineDto[];
};

export type InvoiceAggregatedCreditNoteDto = {
  creditNoteId: number;
  amount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  salesReturn: InvoiceAggregatedCreditNoteSalesReturnDto;
};

export type InvoiceAggregatedCreditNotesDetailsDto = {
  invoice: {
    id: number;
    number: string;
    date: string;
    totalAmount: number;
    status: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
  };
  creditNotes: InvoiceAggregatedCreditNoteDto[];
  creditNoteCount: number;
};

export type InvoiceAggregatedCreditNotesDetailsResponse = ApiResult<InvoiceAggregatedCreditNotesDetailsDto>;

export type InvoiceAggregatedCreditNotesRelatedReturnDto = {
  returnId: number;
  returnNumber: string;
  returnDate: string;
  creditAmount: number;
};

export type InvoiceAggregatedCreditNotesSummaryDto = {
  invoice: {
    id: number;
    number: string;
    date: string;
    totalAmount: number;
    status: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
  };
  summary: {
    totalCredits: number;
    creditNoteCount: number;
    relatedReturnCount: number;
  };
  relatedReturns: InvoiceAggregatedCreditNotesRelatedReturnDto[];
};

export type InvoiceAggregatedCreditNotesSummaryResponse = ApiResult<InvoiceAggregatedCreditNotesSummaryDto>;

export type InvoiceAggregatedCreditNotesFinalFormProductCreditDto = {
  productId: number;
  productCode: string;
  productName: string;
  packSize: string;
  creditedQuantity: number;
  creditedAmount: number;
};

export type InvoiceAggregatedCreditNotesFinalFormCreditNoteDto = {
  creditNoteId: number;
  amount: number;
  notes: string | null;
  createdAt: string;
  createdBy: string;
  returnNumber: string;
  returnDate: string;
  returnTotalAmount: number;
};

export type InvoiceAggregatedCreditNotesFinalFormDto = {
  header: {
    invoice: {
      id: number;
      number: string;
      date: string;
      status: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
      notes: string | null;
    };
    customer: {
      id: number;
      name: string;
      phone: string | null;
      address: string | null;
    };
    salesRep: {
      id: number;
      name: string;
      phone: string | null;
    };
    location: {
      id: number;
      code: string;
      name: string;
      address: string | null;
    };
  };
  lines: {
    lineId: number;
    productId: number;
    productCode: string;
    productName: string;
    packSize: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    netLineTotal: number;
  }[];
  creditNotes: InvoiceAggregatedCreditNotesFinalFormCreditNoteDto[];
  productCredits: InvoiceAggregatedCreditNotesFinalFormProductCreditDto[];
  summary: {
    invoiceTotal: number;
    totalCredits: number;
    netAfterCredits: number;
    creditNoteCount: number;
    productsWithCredits: number;
  };
};

export type InvoiceAggregatedCreditNotesFinalFormResponse = ApiResult<InvoiceAggregatedCreditNotesFinalFormDto>;

export type InvoiceAggregatedFinancialSummaryPaymentBreakdownDto = {
  cash: number;
  cheque: number;
  bankTransfer: number;
};

export type InvoiceAggregatedFinancialSummaryReceiptsDto = {
  summary: {
    totalPaid: number;
    receiptCount: number;
    firstReceiptDate: string | null;
    lastReceiptDate: string | null;
  };
  paymentBreakdown: InvoiceAggregatedFinancialSummaryPaymentBreakdownDto;
};

export type InvoiceAggregatedFinancialSummaryCreditsDto = {
  summary: {
    totalCredits: number;
    creditNoteCount: number;
    relatedReturnCount: number;
    firstCreditDate: string | null;
    lastCreditDate: string | null;
  };
};

export type InvoiceAggregatedFinancialSummaryFinalDto = {
  invoiceAmount: number;
  totalCredits: number;
  amountAfterCredits: number;
  totalPaid: number;
  netBalance: number;
  balanceStatus: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
};

export type InvoiceAggregatedFinancialSummaryDto = {
  invoice: {
    id: number;
    number: string;
    date: string;
    totalAmount: number;
    status: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE";
    customer: {
      id: number;
      name: string;
      phone: string | null;
      address: string | null;
    };
    salesRep: {
      id: number;
      name: string;
    };
    location: {
      id: number;
      code: string;
      name: string;
    };
  };
  receipts: InvoiceAggregatedFinancialSummaryReceiptsDto;
  credits: InvoiceAggregatedFinancialSummaryCreditsDto;
  final: InvoiceAggregatedFinancialSummaryFinalDto;
};

export type InvoiceAggregatedFinancialSummaryResponse = ApiResult<InvoiceAggregatedFinancialSummaryDto>;
