import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  $transaction: vi.fn(),
  productRepack: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
  product: {
    findUnique: vi.fn(),
  },
  stock: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
  },
  inventoryLocation: {
    findFirst: vi.fn(),
  },
};

const getCurrentUserMock = vi.fn();
const isAdminMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: any) => fn,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: getCurrentUserMock,
  isAdminUser: isAdminMock,
}));

describe("Product Repacking business logic and API flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({
      user_id: 1,
      role: { role_name: "admin" },
    });
    isAdminMock.mockReturnValue(true);
  });

  describe("createProductRepack", () => {
    it("successfully creates a product repack and updates stock levels", async () => {
      const { createProductRepack } = await import("@/lib/repackService");

      const tx = {
        inventoryLocation: {
          findFirst: vi.fn().mockResolvedValue({ location_id: 10 }),
        },
        product: {
          findUnique: vi.fn()
            .mockResolvedValueOnce({ product_id: 101, product_code: "PRD-A" }) // source
            .mockResolvedValueOnce({ product_id: 102, product_code: "PRD-B" }), // target
        },
        stock: {
          findUnique: vi.fn().mockResolvedValue({
            stock_id: 50,
            quantity_on_hand: 5,
          }),
          update: vi.fn().mockResolvedValue({}),
          upsert: vi.fn().mockResolvedValue({}),
        },
        productRepack: {
          findFirst: vi.fn().mockResolvedValue(null), // for next sequence number
          create: vi.fn().mockResolvedValue({
            repack_id: 7,
            repack_number: "RPK-202607-001",
          }),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      );

      const result = await createProductRepack(
        {
          repack_date: "2026-07-04",
          location_id: 10,
          source_product_id: 101,
          source_quantity: 2,
          target_product_id: 102,
          target_quantity: 100,
          notes: "Repack 2 drums of A into 100 bottles of B",
        },
        1,
      );

      expect(result).toBeDefined();
      expect(result.repack_id).toBe(7);
      expect(result.repack_number).toBe("RPK-202607-001");
      expect(tx.stock.update).toHaveBeenCalledWith({
        where: { stock_id: 50 },
        data: { quantity_on_hand: { decrement: 2 } },
      });
      expect(tx.stock.upsert).toHaveBeenCalledWith({
        where: {
          product_id_location_id: {
            product_id: 102,
            location_id: 10,
          },
        },
        create: {
          product_id: 102,
          location_id: 10,
          quantity_on_hand: 100,
        },
        update: {
          quantity_on_hand: { increment: 100 },
        },
      });
    });

    it("throws an error if source and target products are the same", async () => {
      const { createProductRepack } = await import("@/lib/repackService");

      await expect(
        createProductRepack(
          {
            repack_date: "2026-07-04",
            location_id: 10,
            source_product_id: 101,
            source_quantity: 2,
            target_product_id: 101,
            target_quantity: 100,
            notes: "Repack same product",
          },
          1,
        ),
      ).rejects.toThrow("Source and target products must be different.");
    });

    it("throws an error if source stock is insufficient", async () => {
      const { createProductRepack } = await import("@/lib/repackService");

      const tx = {
        inventoryLocation: {
          findFirst: vi.fn().mockResolvedValue({ location_id: 10 }),
        },
        product: {
          findUnique: vi.fn()
            .mockResolvedValueOnce({ product_id: 101, product_code: "PRD-A" })
            .mockResolvedValueOnce({ product_id: 102, product_code: "PRD-B" }),
        },
        stock: {
          findUnique: vi.fn().mockResolvedValue({
            stock_id: 50,
            quantity_on_hand: 1, // only 1 available
          }),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      );

      await expect(
        createProductRepack(
          {
            repack_date: "2026-07-04",
            location_id: 10,
            source_product_id: 101,
            source_quantity: 2, // requesting 2
            target_product_id: 102,
            target_quantity: 100,
            notes: "Insufficient stock test",
          },
          1,
        ),
      ).rejects.toThrow(/Insufficient stock/);
    });
  });

  describe("deleteProductRepack", () => {
    it("successfully soft-deletes a repack and restores stock levels", async () => {
      const { deleteProductRepack } = await import("@/lib/repackService");

      const tx = {
        productRepack: {
          findUnique: vi.fn().mockResolvedValue({
            repack_id: 7,
            repack_number: "RPK-202607-001",
            repack_date: new Date(),
            location_id: 10,
            source_product_id: 101,
            source_quantity: 2,
            target_product_id: 102,
            target_quantity: 100,
            is_active: true,
            source_product: { product_code: "PRD-A" },
            target_product: { product_code: "PRD-B" },
          }),
          update: vi.fn().mockResolvedValue({
            repack_id: 7,
            repack_number: "RPK-202607-001",
            is_active: false,
          }),
        },
        stock: {
          findUnique: vi.fn()
            .mockResolvedValueOnce({ stock_id: 60, quantity_on_hand: 120 }) // target stock lock (has 120, > 100)
            .mockResolvedValueOnce({ stock_id: 50, quantity_on_hand: 3 }), // source stock lock
          update: vi.fn().mockResolvedValue({}),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      );

      const result = await deleteProductRepack(7, 1);

      expect(result).toBeDefined();
      expect(result.is_active).toBe(false);
      expect(tx.stock.update).toHaveBeenNthCalledWith(1, {
        where: { stock_id: 50 },
        data: { quantity_on_hand: { increment: 2 } },
      });
      expect(tx.stock.update).toHaveBeenNthCalledWith(2, {
        where: { stock_id: 60 },
        data: { quantity_on_hand: { decrement: 100 } },
      });
    });

    it("throws an error if target product stock is insufficient for reversal", async () => {
      const { deleteProductRepack } = await import("@/lib/repackService");

      const tx = {
        productRepack: {
          findUnique: vi.fn().mockResolvedValue({
            repack_id: 7,
            repack_number: "RPK-202607-001",
            repack_date: new Date(),
            location_id: 10,
            source_product_id: 101,
            source_quantity: 2,
            target_product_id: 102,
            target_quantity: 100,
            is_active: true,
            source_product: { product_code: "PRD-A" },
            target_product: { product_code: "PRD-B" },
          }),
        },
        stock: {
          findUnique: vi.fn()
            .mockResolvedValueOnce({ stock_id: 60, quantity_on_hand: 50 }), // only 50 left, but we need 100 to reverse
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      );

      await expect(deleteProductRepack(7, 1)).rejects.toThrow(
        /target product stock is insufficient for reversal/,
      );
    });
  });
});
