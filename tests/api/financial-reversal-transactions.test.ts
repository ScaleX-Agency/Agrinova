import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  $transaction: vi.fn(),
};

const getCurrentUserMock = vi.fn();
const isAdminMock = vi.fn();
const isAdminOrOperatorMock = vi.fn();
const rebuildInvoiceCreditNoteCommissionsMock = vi.fn();
const recalculateInvoiceFinancialsMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: getCurrentUserMock,
  isAdminUser: isAdminMock,
  isAdminOrOperatorUser: isAdminOrOperatorMock,
}));

vi.mock("@/lib/commissionSettlement", () => ({
  rebuildInvoiceCreditNoteCommissions: rebuildInvoiceCreditNoteCommissionsMock,
}));

vi.mock("@/lib/invoiceFinancials", () => ({
  recalculateInvoiceFinancials: recalculateInvoiceFinancialsMock,
}));

describe("financial reversal transaction flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({
      user_id: 99,
      role: { role_name: "admin" },
    });
    isAdminMock.mockReturnValue(true);
    isAdminOrOperatorMock.mockReturnValue(true);
    recalculateInvoiceFinancialsMock.mockResolvedValue({
      paidAmount: 0,
      creditedAmount: 0,
      balanceAmount: 0,
      paymentStatus: "PAID",
    });
  });

  it("creates a returned cheque and posts reversal side effects", async () => {
    const { POST } = await import("@/app/api/returned-cheques/route");

    const tx = {
      receipt: {
        findUnique: vi.fn().mockResolvedValue({
          receipt_id: 12,
          receipt_number: "RCP-202605-001",
          invoice_id: 55,
          is_active: true,
          is_returned: false,
          amount: 1000,
          payment_method: "CHEQUE",
          invoice: {
            invoice_id: 55,
            is_active: true,
            rep_id: 7,
          },
          invoiceSettlements: [
            {
              settlement_id: 101,
              commissions: [{ commission_amount: 20 }],
            },
          ],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      returnedCheque: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          returned_cheque_id: 5001,
          amount: 1000,
        }),
      },
      invoiceSettlement: {
        create: vi.fn().mockResolvedValue({ settlement_id: 2001 }),
        update: vi.fn().mockResolvedValue({}),
      },
      commission: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const request = new Request("http://localhost/api/returned-cheques", {
      method: "POST",
      body: JSON.stringify({
        receiptId: 12,
        returnDate: "2026-05-19",
        reason: "Bounced cheque",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.success).toBe(true);
    expect(tx.receipt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { receipt_id: 12 },
        data: expect.objectContaining({ is_returned: true }),
      }),
    );
    expect(tx.invoiceSettlement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          settlement_type: "CHEQUE_RETURN",
          returned_cheque_id: 5001,
        }),
      }),
    );
    expect(tx.commission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          commission_amount: -20,
          settlement_id: 2001,
        }),
      }),
    );
    expect(recalculateInvoiceFinancialsMock).toHaveBeenCalledWith(tx, 55);
    expect(rebuildInvoiceCreditNoteCommissionsMock).toHaveBeenCalledWith(tx, 55, 7);
  });

  it("creates returned cheque without negative commission row when source commission is zero", async () => {
    const { POST } = await import("@/app/api/returned-cheques/route");

    const tx = {
      receipt: {
        findUnique: vi.fn().mockResolvedValue({
          receipt_id: 13,
          receipt_number: "RCP-202605-002",
          invoice_id: 56,
          is_active: true,
          is_returned: false,
          amount: 1000,
          payment_method: "CHEQUE",
          invoice: {
            invoice_id: 56,
            is_active: true,
            rep_id: 8,
          },
          invoiceSettlements: [
            {
              settlement_id: 102,
              commissions: [{ commission_amount: 0 }],
            },
          ],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      returnedCheque: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          returned_cheque_id: 5002,
          amount: 1000,
        }),
      },
      invoiceSettlement: {
        create: vi.fn().mockResolvedValue({ settlement_id: 2002 }),
        update: vi.fn().mockResolvedValue({}),
      },
      commission: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await POST(new Request("http://localhost/api/returned-cheques", {
      method: "POST",
      body: JSON.stringify({
        receiptId: 13,
        returnDate: "2026-05-19",
        reason: "Bank return",
      }),
      headers: { "content-type": "application/json" },
    }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.success).toBe(true);
    expect(tx.commission.create).not.toHaveBeenCalled();
    expect(tx.invoiceSettlement.update).toHaveBeenCalled();
  });

  it("rejects returned cheque create for non-cheque payment", async () => {
    const { POST } = await import("@/app/api/returned-cheques/route");

    const tx = {
      receipt: {
        findUnique: vi.fn().mockResolvedValue({
          receipt_id: 14,
          receipt_number: "RCP-202605-003",
          invoice_id: 57,
          is_active: true,
          is_returned: false,
          amount: 1000,
          payment_method: "CASH",
          invoice: { invoice_id: 57, is_active: true, rep_id: 8 },
          invoiceSettlements: [],
        }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await POST(new Request("http://localhost/api/returned-cheques", {
      method: "POST",
      body: JSON.stringify({
        receiptId: 14,
        returnDate: "2026-05-19",
        reason: "Invalid method check",
      }),
      headers: { "content-type": "application/json" },
    }));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("Only cheque receipts");
  });

  it("rejects returned cheque create when receipt already marked returned", async () => {
    const { POST } = await import("@/app/api/returned-cheques/route");

    const tx = {
      receipt: {
        findUnique: vi.fn().mockResolvedValue({
          receipt_id: 15,
          receipt_number: "RCP-202605-004",
          invoice_id: 58,
          is_active: true,
          is_returned: true,
          amount: 1000,
          payment_method: "CHEQUE",
          invoice: { invoice_id: 58, is_active: true, rep_id: 8 },
          invoiceSettlements: [],
        }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await POST(new Request("http://localhost/api/returned-cheques", {
      method: "POST",
      body: JSON.stringify({
        receiptId: 15,
        returnDate: "2026-05-19",
        reason: "Duplicate return",
      }),
      headers: { "content-type": "application/json" },
    }));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("already marked as returned");
  });

  it("rejects returned cheque create when an active returned-cheque record already exists", async () => {
    const { POST } = await import("@/app/api/returned-cheques/route");

    const tx = {
      receipt: {
        findUnique: vi.fn().mockResolvedValue({
          receipt_id: 16,
          receipt_number: "RCP-202605-005",
          invoice_id: 59,
          is_active: true,
          is_returned: false,
          amount: 1000,
          payment_method: "CHEQUE",
          invoice: { invoice_id: 59, is_active: true, rep_id: 8 },
          invoiceSettlements: [],
        }),
      },
      returnedCheque: {
        findFirst: vi.fn().mockResolvedValue({ returned_cheque_id: 6001 }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await POST(new Request("http://localhost/api/returned-cheques", {
      method: "POST",
      body: JSON.stringify({
        receiptId: 16,
        returnDate: "2026-05-19",
        reason: "Duplicate return row",
      }),
      headers: { "content-type": "application/json" },
    }));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("already exists");
  });

  it("reverts a returned cheque and restores receipt eligibility", async () => {
    const { DELETE } = await import("@/app/api/returned-cheques/[returnedChequeId]/route");

    const tx = {
      returnedCheque: {
        findUnique: vi.fn().mockResolvedValue({
          returned_cheque_id: 5001,
          is_active: true,
          receipt_id: 12,
          invoice_id: 55,
          amount: 1000,
          invoice: { rep_id: 7, total_amount: 5000 },
          invoiceSettlements: [
            { settlement_id: 2001, commissions: [{ commission_id: 9001 }] },
          ],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      commissionReversalAllocation: {
        updateMany: vi.fn().mockResolvedValue({}),
      },
      commission: {
        updateMany: vi.fn().mockResolvedValue({}),
      },
      invoiceSettlement: {
        update: vi.fn().mockResolvedValue({}),
      },
      receipt: {
        findMany: vi.fn().mockResolvedValue([{ amount: 1200 }, { amount: 1400 }]),
        update: vi.fn().mockResolvedValue({}),
      },
      creditNote: {
        findMany: vi.fn().mockResolvedValue([{ amount: 500 }]),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ returnedChequeId: "5001" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.success).toBe(true);
    expect(tx.receipt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { receipt_id: 12 },
        data: expect.objectContaining({ is_returned: false, returned_at: null }),
      }),
    );
    expect(recalculateInvoiceFinancialsMock).toHaveBeenCalledWith(tx, 55);
    expect(rebuildInvoiceCreditNoteCommissionsMock).toHaveBeenCalledWith(tx, 55, 7);
  });

  it("blocks revert when restoring cheque would over-settle invoice", async () => {
    const { DELETE } = await import("@/app/api/returned-cheques/[returnedChequeId]/route");

    const tx = {
      returnedCheque: {
        findUnique: vi.fn().mockResolvedValue({
          returned_cheque_id: 5001,
          is_active: true,
          receipt_id: 12,
          invoice_id: 55,
          amount: 5400,
          invoice: { rep_id: 7, total_amount: 5400 },
          invoiceSettlements: [
            { settlement_id: 2001, commissions: [{ commission_id: 9001 }] },
          ],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      receipt: {
        findMany: vi.fn().mockResolvedValue([{ amount: 4200 }, { amount: 1200 }]),
        update: vi.fn().mockResolvedValue({}),
      },
      creditNote: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      commissionReversalAllocation: {
        updateMany: vi.fn().mockResolvedValue({}),
      },
      commission: {
        updateMany: vi.fn().mockResolvedValue({}),
      },
      invoiceSettlement: {
        update: vi.fn().mockResolvedValue({}),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ returnedChequeId: "5001" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("replacement payments or credits already settle this invoice");
    expect(tx.receipt.update).not.toHaveBeenCalled();
    expect(tx.returnedCheque.update).not.toHaveBeenCalled();
    expect(tx.invoiceSettlement.update).not.toHaveBeenCalled();
    expect(recalculateInvoiceFinancialsMock).not.toHaveBeenCalled();
    expect(rebuildInvoiceCreditNoteCommissionsMock).not.toHaveBeenCalled();
  });

  it("blocks revert when receipts plus credits already settle invoice", async () => {
    const { DELETE } = await import("@/app/api/returned-cheques/[returnedChequeId]/route");

    const tx = {
      returnedCheque: {
        findUnique: vi.fn().mockResolvedValue({
          returned_cheque_id: 5002,
          is_active: true,
          receipt_id: 21,
          invoice_id: 60,
          amount: 5400,
          invoice: { rep_id: 7, total_amount: 5400 },
          invoiceSettlements: [],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      receipt: {
        findMany: vi.fn().mockResolvedValue([{ amount: 4200 }]),
        update: vi.fn().mockResolvedValue({}),
      },
      creditNote: {
        findMany: vi.fn().mockResolvedValue([{ amount: 1200 }]),
      },
      commissionReversalAllocation: {
        updateMany: vi.fn().mockResolvedValue({}),
      },
      commission: {
        updateMany: vi.fn().mockResolvedValue({}),
      },
      invoiceSettlement: {
        update: vi.fn().mockResolvedValue({}),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ returnedChequeId: "5002" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("replacement payments or credits already settle this invoice");
    expect(tx.receipt.update).not.toHaveBeenCalled();
    expect(tx.returnedCheque.update).not.toHaveBeenCalled();
  });

  it("deletes a receipt with linked active returned cheque and deactivates both", async () => {
    const { DELETE } = await import("@/app/api/receipts/[receiptId]/route");

    const tx = {
      receipt: {
        findUnique: vi.fn().mockResolvedValue({
          receipt_id: 12,
          is_active: true,
          invoice_id: 55,
          invoice: { rep_id: 7 },
          invoiceSettlements: [{ settlement_id: 101, is_active: true }],
          returnedCheques: [
            {
              returned_cheque_id: 5001,
              invoiceSettlements: [{ settlement_id: 2001 }],
            },
          ],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      commissionReversalAllocation: {
        updateMany: vi.fn().mockResolvedValue({}),
      },
      commission: {
        updateMany: vi.fn().mockResolvedValue({}),
      },
      invoiceSettlement: {
        update: vi.fn().mockResolvedValue({}),
      },
      returnedCheque: {
        update: vi.fn().mockResolvedValue({}),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ receiptId: "12" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.success).toBe(true);
    expect(tx.returnedCheque.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { returned_cheque_id: 5001 },
        data: expect.objectContaining({ is_active: false, deleted_by: 99 }),
      }),
    );
    expect(tx.receipt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { receipt_id: 12 },
        data: expect.objectContaining({ is_active: false, deleted_by: 99 }),
      }),
    );
    expect(recalculateInvoiceFinancialsMock).toHaveBeenCalledWith(tx, 55);
    expect(rebuildInvoiceCreditNoteCommissionsMock).toHaveBeenCalledWith(tx, 55, 7);
  });

  it("deletes SRN after returns and rebuilds commission state", async () => {
    const { DELETE } = await import("@/app/api/sales-return-notes/[returnId]/route");

    const tx = {
      salesReturnNote: {
        findUnique: vi.fn().mockResolvedValue({
          return_id: 44,
          return_number: "SRN-202605-001",
          return_date: new Date("2026-05-19"),
          location_id: 1,
          invoice_id: 55,
          is_active: true,
          lines: [],
          goodsReturnNotes: [{ return_id: 10, location_id: 1, lines: [] }],
          creditNotes: [
            {
              credit_note_id: 31,
              amount: 0,
              invoiceSettlements: [],
            },
          ],
          invoice: {
            invoice_id: 55,
            rep_id: 7,
            total_amount: 1000,
            paid_amount: 0,
            credited_amount: 0,
            invoice_lines: [],
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
      goodsReturnNote: {
        updateMany: vi.fn().mockResolvedValue({}),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ returnId: "44" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.success).toBe(true);
    expect(recalculateInvoiceFinancialsMock).toHaveBeenCalledWith(tx, 55);
    expect(rebuildInvoiceCreditNoteCommissionsMock).toHaveBeenCalledWith(tx, 55, 7);
    expect(tx.salesReturnNote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { return_id: 44 },
        data: expect.objectContaining({ is_active: false, deleted_by: 99 }),
      }),
    );
  });
});
