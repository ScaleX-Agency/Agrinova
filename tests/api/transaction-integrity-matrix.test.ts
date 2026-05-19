import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  $transaction: vi.fn(),
  stockTransfer: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
};

const getCurrentUserMock = vi.fn();
const isAdminUserMock = vi.fn();
const createSettlementCommissionMock = vi.fn();
const rebuildInvoiceCreditNoteCommissionsMock = vi.fn();
const recalculateInvoiceFinancialsMock = vi.fn();
const revalidateTagMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: getCurrentUserMock,
  isAdminUser: isAdminUserMock,
}));

vi.mock("@/lib/commissionSettlement", () => ({
  createSettlementCommission: createSettlementCommissionMock,
  rebuildInvoiceCreditNoteCommissions: rebuildInvoiceCreditNoteCommissionsMock,
}));

vi.mock("@/lib/invoiceFinancials", () => ({
  recalculateInvoiceFinancials: recalculateInvoiceFinancialsMock,
}));

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
  unstable_cache: (fn: unknown) => fn,
}));

describe("transaction integrity matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({
      user_id: 99,
      role: { role_name: "admin" },
    });
    isAdminUserMock.mockReturnValue(true);
    createSettlementCommissionMock.mockResolvedValue({
      commissionId: 7001,
      daysToPay: 27,
      commissionRate: 0.02,
      commissionAmount: 108,
    });
    recalculateInvoiceFinancialsMock.mockResolvedValue({
      paidAmount: 0,
      creditedAmount: 0,
      balanceAmount: 0,
      paymentStatus: "PAID",
    });
  });

  it("invoice create writes invoice lines only after validating customer, location, duplicate number, and stock", async () => {
    const { POST } = await import("@/app/api/invoices/route");

    const tx = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({
          customer_id: 5,
          assigned_rep: { rep_id: 7 },
        }),
      },
      inventoryLocation: {
        findUnique: vi.fn().mockResolvedValue({ location_id: 1, status: "ACTIVE" }),
      },
      invoice: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ invoice_id: 55 }),
      },
      stock: {
        findUnique: vi.fn().mockResolvedValue({ stock_id: 901, quantity_on_hand: 20 }),
      },
      invoiceLine: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await POST(new Request("http://localhost/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        invoiceNo: "INV-202605-001",
        invoiceDate: "2026-05-19",
        customerId: 5,
        repId: 7,
        locationId: 1,
        lines: [
          {
            productId: 11,
            quantity: 10,
            unitPrice: 100,
            promotionType: "FREE_QTY",
            freeQuantity: 2,
          },
        ],
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.invoiceId).toBe(55);
    expect(tx.stock.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { product_id_location_id: { product_id: 11, location_id: 1 } },
    }));
    expect(tx.invoice.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        total_amount: 1000,
        balance_amount: 1000,
        payment_status: "UNPAID",
      }),
    }));
    expect(tx.invoiceLine.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [
        expect.objectContaining({
          product_id: 11,
          quantity: 10,
          free_quantity: 2,
          balance_qty: 12,
          net_line_total: 1000,
        }),
      ],
    }));
    expect(tx.stock.findUnique).toHaveBeenCalledTimes(1);
  });

  it("invoice delete blocks when any active dependent operational or financial record exists", async () => {
    const { DELETE } = await import("@/app/api/invoices/[invoiceId]/route");

    const tx = {
      invoice: {
        findUnique: vi.fn().mockResolvedValue({
          invoice_id: 55,
          invoice_number: "INV-202605-001",
          is_active: true,
          goods_issue_notes: [{ gin_id: 10 }],
          receipts: [],
          returnedCheques: [],
          salesReturnNotes: [],
          creditNotes: [],
          invoiceSettlements: [],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ invoiceId: "55" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("active goods issue notes");
    expect(tx.invoice.update).not.toHaveBeenCalled();
  });

  it("GIN create issues all invoice quantities, deducts stock, and marks invoice issued", async () => {
    const { POST } = await import("@/app/api/goods-issue-notes/route");

    const tx = {
      goodsIssueNote: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ gin_id: 31, gin_number: "GIN-001" }),
      },
      invoice: {
        findUnique: vi.fn().mockResolvedValue({
          invoice_id: 55,
          customer_id: 5,
          location_id: 1,
          is_active: true,
          gin_status: "PENDING",
          invoice_lines: [
            {
              line_id: 101,
              product_id: 11,
              quantity: 10,
              free_quantity: 2,
              issued_qty: 0,
              returned_qty: 0,
            },
          ],
          goods_issue_notes: [],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      inventoryLocation: {
        findUnique: vi.fn().mockResolvedValue({ location_id: 1, status: "ACTIVE" }),
      },
      stock: {
        findMany: vi.fn().mockResolvedValue([
          { stock_id: 901, product_id: 11, quantity_on_hand: 20 },
        ]),
        update: vi.fn().mockResolvedValue({}),
      },
      invoiceLine: {
        update: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await POST(new Request("http://localhost/api/goods-issue-notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ginNumber: "GIN-001",
        ginDate: "2026-05-19",
        invoiceId: 55,
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.success).toBe(true);
    expect(tx.invoiceLine.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { line_id: 101 },
      data: expect.objectContaining({ issued_qty: 12, balance_qty: 0 }),
    }));
    expect(tx.stock.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { stock_id: 901 },
      data: { quantity_on_hand: { decrement: 12 } },
    }));
    expect(tx.invoice.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { invoice_id: 55 },
      data: { gin_status: "ISSUED" },
    }));
  });

  it("GIN delete is blocked while active SRNs exist for the invoice", async () => {
    const { DELETE } = await import("@/app/api/goods-issue-notes/[ginId]/route");

    const tx = {
      goodsIssueNote: {
        findUnique: vi.fn().mockResolvedValue({
          gin_id: 31,
          gin_number: "GIN-001",
          is_active: true,
          location_id: 1,
          invoice_id: 55,
          lines: [{ product_id: 11, quantity: 12 }],
          invoice: {
            invoice_id: 55,
            invoice_lines: [],
            salesReturnNotes: [{ return_id: 41 }],
          },
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ ginId: "31" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("active sales returns");
    expect(tx.goodsIssueNote.update).not.toHaveBeenCalled();
  });

  it("GIN delete reverses issued quantities, restores stock, and resets invoice status when no active GIN remains", async () => {
    const { DELETE } = await import("@/app/api/goods-issue-notes/[ginId]/route");

    const tx = {
      goodsIssueNote: {
        findUnique: vi.fn().mockResolvedValue({
          gin_id: 31,
          gin_number: "GIN-001",
          is_active: true,
          location_id: 1,
          invoice_id: 55,
          lines: [{ product_id: 11, quantity: 12 }],
          invoice: {
            invoice_id: 55,
            invoice_lines: [
              {
                line_id: 101,
                product_id: 11,
                quantity: 10,
                free_quantity: 2,
                issued_qty: 12,
                returned_qty: 0,
              },
            ],
            salesReturnNotes: [],
          },
        }),
        update: vi.fn().mockResolvedValue({}),
        count: vi.fn(),
      },
      stock: {
        findMany: vi.fn().mockResolvedValue([{ stock_id: 901, product_id: 11 }]),
        update: vi.fn().mockResolvedValue({}),
      },
      invoiceLine: {
        update: vi.fn().mockResolvedValue({}),
      },
      invoice: {
        update: vi.fn().mockResolvedValue({}),
      },
    };
    tx.goodsIssueNote.count.mockResolvedValue(0);
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ ginId: "31" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.success).toBe(true);
    expect(tx.invoiceLine.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { line_id: 101 },
      data: expect.objectContaining({ issued_qty: 0, balance_qty: 12 }),
    }));
    expect(tx.stock.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { stock_id: 901 },
      data: { quantity_on_hand: { increment: 12 } },
    }));
    expect(tx.goodsIssueNote.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { gin_id: 31 },
      data: expect.objectContaining({ is_active: false, deleted_by: 99 }),
    }));
    expect(tx.invoice.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { invoice_id: 55 },
      data: { gin_status: "PENDING" },
    }));
  });

  it("receipt create is capped by outstanding balance and does not create settlement when overpaid", async () => {
    const { POST } = await import("@/app/api/receipts/route");

    const tx = {
      invoice: {
        findUnique: vi.fn().mockResolvedValue({
          invoice_id: 55,
          is_active: true,
          invoice_date: new Date("2026-05-01"),
          total_amount: 5400,
          paid_amount: 4200,
          credited_amount: 0,
          balance_amount: 1200,
          payment_status: "PARTIAL",
          rep_id: 7,
        }),
      },
      receipt: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      invoiceSettlement: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await POST(new Request("http://localhost/api/receipts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        invoiceId: 55,
        receiptNo: "RCP-001",
        receiptDate: "2026-05-19",
        amountReceived: 1201,
        paymentMethod: "CASH",
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("Amount exceeds outstanding balance");
    expect(tx.receipt.create).not.toHaveBeenCalled();
    expect(tx.invoiceSettlement.create).not.toHaveBeenCalled();
    expect(createSettlementCommissionMock).not.toHaveBeenCalled();
  });

  it("SRN create returns usable stock, tracks unusable stock separately, credits invoice, and rebuilds commissions", async () => {
    const { POST } = await import("@/app/api/sales-return-notes/route");

    const tx = {
      goodsReturnNote: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ return_id: 71, return_number: "GRN-RET-202605-001" }),
      },
      invoice: {
        findUnique: vi.fn().mockResolvedValue({
          invoice_id: 55,
          is_active: true,
          invoice_date: new Date("2026-05-01"),
          customer_id: 5,
          location_id: 1,
          total_amount: 5400,
          paid_amount: 5400,
          credited_amount: 0,
          rep_id: 7,
          invoice_lines: [
            {
              line_id: 101,
              product_id: 11,
              quantity: 10,
              issued_qty: 10,
              returned_qty: 0,
              balance_amount: 5400,
            },
          ],
        }),
      },
      salesReturnNote: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ return_id: 41, return_number: "SRN-001" }),
      },
      invoiceLine: {
        update: vi.fn().mockResolvedValue({}),
      },
      stock: {
        findMany: vi.fn().mockResolvedValue([
          { stock_id: 901, product_id: 11, quantity_on_hand: 0 },
        ]),
        update: vi.fn().mockResolvedValue({ stock_id: 901, quantity_on_hand: 2 }),
        create: vi.fn().mockResolvedValue({}),
        upsert: vi.fn().mockResolvedValue({}),
      },
      creditNote: {
        create: vi.fn().mockResolvedValue({ credit_note_id: 81, amount: 1200 }),
      },
      invoiceSettlement: {
        create: vi.fn().mockResolvedValue({ settlement_id: 91 }),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await POST(new Request("http://localhost/api/sales-return-notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        invoiceId: 55,
        returnNumber: "SRN-001",
        returnDate: "2026-05-19",
        lines: [
          {
            lineId: 101,
            productId: 11,
            quantityUsable: 2,
            quantityUnusable: 1,
            condition: "DAMAGED",
            reasonForReturn: "Customer return",
            lineTotal: 1200,
          },
        ],
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.success).toBe(true);
    expect(tx.invoiceLine.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { line_id: 101 },
      data: expect.objectContaining({
        returned_qty: 3,
        balance_qty: 7,
        credited_amount: { increment: 1200 },
        balance_amount: 4200,
      }),
    }));
    expect(tx.stock.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { stock_id: 901 },
      data: { quantity_on_hand: { increment: 2 } },
    }));
    expect(tx.stock.upsert).not.toHaveBeenCalled();
    expect(tx.creditNote.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 1200 }),
    }));
    expect(tx.invoiceSettlement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ settlement_type: "CREDIT_NOTE" }),
    }));
    expect(recalculateInvoiceFinancialsMock).toHaveBeenCalledWith(tx, 55);
    expect(rebuildInvoiceCreditNoteCommissionsMock).toHaveBeenCalledWith(tx, 55, 7);
  });

  it("SRN create rejects a line that does not belong to the selected invoice", async () => {
    const { POST } = await import("@/app/api/sales-return-notes/route");

    const tx = {
      invoice: {
        findUnique: vi.fn().mockResolvedValue({
          invoice_id: 55,
          is_active: true,
          customer_id: 5,
          location_id: 1,
          rep_id: 7,
          invoice_lines: [
            {
              line_id: 101,
              product_id: 11,
              issued_qty: 10,
              returned_qty: 0,
              balance_amount: 5400,
            },
          ],
        }),
      },
      salesReturnNote: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await POST(new Request("http://localhost/api/sales-return-notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        invoiceId: 55,
        returnNumber: "SRN-BAD-LINE",
        returnDate: "2026-05-19",
        lines: [
          {
            lineId: 999,
            productId: 11,
            quantityUsable: 1,
            quantityUnusable: 0,
            condition: "GOOD",
            reasonForReturn: "Wrong item",
            lineTotal: 100,
          },
        ],
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("line does not belong");
    expect(tx.salesReturnNote.create).not.toHaveBeenCalled();
  });

  it("SRN create rejects return quantity above issued unreturned quantity", async () => {
    const { POST } = await import("@/app/api/sales-return-notes/route");

    const tx = {
      invoice: {
        findUnique: vi.fn().mockResolvedValue({
          invoice_id: 55,
          is_active: true,
          customer_id: 5,
          location_id: 1,
          rep_id: 7,
          invoice_lines: [
            {
              line_id: 101,
              product_id: 11,
              issued_qty: 10,
              returned_qty: 8,
              balance_amount: 5400,
            },
          ],
        }),
      },
      salesReturnNote: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await POST(new Request("http://localhost/api/sales-return-notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        invoiceId: 55,
        returnNumber: "SRN-QTY",
        returnDate: "2026-05-19",
        lines: [
          {
            lineId: 101,
            productId: 11,
            quantityUsable: 3,
            quantityUnusable: 0,
            condition: "GOOD",
            reasonForReturn: "Excess",
            lineTotal: 100,
          },
        ],
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("return qty exceeds max returnable (2)");
    expect(tx.salesReturnNote.create).not.toHaveBeenCalled();
  });

  it("SRN create rejects credit deduction above remaining invoice line balance", async () => {
    const { POST } = await import("@/app/api/sales-return-notes/route");

    const tx = {
      invoice: {
        findUnique: vi.fn().mockResolvedValue({
          invoice_id: 55,
          is_active: true,
          customer_id: 5,
          location_id: 1,
          rep_id: 7,
          invoice_lines: [
            {
              line_id: 101,
              product_id: 11,
              issued_qty: 10,
              returned_qty: 0,
              balance_amount: 500,
            },
          ],
        }),
      },
      salesReturnNote: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await POST(new Request("http://localhost/api/sales-return-notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        invoiceId: 55,
        returnNumber: "SRN-BAL",
        returnDate: "2026-05-19",
        lines: [
          {
            lineId: 101,
            productId: 11,
            quantityUsable: 1,
            quantityUnusable: 0,
            condition: "GOOD",
            reasonForReturn: "Credit too high",
            lineTotal: 501,
          },
        ],
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("deduction exceeds line balance");
    expect(tx.salesReturnNote.create).not.toHaveBeenCalled();
  });

  it("SRN create rejects duplicate active return number before creating linked records", async () => {
    const { POST } = await import("@/app/api/sales-return-notes/route");

    const tx = {
      invoice: {
        findUnique: vi.fn().mockResolvedValue({
          invoice_id: 55,
          is_active: true,
          customer_id: 5,
          location_id: 1,
          rep_id: 7,
          invoice_lines: [
            {
              line_id: 101,
              product_id: 11,
              issued_qty: 10,
              returned_qty: 0,
              balance_amount: 5400,
            },
          ],
        }),
      },
      salesReturnNote: {
        findFirst: vi.fn().mockResolvedValue({ return_id: 41 }),
        create: vi.fn().mockResolvedValue({}),
      },
      goodsReturnNote: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await POST(new Request("http://localhost/api/sales-return-notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        invoiceId: 55,
        returnNumber: "SRN-DUP",
        returnDate: "2026-05-19",
        lines: [
          {
            lineId: 101,
            productId: 11,
            quantityUsable: 1,
            quantityUnusable: 0,
            condition: "GOOD",
            reasonForReturn: "Duplicate",
            lineTotal: 100,
          },
        ],
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("already exists");
    expect(tx.salesReturnNote.create).not.toHaveBeenCalled();
    expect(tx.goodsReturnNote.create).not.toHaveBeenCalled();
  });

  it("SRN create with only unusable quantity creates zero-quantity stock placeholder when missing", async () => {
    const { POST } = await import("@/app/api/sales-return-notes/route");

    const tx = {
      goodsReturnNote: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ return_id: 71, return_number: "GRN-RET-202605-001" }),
      },
      invoice: {
        findUnique: vi.fn().mockResolvedValue({
          invoice_id: 55,
          is_active: true,
          customer_id: 5,
          location_id: 1,
          rep_id: 7,
          invoice_lines: [
            {
              line_id: 101,
              product_id: 11,
              issued_qty: 10,
              returned_qty: 0,
              balance_amount: 5400,
            },
          ],
        }),
      },
      salesReturnNote: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ return_id: 41, return_number: "SRN-UNUSABLE" }),
      },
      invoiceLine: {
        update: vi.fn().mockResolvedValue({}),
      },
      stock: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
        upsert: vi.fn().mockResolvedValue({ stock_id: 901 }),
      },
      creditNote: {
        create: vi.fn().mockResolvedValue({ credit_note_id: 81, amount: 1000 }),
      },
      invoiceSettlement: {
        create: vi.fn().mockResolvedValue({ settlement_id: 91 }),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await POST(new Request("http://localhost/api/sales-return-notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        invoiceId: 55,
        returnNumber: "SRN-UNUSABLE",
        returnDate: "2026-05-19",
        lines: [
          {
            lineId: 101,
            productId: 11,
            quantityUsable: 0,
            quantityUnusable: 2,
            condition: "DAMAGED",
            reasonForReturn: "Unusable",
            lineTotal: 1000,
          },
        ],
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.success).toBe(true);
    expect(tx.stock.update).not.toHaveBeenCalled();
    expect(tx.stock.create).not.toHaveBeenCalled();
    expect(tx.stock.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { product_id_location_id: { product_id: 11, location_id: 1 } },
      create: expect.objectContaining({ product_id: 11, location_id: 1, quantity_on_hand: 0 }),
    }));
  });

  it("SRN delete blocks if reversing usable returned stock would make stock negative", async () => {
    const { DELETE } = await import("@/app/api/sales-return-notes/[returnId]/route");

    const tx = {
      salesReturnNote: {
        findUnique: vi.fn().mockResolvedValue({
          return_id: 41,
          return_number: "SRN-001",
          return_date: new Date("2026-05-19"),
          location_id: 1,
          invoice_id: 55,
          is_active: true,
          lines: [
            {
              product_id: 11,
              quantity_usable: 10,
              quantity_unusable: 0,
              line_total: 1200,
            },
          ],
          goodsReturnNotes: [
            {
              return_id: 71,
              location_id: 1,
              lines: [{ product_id: 11, quantity: 10 }],
            },
          ],
          creditNotes: [
            {
              credit_note_id: 81,
              amount: 1200,
              invoiceSettlements: [{ settlement_id: 91 }],
            },
          ],
          invoice: {
            invoice_id: 55,
            rep_id: 7,
            total_amount: 5400,
            paid_amount: 5400,
            credited_amount: 1200,
            invoice_lines: [
              {
                line_id: 101,
                product_id: 11,
                issued_qty: 10,
                returned_qty: 10,
                balance_qty: 0,
                credited_amount: 1200,
                balance_amount: 4200,
                net_line_total: 5400,
              },
            ],
          },
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      stock: {
        findMany: vi.fn().mockResolvedValue([
          { stock_id: 901, product_id: 11, quantity_on_hand: 5 },
        ]),
        update: vi.fn().mockResolvedValue({}),
        upsert: vi.fn().mockResolvedValue({}),
      },
      invoiceLine: {
        update: vi.fn().mockResolvedValue({}),
      },
      commission: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({}),
      },
      commissionReversalAllocation: {
        updateMany: vi.fn().mockResolvedValue({}),
      },
      invoiceSettlement: {
        update: vi.fn().mockResolvedValue({}),
      },
      creditNote: {
        update: vi.fn().mockResolvedValue({}),
      },
      goodsReturnNote: {
        updateMany: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ returnId: "41" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("stock would go negative");
    expect(tx.stock.update).not.toHaveBeenCalled();
    expect(tx.salesReturnNote.update).not.toHaveBeenCalled();
    expect(recalculateInvoiceFinancialsMock).not.toHaveBeenCalled();
  });

  it("SRN delete blocks when linked active goods return note is missing", async () => {
    const { DELETE } = await import("@/app/api/sales-return-notes/[returnId]/route");

    const tx = {
      salesReturnNote: {
        findUnique: vi.fn().mockResolvedValue({
          return_id: 41,
          return_number: "SRN-MISSING-GRN",
          location_id: 1,
          invoice_id: 55,
          is_active: true,
          lines: [],
          goodsReturnNotes: [],
          creditNotes: [{ credit_note_id: 81, amount: 100, invoiceSettlements: [] }],
          invoice: { invoice_id: 55, rep_id: 7, invoice_lines: [] },
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ returnId: "41" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("No active goods return note");
    expect(tx.salesReturnNote.update).not.toHaveBeenCalled();
  });

  it("SRN delete blocks when linked active credit note is missing", async () => {
    const { DELETE } = await import("@/app/api/sales-return-notes/[returnId]/route");

    const tx = {
      salesReturnNote: {
        findUnique: vi.fn().mockResolvedValue({
          return_id: 41,
          return_number: "SRN-MISSING-CN",
          location_id: 1,
          invoice_id: 55,
          is_active: true,
          lines: [],
          goodsReturnNotes: [{ return_id: 71, location_id: 1, lines: [] }],
          creditNotes: [],
          invoice: { invoice_id: 55, rep_id: 7, invoice_lines: [] },
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ returnId: "41" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("No active credit note");
    expect(tx.salesReturnNote.update).not.toHaveBeenCalled();
  });

  it("SRN delete blocks when invoice credited amount is already below credit note amount", async () => {
    const { DELETE } = await import("@/app/api/sales-return-notes/[returnId]/route");

    const tx = {
      salesReturnNote: {
        findUnique: vi.fn().mockResolvedValue({
          return_id: 41,
          return_number: "SRN-CREDIT-MISMATCH",
          location_id: 1,
          invoice_id: 55,
          is_active: true,
          lines: [
            {
              product_id: 11,
              quantity_usable: 0,
              quantity_unusable: 1,
              line_total: 1200,
            },
          ],
          goodsReturnNotes: [{ return_id: 71, location_id: 1, lines: [] }],
          creditNotes: [{ credit_note_id: 81, amount: 1200, invoiceSettlements: [] }],
          invoice: {
            invoice_id: 55,
            rep_id: 7,
            credited_amount: 500,
            invoice_lines: [
              {
                line_id: 101,
                product_id: 11,
                issued_qty: 10,
                returned_qty: 1,
                balance_qty: 9,
                credited_amount: 1200,
                balance_amount: 4200,
                net_line_total: 5400,
              },
            ],
          },
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      stock: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({}),
        upsert: vi.fn().mockResolvedValue({}),
      },
      invoiceLine: {
        update: vi.fn().mockResolvedValue({}),
      },
      commission: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({}),
      },
      commissionReversalAllocation: {
        updateMany: vi.fn().mockResolvedValue({}),
      },
      invoiceSettlement: {
        update: vi.fn().mockResolvedValue({}),
      },
      creditNote: {
        update: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ returnId: "41" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("credited amount mismatch");
    expect(recalculateInvoiceFinancialsMock).not.toHaveBeenCalled();
    expect(tx.salesReturnNote.update).not.toHaveBeenCalled();
  });

  it("SRN delete successfully reverses stock, invoice line, credit note, settlement, and commission side effects", async () => {
    const { DELETE } = await import("@/app/api/sales-return-notes/[returnId]/route");

    const tx = {
      salesReturnNote: {
        findUnique: vi.fn().mockResolvedValue({
          return_id: 41,
          return_number: "SRN-DELETE-OK",
          location_id: 1,
          invoice_id: 55,
          is_active: true,
          lines: [
            {
              product_id: 11,
              quantity_usable: 2,
              quantity_unusable: 1,
              line_total: 1200,
            },
          ],
          goodsReturnNotes: [
            {
              return_id: 71,
              location_id: 1,
              lines: [{ product_id: 11, quantity: 2 }],
            },
          ],
          creditNotes: [
            {
              credit_note_id: 81,
              amount: 1200,
              invoiceSettlements: [{ settlement_id: 91 }],
            },
          ],
          invoice: {
            invoice_id: 55,
            rep_id: 7,
            credited_amount: 1200,
            invoice_lines: [
              {
                line_id: 101,
                product_id: 11,
                issued_qty: 10,
                returned_qty: 3,
                balance_qty: 7,
                credited_amount: 1200,
                balance_amount: 4200,
                net_line_total: 5400,
              },
            ],
          },
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      stock: {
        findMany: vi.fn().mockResolvedValue([
          { stock_id: 901, product_id: 11, quantity_on_hand: 4 },
        ]),
        update: vi.fn().mockResolvedValue({}),
        upsert: vi.fn().mockResolvedValue({}),
      },
      invoiceLine: {
        update: vi.fn().mockResolvedValue({}),
      },
      commission: {
        findMany: vi.fn().mockResolvedValue([{ commission_id: 701 }]),
        updateMany: vi.fn().mockResolvedValue({}),
      },
      commissionReversalAllocation: {
        updateMany: vi.fn().mockResolvedValue({}),
      },
      invoiceSettlement: {
        update: vi.fn().mockResolvedValue({}),
      },
      creditNote: {
        update: vi.fn().mockResolvedValue({}),
      },
      goodsReturnNote: {
        updateMany: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ returnId: "41" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.success).toBe(true);
    expect(tx.stock.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { stock_id: 901 },
      data: { quantity_on_hand: { decrement: 2 } },
    }));
    expect(tx.invoiceLine.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { line_id: 101 },
      data: expect.objectContaining({
        returned_qty: 0,
        balance_qty: 10,
        credited_amount: 0,
        balance_amount: 5400,
      }),
    }));
    expect(tx.commissionReversalAllocation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { commission_id: 701, is_active: true },
      data: { is_active: false },
    }));
    expect(tx.commission.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { settlement_id: 91, is_active: true },
      data: { is_active: false, status: "CANCELLED" },
    }));
    expect(tx.invoiceSettlement.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { settlement_id: 91 },
      data: { is_active: false, commission_issued: false },
    }));
    expect(tx.creditNote.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { credit_note_id: 81 },
      data: expect.objectContaining({ is_active: false, deleted_by: 99 }),
    }));
    expect(recalculateInvoiceFinancialsMock).toHaveBeenCalledWith(tx, 55);
    expect(rebuildInvoiceCreditNoteCommissionsMock).toHaveBeenCalledWith(tx, 55, 7);
    expect(tx.goodsReturnNote.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { srn_id: 41, is_active: true },
      data: expect.objectContaining({ is_active: false, deleted_by: 99 }),
    }));
    expect(tx.salesReturnNote.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { return_id: 41 },
      data: expect.objectContaining({ is_active: false, deleted_by: 99 }),
    }));
  });

  it("stock entry creates a GRN and aggregates duplicate product quantities into stock updates", async () => {
    const { createStockEntry } = await import("@/lib/inventoryService");

    const tx = {
      inventoryLocation: {
        findUnique: vi.fn().mockResolvedValue({ location_id: 1 }),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([{ product_id: 11 }]),
      },
      goodsReceivingNote: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ grn_id: 61, grn_number: "GRN-202605-001" }),
      },
      stock: {
        findMany: vi.fn().mockResolvedValue([{ stock_id: 901, product_id: 11 }]),
        update: vi.fn().mockResolvedValue({ stock_id: 901, product_id: 11, quantity_on_hand: 17 }),
        create: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const result = await createStockEntry(
      {
        entry_type: "LOCAL_PURCHASE",
        date: "2026-05-19",
        location_id: 1,
        grn_number: "GRN-202605-001",
        reference_no: "PO-1",
        notes: "Stock entry",
        items: [
          { product_id: 11, quantity: 10, unit_price: 100 },
          { product_id: 11, quantity: 7, unit_price: 100 },
        ],
      },
      99,
    );

    expect(result.grn_id).toBe(61);
    expect(tx.goodsReceivingNote.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        grn_number: "GRN-202605-001",
        lines: {
          create: [
            expect.objectContaining({ product_id: 11, quantity: 10 }),
            expect.objectContaining({ product_id: 11, quantity: 7 }),
          ],
        },
      }),
    }));
    expect(tx.stock.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { stock_id: 901 },
      data: { quantity_on_hand: { increment: 17 } },
    }));
    expect(tx.stock.create).not.toHaveBeenCalled();
  });

  it("GRN delete blocks if reversing received quantity would make stock negative", async () => {
    const { DELETE } = await import("@/app/api/goods-receiving-notes/[grnId]/route");

    const tx = {
      goodsReceivingNote: {
        findUnique: vi.fn().mockResolvedValue({
          grn_id: 61,
          grn_number: "GRN-001",
          location_id: 1,
          is_active: true,
          lines: [{ product_id: 11, quantity: 10 }],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      stock: {
        findMany: vi.fn().mockResolvedValue([
          { stock_id: 901, product_id: 11, quantity_on_hand: 5 },
        ]),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ grnId: "61" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("stock would go negative");
    expect(tx.stock.update).not.toHaveBeenCalled();
    expect(tx.goodsReceivingNote.update).not.toHaveBeenCalled();
  });

  it("stock transfer create deducts source, upserts destination, and aggregates duplicate lines", async () => {
    const { createStockTransfer } = await import("@/lib/inventoryService");

    const tx = {
      inventoryLocation: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ location_id: 1, code: "IGRN1" })
          .mockResolvedValueOnce({ location_id: 2, code: "IGRN2" }),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([{ product_id: 11, product_code: "PRD-001" }]),
      },
      stock: {
        findMany: vi.fn().mockResolvedValue([
          { stock_id: 901, product_id: 11, quantity_on_hand: 25 },
        ]),
        update: vi.fn().mockResolvedValue({}),
        upsert: vi.fn().mockResolvedValue({}),
      },
      stockTransfer: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ transfer_id: 91, transfer_no: "TRF-202605-001" }),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const result = await createStockTransfer(
      {
        transfer_date: "2026-05-19",
        from_location_id: 1,
        to_location_id: 2,
        notes: "Transfer",
        items: [
          { product_id: 11, quantity: 10 },
          { product_id: 11, quantity: 5 },
        ],
      },
      99,
    );

    expect(result.transfer_id).toBe(91);
    expect(tx.stockTransfer.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        from_location_id: 1,
        to_location_id: 2,
        lines: {
          create: [expect.objectContaining({ product_id: 11, quantity: 15 })],
        },
      }),
    }));
    expect(tx.stock.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { stock_id: 901 },
      data: { quantity_on_hand: { decrement: 15 } },
    }));
    expect(tx.stock.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { product_id_location_id: { product_id: 11, location_id: 2 } },
      update: { quantity_on_hand: { increment: 15 } },
    }));
  });

  it("stock transfer delete blocks if destination stock no longer has transferred quantity", async () => {
    const { DELETE } = await import("@/app/api/stock-transfers/[transferId]/route");

    const tx = {
      stockTransfer: {
        findUnique: vi.fn().mockResolvedValue({
          transfer_id: 91,
          transfer_no: "TRF-001",
          transfer_date: new Date("2026-05-19"),
          from_location_id: 1,
          to_location_id: 2,
          is_active: true,
          from_location: { code: "IGRN1" },
          to_location: { code: "IGRN2" },
          lines: [{ product_id: 11, quantity: 10 }],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      stock: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ stock_id: 901, product_id: 11 }])
          .mockResolvedValueOnce([{ stock_id: 902, product_id: 11, quantity_on_hand: 5 }]),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ transferId: "91" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("destination stock is insufficient");
    expect(tx.stock.update).not.toHaveBeenCalled();
    expect(tx.stockTransfer.update).not.toHaveBeenCalled();
  });
});
