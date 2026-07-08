import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local" });

async function main() {
  console.log("Loading Prisma client dynamically...");
  const { prisma } = await import("../lib/prisma");

  console.log("Applying unique indices to database...");

  const queries = [
    // 1. Invoices
    `CREATE UNIQUE INDEX IF NOT EXISTS unique_active_invoice_number ON "INVOICE"(invoice_number) WHERE is_active = true;`,
    
    // 2. Goods Issue Notes
    `CREATE UNIQUE INDEX IF NOT EXISTS unique_active_gin_number ON "GOODS_ISSUE_NOTE"(gin_number) WHERE is_active = true;`,
    
    // 3. Sales Return Notes
    `CREATE UNIQUE INDEX IF NOT EXISTS unique_active_return_number ON "SALES_RETURN_NOTE"(return_number) WHERE is_active = true;`,
    
    // 4. Goods Receiving Notes
    `CREATE UNIQUE INDEX IF NOT EXISTS unique_active_grn_number ON "GOODS_RECEIVING_NOTE"(grn_number) WHERE is_active = true;`,
    
    // 5. Returned Cheques
    `CREATE UNIQUE INDEX IF NOT EXISTS unique_active_returned_cheque_receipt_id ON "RETURNED_CHEQUE"(receipt_id) WHERE is_active = true;`
  ];

  for (const q of queries) {
    console.log(`Executing: ${q}`);
    await prisma.$executeRawUnsafe(q);
  }

  console.log("All unique indices applied successfully.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Failed to apply indices:", err);
});
