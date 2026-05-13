import { describe, it, expect } from "vitest";
import {
  computeEffectiveBalance,
  computeReversalAllocations,
  resolveRate,
  calculateDaysToPay,
  type ReceiptSettlementData,
  type ExistingAllocation,
} from "@/lib/commissionCalc";

// ═══════════════════════════════════════════════════════════════════════
// 1. Effective Balance Calculation
// ═══════════════════════════════════════════════════════════════════════

describe("computeEffectiveBalance", () => {
  it("returns correct EB for basic invoice", () => {
    expect(computeEffectiveBalance(100000, 0, 0)).toBe(100000);
  });

  it("returns correct EB after partial payment", () => {
    expect(computeEffectiveBalance(100000, 40000, 0)).toBe(60000);
  });

  it("returns correct EB after payment + credit", () => {
    expect(computeEffectiveBalance(100000, 60000, 20000)).toBe(20000);
  });

  it("returns 0 when fully paid", () => {
    expect(computeEffectiveBalance(100000, 100000, 0)).toBe(0);
  });

  it("returns 0 when fully paid via credits", () => {
    expect(computeEffectiveBalance(100000, 0, 100000)).toBe(0);
  });

  it("returns negative when overpaid", () => {
    // Invoice 100k, paid 100k, then credit of 50k
    expect(computeEffectiveBalance(100000, 100000, 50000)).toBe(-50000);
  });

  it("returns negative when credits exceed total minus paid", () => {
    // Invoice 100k, paid 60k, credit 50k → EB = -10k
    expect(computeEffectiveBalance(100000, 60000, 50000)).toBe(-10000);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Rate Resolution
// ═══════════════════════════════════════════════════════════════════════

describe("resolveRate", () => {
  const sameDayRate = 0.025;
  const rangeMinDays = 1;
  const rangeMaxDays = 59;
  const rangeRate = 0.02;
  const overRangeRate = 0;

  it("returns same-day rate for daysToPay = 0", () => {
    expect(resolveRate(0, sameDayRate, rangeMinDays, rangeMaxDays, rangeRate, overRangeRate)).toBe(0.025);
  });

  it("returns same-day rate for negative daysToPay", () => {
    expect(resolveRate(-5, sameDayRate, rangeMinDays, rangeMaxDays, rangeRate, overRangeRate)).toBe(0.025);
  });

  it("returns range rate for daysToPay = 1 (min boundary)", () => {
    expect(resolveRate(1, sameDayRate, rangeMinDays, rangeMaxDays, rangeRate, overRangeRate)).toBe(0.02);
  });

  it("returns range rate for daysToPay = 30 (mid range)", () => {
    expect(resolveRate(30, sameDayRate, rangeMinDays, rangeMaxDays, rangeRate, overRangeRate)).toBe(0.02);
  });

  it("returns range rate for daysToPay = 59 (max boundary)", () => {
    expect(resolveRate(59, sameDayRate, rangeMinDays, rangeMaxDays, rangeRate, overRangeRate)).toBe(0.02);
  });

  it("returns over-range rate for daysToPay = 60", () => {
    expect(resolveRate(60, sameDayRate, rangeMinDays, rangeMaxDays, rangeRate, overRangeRate)).toBe(0);
  });

  it("returns over-range rate for daysToPay = 365", () => {
    expect(resolveRate(365, sameDayRate, rangeMinDays, rangeMaxDays, rangeRate, overRangeRate)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Days-To-Pay Calculation
// ═══════════════════════════════════════════════════════════════════════

describe("calculateDaysToPay", () => {
  it("returns 0 for same day", () => {
    const d = new Date("2026-05-01");
    expect(calculateDaysToPay(d, d)).toBe(0);
  });

  it("returns 30 for 30 days later", () => {
    const inv = new Date("2026-05-01");
    const rec = new Date("2026-05-31");
    expect(calculateDaysToPay(inv, rec)).toBe(30);
  });

  it("returns negative for receipt before invoice", () => {
    const inv = new Date("2026-05-10");
    const rec = new Date("2026-05-05");
    expect(calculateDaysToPay(inv, rec)).toBe(-5);
  });

  it("returns 1 for next day", () => {
    const inv = new Date("2026-05-01T00:00:00Z");
    const rec = new Date("2026-05-02T00:00:00Z");
    expect(calculateDaysToPay(inv, rec)).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Latest-Payment-First Reversal Algorithm
// ═══════════════════════════════════════════════════════════════════════

describe("computeReversalAllocations", () => {
  describe("basic single-payment reversal", () => {
    it("reverses full amount from single receipt", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 1, amount: 100000, commissionRate: 0.025 },
      ];

      const result = computeReversalAllocations(50000, receipts, [], 2500);

      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].sourceSettlementId).toBe(1);
      expect(result.allocations[0].allocatedAmount).toBe(50000);
      expect(result.allocations[0].appliedRate).toBe(0.025);
      expect(result.allocations[0].reversalAmount).toBe(1250);
      expect(result.totalReversalAmount).toBe(1250);
      expect(result.cappedReversalAmount).toBe(1250);
    });
  });

  describe("user's example: 3 payments at different rates", () => {
    // Invoice = 100,000
    // Payment 1: 40,000 @ 2.5% → commission = 1,000
    // Payment 2: 30,000 @ 2.0% → commission = 600
    // Payment 3: 30,000 @ 0%   → commission = 0
    // Total commission = 1,600
    // Return = 50,000 credit note → EB = -50,000

    const receipts: ReceiptSettlementData[] = [
      // Latest first
      { settlementId: 3, amount: 30000, commissionRate: 0 },
      { settlementId: 2, amount: 30000, commissionRate: 0.02 },
      { settlementId: 1, amount: 40000, commissionRate: 0.025 },
    ];

    it("reverses from latest first with correct rates", () => {
      const result = computeReversalAllocations(50000, receipts, [], 1600);

      expect(result.allocations).toHaveLength(2);

      // First: Payment 3 → 30,000 × 0% = 0
      expect(result.allocations[0].sourceSettlementId).toBe(3);
      expect(result.allocations[0].allocatedAmount).toBe(30000);
      expect(result.allocations[0].appliedRate).toBe(0);
      expect(result.allocations[0].reversalAmount).toBe(0);

      // Second: Payment 2 → 20,000 × 2% = 400
      expect(result.allocations[1].sourceSettlementId).toBe(2);
      expect(result.allocations[1].allocatedAmount).toBe(20000);
      expect(result.allocations[1].appliedRate).toBe(0.02);
      expect(result.allocations[1].reversalAmount).toBe(400);

      expect(result.totalReversalAmount).toBe(400);
      expect(result.cappedReversalAmount).toBe(400);
      // Net commission: 1600 - 400 = 1200 ✓
    });

    it("calculates correct weighted average rate", () => {
      const result = computeReversalAllocations(50000, receipts, [], 1600);
      // Weighted rate = 400 / 50000 = 0.008
      expect(result.weightedRate).toBeCloseTo(0.008, 4);
    });
  });

  describe("full reversal of all payments", () => {
    it("reverses all receipts when credit equals total paid", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 2, amount: 50000, commissionRate: 0.02 },
        { settlementId: 1, amount: 50000, commissionRate: 0.025 },
      ];
      // Total commission = 50000*0.02 + 50000*0.025 = 1000 + 1250 = 2250

      const result = computeReversalAllocations(100000, receipts, [], 2250);

      expect(result.allocations).toHaveLength(2);
      // Payment 2: 50,000 × 2% = 1000
      expect(result.allocations[0].allocatedAmount).toBe(50000);
      expect(result.allocations[0].reversalAmount).toBe(1000);
      // Payment 1: 50,000 × 2.5% = 1250
      expect(result.allocations[1].allocatedAmount).toBe(50000);
      expect(result.allocations[1].reversalAmount).toBe(1250);

      expect(result.totalReversalAmount).toBe(2250);
      expect(result.cappedReversalAmount).toBe(2250);
    });
  });

  describe("min 0 commission cap", () => {
    it("caps reversal so total commission doesn't go below 0", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 1, amount: 100000, commissionRate: 0.025 },
      ];
      // Total commission = 2500
      // Overpayment = 200,000 → reversal would be 200000 * 0.025 = 5000
      // But total commission is only 2500, so cap at 2500

      const result = computeReversalAllocations(200000, receipts, [], 2500);

      expect(result.totalReversalAmount).toBe(2500); // Only 100k available to allocate
      expect(result.cappedReversalAmount).toBe(2500);
    });

    it("caps when reversal exceeds current total", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 1, amount: 50000, commissionRate: 0.025 },
      ];
      // Current total commission = 500
      // Reversal would be 50000 * 0.025 = 1250
      // Cap to 500

      const result = computeReversalAllocations(50000, receipts, [], 500);

      expect(result.totalReversalAmount).toBe(1250);
      expect(result.cappedReversalAmount).toBe(500);
    });
  });

  describe("existing allocations (sequential credit notes)", () => {
    it("accounts for prior reversal from same receipt", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 2, amount: 60000, commissionRate: 0.02 },
        { settlementId: 1, amount: 40000, commissionRate: 0.025 },
      ];
      // First credit note already reversed 30,000 from settlement 2
      const existingAllocations: ExistingAllocation[] = [
        { sourceSettlementId: 2, allocatedAmount: 30000 },
      ];
      // Available: settlement 2 has 30k left, settlement 1 has 40k

      const result = computeReversalAllocations(50000, receipts, existingAllocations, 1600);

      expect(result.allocations).toHaveLength(2);
      // Settlement 2: 30,000 remaining × 2% = 600
      expect(result.allocations[0].sourceSettlementId).toBe(2);
      expect(result.allocations[0].allocatedAmount).toBe(30000);
      expect(result.allocations[0].reversalAmount).toBe(600);
      // Settlement 1: 20,000 × 2.5% = 500
      expect(result.allocations[1].sourceSettlementId).toBe(1);
      expect(result.allocations[1].allocatedAmount).toBe(20000);
      expect(result.allocations[1].reversalAmount).toBe(500);

      expect(result.totalReversalAmount).toBe(1100);
    });

    it("skips fully consumed receipt", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 2, amount: 30000, commissionRate: 0.02 },
        { settlementId: 1, amount: 40000, commissionRate: 0.025 },
      ];
      // Settlement 2 was fully consumed by a previous credit note
      const existingAllocations: ExistingAllocation[] = [
        { sourceSettlementId: 2, allocatedAmount: 30000 },
      ];

      const result = computeReversalAllocations(20000, receipts, existingAllocations, 1600);

      // Should skip settlement 2, go directly to settlement 1
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].sourceSettlementId).toBe(1);
      expect(result.allocations[0].allocatedAmount).toBe(20000);
      expect(result.allocations[0].reversalAmount).toBe(500); // 20000 * 0.025
    });

    it("handles multiple existing allocations from different credit notes", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 3, amount: 30000, commissionRate: 0 },
        { settlementId: 2, amount: 40000, commissionRate: 0.02 },
        { settlementId: 1, amount: 30000, commissionRate: 0.025 },
      ];
      // Two previous credit notes consumed some amounts
      const existingAllocations: ExistingAllocation[] = [
        { sourceSettlementId: 3, allocatedAmount: 30000 }, // fully consumed
        { sourceSettlementId: 2, allocatedAmount: 10000 }, // 30k remaining
      ];

      const result = computeReversalAllocations(40000, receipts, existingAllocations, 1550);

      expect(result.allocations).toHaveLength(2);
      // Settlement 3 skipped (fully consumed)
      // Settlement 2: 30,000 remaining × 2% = 600
      expect(result.allocations[0].sourceSettlementId).toBe(2);
      expect(result.allocations[0].allocatedAmount).toBe(30000);
      // Settlement 1: 10,000 × 2.5% = 250
      expect(result.allocations[1].sourceSettlementId).toBe(1);
      expect(result.allocations[1].allocatedAmount).toBe(10000);
    });
  });

  describe("edge cases", () => {
    it("handles empty receipt list", () => {
      const result = computeReversalAllocations(50000, [], [], 0);

      expect(result.allocations).toHaveLength(0);
      expect(result.totalReversalAmount).toBe(0);
      expect(result.cappedReversalAmount).toBe(0);
      expect(result.weightedRate).toBe(0);
    });

    it("handles zero overpayment", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 1, amount: 100000, commissionRate: 0.025 },
      ];
      const result = computeReversalAllocations(0, receipts, [], 2500);

      expect(result.allocations).toHaveLength(0);
      expect(result.totalReversalAmount).toBe(0);
    });

    it("handles all receipts at 0% rate", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 2, amount: 50000, commissionRate: 0 },
        { settlementId: 1, amount: 50000, commissionRate: 0 },
      ];

      const result = computeReversalAllocations(80000, receipts, [], 0);

      expect(result.allocations).toHaveLength(2);
      expect(result.totalReversalAmount).toBe(0); // 0% rate = no commission to reverse
      expect(result.cappedReversalAmount).toBe(0);
    });

    it("handles overpayment larger than all receipts combined", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 1, amount: 30000, commissionRate: 0.025 },
      ];

      const result = computeReversalAllocations(100000, receipts, [], 750);

      // Can only allocate 30,000 (the full receipt amount)
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].allocatedAmount).toBe(30000);
      expect(result.totalReversalAmount).toBe(750); // 30000 * 0.025
      expect(result.totalAllocated).toBe(30000);
    });

    it("handles very small amounts with decimal precision", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 1, amount: 100.5, commissionRate: 0.025 },
      ];

      const result = computeReversalAllocations(50.25, receipts, [], 2.51);

      expect(result.allocations[0].allocatedAmount).toBe(50.25);
      // 50.25 * 0.025 = 1.25625 → rounded to 1.26
      expect(result.allocations[0].reversalAmount).toBe(1.26);
    });

    it("handles single payment partially reversed", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 1, amount: 100000, commissionRate: 0.025 },
      ];
      const existingAllocations: ExistingAllocation[] = [
        { sourceSettlementId: 1, allocatedAmount: 80000 },
      ];
      // Only 20,000 available for reversal

      const result = computeReversalAllocations(30000, receipts, existingAllocations, 2500);

      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].allocatedAmount).toBe(20000);
      expect(result.allocations[0].reversalAmount).toBe(500); // 20000 * 0.025
    });
  });

  describe("cap correctness", () => {
    it("zero current commission caps reversal to 0", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 1, amount: 50000, commissionRate: 0.025 },
      ];

      const result = computeReversalAllocations(50000, receipts, [], 0);

      expect(result.totalReversalAmount).toBe(1250);
      expect(result.cappedReversalAmount).toBe(0); // Can't reverse more than what exists
    });

    it("preserves uncapped when reversal is less than current total", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 1, amount: 10000, commissionRate: 0.02 },
      ];

      const result = computeReversalAllocations(10000, receipts, [], 5000);

      expect(result.totalReversalAmount).toBe(200);
      expect(result.cappedReversalAmount).toBe(200); // 200 < 5000, no cap needed
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. End-to-End Scenario Tests (using pure functions)
// ═══════════════════════════════════════════════════════════════════════

describe("end-to-end scenarios", () => {
  describe("Scenario: Invoice lifecycle with multiple payments and returns", () => {
    // Invoice: LKR 200,000
    // Day 0: Payment 1 → 80,000 → same-day rate 2.5% → commission 2,000
    // Day 15: Payment 2 → 60,000 → range rate 2.0% → commission 1,200
    // Day 45: Payment 3 → 60,000 → range rate 2.0% → commission 1,200
    // Total paid: 200,000, Total commission: 4,400
    // Day 50: Return → 70,000 credit note → EB = 200k - 200k - 70k = -70k

    it("computes correct effective balance after full payment + return", () => {
      const eb = computeEffectiveBalance(200000, 200000, 70000);
      expect(eb).toBe(-70000);
    });

    it("allocates reversal correctly across 3 payments", () => {
      const receipts: ReceiptSettlementData[] = [
        // Latest first
        { settlementId: 3, amount: 60000, commissionRate: 0.02 },
        { settlementId: 2, amount: 60000, commissionRate: 0.02 },
        { settlementId: 1, amount: 80000, commissionRate: 0.025 },
      ];

      const result = computeReversalAllocations(70000, receipts, [], 4400);

      expect(result.allocations).toHaveLength(2);

      // Payment 3: 60,000 × 2% = 1,200
      expect(result.allocations[0].sourceSettlementId).toBe(3);
      expect(result.allocations[0].allocatedAmount).toBe(60000);
      expect(result.allocations[0].reversalAmount).toBe(1200);

      // Payment 2: 10,000 × 2% = 200
      expect(result.allocations[1].sourceSettlementId).toBe(2);
      expect(result.allocations[1].allocatedAmount).toBe(10000);
      expect(result.allocations[1].reversalAmount).toBe(200);

      expect(result.totalReversalAmount).toBe(1400);
      // Net: 4400 - 1400 = 3000
    });
  });

  describe("Scenario: Multiple sequential returns", () => {
    // Invoice: 150,000
    // Payment 1: 50,000 @ 2.5% → commission 1,250
    // Payment 2: 50,000 @ 2.0% → commission 1,000
    // Payment 3: 50,000 @ 0%   → commission 0
    // Total paid: 150,000, Total commission: 2,250

    it("first return correctly reverses", () => {
      // Return 1: 30,000 → EB = 150k - 150k - 30k = -30k
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 3, amount: 50000, commissionRate: 0 },
        { settlementId: 2, amount: 50000, commissionRate: 0.02 },
        { settlementId: 1, amount: 50000, commissionRate: 0.025 },
      ];

      const result = computeReversalAllocations(30000, receipts, [], 2250);

      // Payment 3: 30,000 × 0% = 0
      expect(result.allocations[0].sourceSettlementId).toBe(3);
      expect(result.allocations[0].allocatedAmount).toBe(30000);
      expect(result.allocations[0].reversalAmount).toBe(0);

      expect(result.totalReversalAmount).toBe(0);
    });

    it("second return accounts for first return's allocations", () => {
      // Return 2: 40,000 → EB = 150k - 150k - 70k = -70k (cumulative 70k credits)
      // But this is the INCREMENTAL overpayment from the second return
      // The first return consumed 30k from Payment 3
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 3, amount: 50000, commissionRate: 0 },
        { settlementId: 2, amount: 50000, commissionRate: 0.02 },
        { settlementId: 1, amount: 50000, commissionRate: 0.025 },
      ];

      const existingAllocations: ExistingAllocation[] = [
        { sourceSettlementId: 3, allocatedAmount: 30000 },
      ];

      // Overpayment from this credit note's perspective
      const result = computeReversalAllocations(40000, receipts, existingAllocations, 2250);

      expect(result.allocations).toHaveLength(2);
      // Payment 3: 20,000 remaining × 0% = 0
      expect(result.allocations[0].sourceSettlementId).toBe(3);
      expect(result.allocations[0].allocatedAmount).toBe(20000);
      expect(result.allocations[0].reversalAmount).toBe(0);

      // Payment 2: 20,000 × 2% = 400
      expect(result.allocations[1].sourceSettlementId).toBe(2);
      expect(result.allocations[1].allocatedAmount).toBe(20000);
      expect(result.allocations[1].reversalAmount).toBe(400);

      expect(result.totalReversalAmount).toBe(400);
    });
  });

  describe("Scenario: Extreme return exceeds all commission", () => {
    // Invoice: 100,000
    // Payment 1: 100,000 @ 2% → commission 2,000
    // Return: 100,000 → EB = -100,000
    // Reversal = 100,000 × 2% = 2,000 → net = 0

    it("full reversal brings commission to exactly 0", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 1, amount: 100000, commissionRate: 0.02 },
      ];

      const result = computeReversalAllocations(100000, receipts, [], 2000);

      expect(result.totalReversalAmount).toBe(2000);
      expect(result.cappedReversalAmount).toBe(2000);
    });
  });

  describe("Scenario: Receipt deletion recalculation", () => {
    // After deleting a receipt, the reversal needs to be recalculated
    // Invoice: 100k, 3 payments, then a return
    // If Payment 3 is deleted, reversal should only use Payment 1 and 2

    it("recalculation against fewer receipts produces different result", () => {
      // Before deletion: 3 receipts
      const beforeReceipts: ReceiptSettlementData[] = [
        { settlementId: 3, amount: 30000, commissionRate: 0 },
        { settlementId: 2, amount: 30000, commissionRate: 0.02 },
        { settlementId: 1, amount: 40000, commissionRate: 0.025 },
      ];

      const beforeResult = computeReversalAllocations(50000, beforeReceipts, [], 1600);

      // After deletion: Payment 3 removed
      const afterReceipts: ReceiptSettlementData[] = [
        { settlementId: 2, amount: 30000, commissionRate: 0.02 },
        { settlementId: 1, amount: 40000, commissionRate: 0.025 },
      ];

      // Current total commission after removing P3's commission (0)
      const afterResult = computeReversalAllocations(50000, afterReceipts, [], 1600);

      // Before: P3 (30k@0%) + P2 (20k@2%) = 400
      expect(beforeResult.totalReversalAmount).toBe(400);

      // After: P2 (30k@2%) + P1 (20k@2.5%) = 600 + 500 = 1100
      expect(afterResult.totalReversalAmount).toBe(1100);
      expect(afterResult.allocations[0].sourceSettlementId).toBe(2);
      expect(afterResult.allocations[0].allocatedAmount).toBe(30000);
      expect(afterResult.allocations[1].sourceSettlementId).toBe(1);
      expect(afterResult.allocations[1].allocatedAmount).toBe(20000);
    });
  });

  describe("Scenario: Net total with prior negative commissions", () => {
    // Invoice: 100k, fully paid via 2 payments
    // P1: 50k @ 2.5% → commission +1,250
    // P2: 50k @ 2.0% → commission +1,000
    // Return 1: 30k → reversal consumed P2(30k@2%) = -600
    // Net commission so far: 1,250 + 1,000 - 600 = 1,650
    // Return 2: 40k → new reversal against remaining P2(20k@2%) + P1(20k@2.5%)

    it("correctly caps using net total including prior negatives", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 2, amount: 50000, commissionRate: 0.02 },
        { settlementId: 1, amount: 50000, commissionRate: 0.025 },
      ];

      const existingAllocations: ExistingAllocation[] = [
        { sourceSettlementId: 2, allocatedAmount: 30000 },
      ];

      // currentTotalCommission = 1250 + 1000 + (-600) = 1650
      // (this is the NET — the DB sums all active commission_amounts including negatives)
      const result = computeReversalAllocations(40000, receipts, existingAllocations, 1650);

      // P2: 20k remaining × 2% = 400
      // P1: 20k × 2.5% = 500
      // Total reversal = 900
      expect(result.totalReversalAmount).toBe(900);
      // 900 < 1650, so no cap needed
      expect(result.cappedReversalAmount).toBe(900);
      // Net after this: 1650 - 900 = 750 ≥ 0 ✓
    });

    it("caps when second reversal would exceed net total", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 2, amount: 50000, commissionRate: 0.02 },
        { settlementId: 1, amount: 50000, commissionRate: 0.025 },
      ];

      const existingAllocations: ExistingAllocation[] = [
        { sourceSettlementId: 2, allocatedAmount: 30000 },
      ];

      // Suppose prior reversals left net at 200
      const result = computeReversalAllocations(40000, receipts, existingAllocations, 200);

      // Raw reversal would be 900, but cap to 200
      expect(result.totalReversalAmount).toBe(900);
      expect(result.cappedReversalAmount).toBe(200);
    });
  });

  describe("Scenario: Rate override impact on reversal", () => {
    // Admin edits a receipt commission rate from 2.5% to 3.0%
    // The reversal should use the overridden rate (3.0%), not the original (2.5%)

    it("uses the stored rate (which may have been overridden) for reversal", () => {
      const receipts: ReceiptSettlementData[] = [
        // commissionRate reflects the STORED rate (may be overridden)
        { settlementId: 1, amount: 100000, commissionRate: 0.03 }, // Was 2.5%, admin changed to 3%
      ];

      const result = computeReversalAllocations(50000, receipts, [], 3000);

      // Uses 3% (the stored rate), not the original 2.5%
      expect(result.allocations[0].appliedRate).toBe(0.03);
      expect(result.allocations[0].reversalAmount).toBe(1500); // 50000 × 3%
      expect(result.totalReversalAmount).toBe(1500);
    });
  });

  describe("Scenario: Negative currentTotalCommission", () => {
    // This shouldn't normally happen, but test defensive behavior
    // If somehow current total is already negative, reversal should be capped to 0

    it("caps to 0 when current total is already negative", () => {
      const receipts: ReceiptSettlementData[] = [
        { settlementId: 1, amount: 50000, commissionRate: 0.025 },
      ];

      const result = computeReversalAllocations(50000, receipts, [], -100);

      expect(result.totalReversalAmount).toBe(1250);
      // currentTotal is -100, can't reverse any more → cap to max(0, -100) = 0
      expect(result.cappedReversalAmount).toBe(0);
    });
  });
});
