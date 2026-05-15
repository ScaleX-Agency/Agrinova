/**
 * Pure-logic functions for commission settlement calculations.
 * No database dependencies — these can be unit tested without mocking Prisma.
 */

export type ReceiptSettlementData = {
  settlementId: number;
  amount: number;
  commissionRate: number; // decimal, e.g. 0.025 for 2.5%
};

export type ExistingAllocation = {
  sourceSettlementId: number;
  allocatedAmount: number;
};

export type ReversalAllocation = {
  sourceSettlementId: number;
  allocatedAmount: number;
  appliedRate: number;
  reversalAmount: number;
};

export type ReversalResult = {
  allocations: ReversalAllocation[];
  totalReversalAmount: number;
  totalAllocated: number;
  weightedRate: number;
  /** The reversal amount after capping so total commission doesn't go below 0 */
  cappedReversalAmount: number;
};

export type IncrementalCreditSettlement = {
  settlementId: number;
  amount: number;
};

export type IncrementalOverpayment = {
  settlementId: number;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  incrementalOverpayment: number;
};

/**
 * Core effective balance calculation.
 */
export function computeEffectiveBalance(
  totalAmount: number,
  paidAmount: number,
  creditedAmount: number,
): number {
  return totalAmount - paidAmount - creditedAmount;
}

/**
 * Latest-Payment-First Reversal Algorithm (pure logic).
 *
 * @param overpayment The amount by which EB is negative (always positive value)
 * @param receiptSettlements Receipt settlements ordered latest-first, with their commission rates
 * @param existingAllocations Previous reversal allocations that have already consumed receipt amounts
 * @param currentTotalCommission Sum of all currently active commissions for the invoice
 * @returns ReversalResult with allocation details and capped amounts
 */
export function computeReversalAllocations(
  overpayment: number,
  receiptSettlements: ReceiptSettlementData[],
  existingAllocations: ExistingAllocation[],
  currentTotalCommission: number,
): ReversalResult {
  // Sum up how much has already been reversed from each receipt settlement
  const alreadyReversedBySettlement = new Map<number, number>();
  for (const alloc of existingAllocations) {
    const current = alreadyReversedBySettlement.get(alloc.sourceSettlementId) ?? 0;
    alreadyReversedBySettlement.set(
      alloc.sourceSettlementId,
      current + alloc.allocatedAmount,
    );
  }

  // Allocate overpayment against receipt settlements (latest first)
  const allocations: ReversalAllocation[] = [];
  let remaining = overpayment;

  for (const receiptSettlement of receiptSettlements) {
    if (remaining <= 0) break;

    const alreadyReversed = alreadyReversedBySettlement.get(receiptSettlement.settlementId) ?? 0;
    const availableForReversal = Math.max(0, receiptSettlement.amount - alreadyReversed);

    if (availableForReversal <= 0) continue;

    const allocation = Math.min(remaining, availableForReversal);
    const reversalAmount = Number((allocation * receiptSettlement.commissionRate).toFixed(2));

    allocations.push({
      sourceSettlementId: receiptSettlement.settlementId,
      allocatedAmount: allocation,
      appliedRate: receiptSettlement.commissionRate,
      reversalAmount,
    });

    remaining -= allocation;
  }

  // Calculate totals
  const totalReversalAmount = allocations.reduce((sum, a) => sum + a.reversalAmount, 0);
  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);

  // Cap reversal so total commission doesn't go below 0
  let cappedReversalAmount = totalReversalAmount;
  if (currentTotalCommission - totalReversalAmount < 0) {
    cappedReversalAmount = Math.max(0, currentTotalCommission);
  }

  // Weighted average rate for display
  const weightedRate = totalAllocated > 0
    ? totalReversalAmount / totalAllocated
    : 0;

  return {
    allocations,
    totalReversalAmount,
    totalAllocated,
    weightedRate,
    cappedReversalAmount,
  };
}

/**
 * Replays credit notes in settlement order and returns only the new overpaid
 * amount caused by each credit note.
 */
export function computeIncrementalOverpayments(
  totalAmount: number,
  paidAmount: number,
  creditSettlements: IncrementalCreditSettlement[],
): IncrementalOverpayment[] {
  let balance = Number((totalAmount - paidAmount).toFixed(2));

  return creditSettlements.map((settlement) => {
    const balanceBefore = balance;
    const overpaidBefore = Math.max(0, -balanceBefore);
    const balanceAfter = Number((balanceBefore - settlement.amount).toFixed(2));
    const overpaidAfter = Math.max(0, -balanceAfter);
    const incrementalOverpayment = Number(
      Math.max(0, overpaidAfter - overpaidBefore).toFixed(2),
    );

    balance = balanceAfter;

    return {
      settlementId: settlement.settlementId,
      amount: settlement.amount,
      balanceBefore,
      balanceAfter,
      incrementalOverpayment,
    };
  });
}

/**
 * Determines the commission rate based on days-to-pay and config.
 */
export function resolveRate(
  daysToPay: number,
  sameDayRate: number,
  rangeMinDays: number,
  rangeMaxDays: number,
  rangeRate: number,
  overRangeRate: number,
): number {
  if (daysToPay <= 0) return sameDayRate;
  if (daysToPay >= rangeMinDays && daysToPay <= rangeMaxDays) return rangeRate;
  return overRangeRate;
}

/**
 * Calculates days between invoice date and settlement date.
 */
export function calculateDaysToPay(invoiceDate: Date, settledDate: Date): number {
  return Math.floor(
    (settledDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24),
  );
}
