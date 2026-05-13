import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const invoices = await prisma.invoice.findMany({
    where: { 
      balance_amount: 0,
      payment_status: { not: "PAID" }
    }
  });

  console.log(`Found ${invoices.length} invoices with balance 0 but not PAID status.`);

  for (const inv of invoices) {
    await prisma.invoice.update({
      where: { invoice_id: inv.invoice_id },
      data: { payment_status: "PAID" }
    });
    console.log(`Updated Invoice ${inv.invoice_id} status to PAID`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
