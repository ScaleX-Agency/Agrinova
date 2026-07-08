import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local" });

async function main() {
  console.log("Loading Prisma client dynamically...");
  const { prisma } = await import("../lib/prisma");
  const { recalculateInvoiceFinancials } = await import("../lib/invoiceFinancials");

  const duplicateReceiptIds = [23, 26, 28];
  
  console.log("Starting cleanup of duplicate receipts...");

  await prisma.$transaction(async (tx) => {
    // 1. Deactivate duplicate receipts
    console.log(`Deactivating Receipts: ${duplicateReceiptIds.join(", ")}`);
    await tx.receipt.updateMany({
      where: { receipt_id: { in: duplicateReceiptIds } },
      data: {
        is_active: false,
        deleted_by: 1,
      },
    });

    // 2. Deactivate Settlements associated with these receipts
    console.log("Deactivating associated settlements...");
    const settlements = await tx.invoiceSettlement.findMany({
      where: { receipt_id: { in: duplicateReceiptIds } },
      select: { settlement_id: true },
    });
    const settlementIds = settlements.map(s => s.settlement_id);
    
    if (settlementIds.length > 0) {
      console.log(`Settlements found: ${settlementIds.join(", ")}`);
      await tx.invoiceSettlement.updateMany({
        where: { settlement_id: { in: settlementIds } },
        data: {
          is_active: false,
          commission_issued: false,
        },
      });

      // 3. Cancel and deactivate duplicate commissions linked to these settlements
      console.log("Cancelling associated commissions...");
      await tx.commission.updateMany({
        where: { settlement_id: { in: settlementIds } },
        data: {
          is_active: false,
          status: "CANCELLED",
        },
      });
    }

    // 4. Recalculate Invoice Financials for affected invoices
    const targetInvoiceIds = [72, 83, 130];
    console.log(`Recalculating financials for invoices: ${targetInvoiceIds.join(", ")}`);
    for (const invoiceId of targetInvoiceIds) {
      const snap = await recalculateInvoiceFinancials(tx, invoiceId);
      console.log(`Invoice ID ${invoiceId} recalculated: Paid = ${snap.paidAmount}, Balance = ${snap.balanceAmount}, Status = ${snap.paymentStatus}`);
    }
  });

  console.log("Cleanup completed successfully.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
});
