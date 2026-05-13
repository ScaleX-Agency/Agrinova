import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const invoice = await prisma.invoice.findUnique({
    where: { invoice_id: 2 },
    include: {
      receipts: { where: { is_active: true } },
      invoiceSettlements: { where: { is_active: true } },
    }
  });

  const creditNotes = await prisma.creditNote.findMany({
    where: { invoice_id: 2, is_active: true }
  });

  console.log("=== INVOICE DETAILS ===");
  console.log(JSON.stringify({
    invoice_id: invoice?.invoice_id,
    payment_status: invoice?.payment_status,
    total_amount: Number(invoice?.total_amount),
    paid_amount: Number(invoice?.paid_amount),
    credited_amount: Number(invoice?.credited_amount),
    balance_amount: Number(invoice?.balance_amount)
  }, null, 2));

  console.log("\n=== RECEIPTS ===");
  invoice?.receipts.forEach(r => console.log(`ID: ${r.receipt_id}, Amount: ${Number(r.amount)}`));
  const sumReceipts = invoice?.receipts.reduce((sum, r) => sum + Number(r.amount), 0);
  console.log("Sum of active receipts:", sumReceipts);

  console.log("\n=== CREDIT NOTES ===");
  creditNotes.forEach(c => console.log(`ID: ${c.credit_note_id}, Amount: ${Number(c.amount)}`));
  const sumCredits = creditNotes.reduce((sum, c) => sum + Number(c.amount), 0);
  console.log("Sum of active credit notes:", sumCredits);

  console.log("\n=== INVOICE SETTLEMENTS ===");
  invoice?.invoiceSettlements.forEach(s => console.log(`ID: ${s.settlement_id}, Type: ${s.settlement_type}, Amount: ${Number(s.amount)}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
