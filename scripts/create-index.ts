import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local" });

async function main() {
  console.log("Loading Prisma client dynamically...");
  const { prisma } = await import("../lib/prisma");

  console.log("Applying partial unique index on RECEIPT table...");
  
  // We use executeRawUnsafe to execute the PostgreSQL-specific DDL query.
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS unique_active_receipt_number ON "RECEIPT"(receipt_number) WHERE is_active = true;`
  );

  console.log("Partial unique index applied successfully.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Failed to apply unique index:", err);
});
