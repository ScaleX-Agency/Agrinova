import { PrismaClient, InvoiceStatus, PaymentMethod, CommissionStatus, SettlementType, GINStatus, LinePromotionType } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ Error: DIRECT_URL or DATABASE_URL must be defined in your environment.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Clearing existing transaction data for a clean seed...");
  
  // Clear tables in strict reverse dependency order
  await prisma.commissionReversalAllocation.deleteMany({});
  await prisma.commission.deleteMany({});
  await prisma.invoiceSettlement.deleteMany({});
  await prisma.returnedCheque.deleteMany({});
  await prisma.receipt.deleteMany({});
  await prisma.creditNote.deleteMany({});
  await prisma.reminder.deleteMany({});
  await prisma.goodsReturnNoteLine.deleteMany({});
  await prisma.goodsReturnNote.deleteMany({});
  await prisma.salesReturnNoteLine.deleteMany({});
  await prisma.salesReturnNote.deleteMany({});
  await prisma.goodsIssueNoteLine.deleteMany({});
  await prisma.goodsIssueNote.deleteMany({});
  await prisma.goodsReceivingNoteLine.deleteMany({});
  await prisma.goodsReceivingNote.deleteMany({});
  await prisma.productRepack.deleteMany({});
  await prisma.invoiceLine.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.stockTransferLine.deleteMany({});
  await prisma.stockTransfer.deleteMany({});
  await prisma.stock.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.salesRep.deleteMany({});

  console.log("🌱 Database cleaned. Seeding core data...");

  // 1. Categories
  const ensureCategory = async (name: string, tag: string) => {
    const existing = await prisma.category.findFirst({ where: { tag } });
    return existing ?? prisma.category.create({ data: { name, tag } });
  };

  const catFert = await ensureCategory("Fertilizer", "FERT");
  const catFung = await ensureCategory("Fungicide", "FUNG");
  const catHerb = await ensureCategory("Herbicide", "HERB");
  const catInsc = await ensureCategory("Insecticide", "INSC");
  const catNema = await ensureCategory("Nematicide", "NEMA");
  const catSupp = await ensureCategory("Supplement", "SUPP");
  const catSoil = await ensureCategory("Soil", "SOIL");

  console.log("✅ Categories seeded");

  // 2. Locations
  const loc1 = await prisma.inventoryLocation.upsert({ 
    where: { code: "IGRN1" }, 
    update: {}, 
    create: { code: "IGRN1", name: "Head Office Warehouse" } 
  });
  const loc2 = await prisma.inventoryLocation.upsert({ 
    where: { code: "IGRN2" }, 
    update: {}, 
    create: { code: "IGRN2", name: "Kuliyapitiya Branch" } 
  });
  const loc3 = await prisma.inventoryLocation.upsert({ 
    where: { code: "IGRN3" }, 
    update: {}, 
    create: { code: "IGRN3", name: "Nuwara Eliya Depot" } 
  });
  const loc4 = await prisma.inventoryLocation.upsert({ 
    where: { code: "IGRN4" }, 
    update: {}, 
    create: { code: "IGRN4", name: "Peradeniya Store" } 
  });

  const locations = [loc1, loc2, loc3, loc4];
  console.log("✅ Locations seeded");

  // 3. Roles and Admin User
  const role = await prisma.role.upsert({ 
    where: { role_id: 1 }, 
    update: {}, 
    create: { role_id: 1, role_name: "Administrator" } 
  });
  
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: { clerk_id: "mock_admin_clerk_id" },
    create: {
      role_id: role.role_id,
      full_name: "Admin User",
      username: "admin",
      password_hash: "placeholder",
      clerk_id: "mock_admin_clerk_id"
    }
  });

  console.log("✅ Admin user seeded (linked to mock clerk ID)");

  // 4. Sales Representatives
  const rep1 = await prisma.salesRep.create({
    data: { full_name: "Anura Perera", phone: "0777987654" }
  });
  const rep2 = await prisma.salesRep.create({
    data: { full_name: "Saman Kumara", phone: "0777123456" }
  });
  const rep3 = await prisma.salesRep.create({
    data: { full_name: "Nimal Silva", phone: "0777111222" }
  });

  console.log("✅ Sales representatives seeded");

  // 5. Customers
  const cust1 = await prisma.customer.create({
    data: {
      name: "Green Valley Farms",
      phone: "0812233445",
      address: "12, Kandy Road, Peradeniya",
      assigned_rep_id: rep1.rep_id
    }
  });
  const cust2 = await prisma.customer.create({
    data: {
      name: "Lanka Agro Enterprises",
      phone: "0372255667",
      address: "45, Kurunegala Road, Kuliyapitiya",
      assigned_rep_id: rep2.rep_id
    }
  });
  const cust3 = await prisma.customer.create({
    data: {
      name: "Hill Country Gardens",
      phone: "0522288990",
      address: "102, Badulla Road, Nuwara Eliya",
      assigned_rep_id: rep3.rep_id
    }
  });
  const cust4 = await prisma.customer.create({
    data: {
      name: "Rajarata Cultivators",
      phone: "0252211223",
      address: "88, Jaffna Highway, Anuradhapura",
      assigned_rep_id: rep1.rep_id
    }
  });

  console.log("✅ Customers seeded");

  // 6. Products
  const p1 = await prisma.product.create({
    data: {
      product_code: "FERT-0001",
      product_name: "AgriGold Fertilizer",
      pack_size: "25 kg",
      selling_price: 2500,
      category_id: catFert.category_id
    }
  });
  const p2 = await prisma.product.create({
    data: {
      product_code: "FERT-0002",
      product_name: "BioGrow Compost",
      pack_size: "10 kg",
      selling_price: 1200,
      category_id: catFert.category_id
    }
  });
  const p3 = await prisma.product.create({
    data: {
      product_code: "INSC-0001",
      product_name: "TermiKill Pro",
      pack_size: "1 L",
      selling_price: 4500,
      category_id: catInsc.category_id
    }
  });
  const p4 = await prisma.product.create({
    data: {
      product_code: "INSC-0002",
      product_name: "BugBlast Spray",
      pack_size: "500 ml",
      selling_price: 1800,
      category_id: catInsc.category_id
    }
  });
  const p5 = await prisma.product.create({
    data: {
      product_code: "FUNG-0001",
      product_name: "FungiShield Powder",
      pack_size: "1 kg",
      selling_price: 3200,
      category_id: catFung.category_id
    }
  });
  const p6 = await prisma.product.create({
    data: {
      product_code: "SUPP-0001",
      product_name: "NitroBoost Liquid",
      pack_size: "250 ml",
      selling_price: 950,
      category_id: catSupp.category_id
    }
  });

  const products = [p1, p2, p3, p4, p5, p6];
  console.log("✅ Products seeded");

  // 7. Stock Entries (Distribute items across warehouses)
  for (const location of locations) {
    for (const product of products) {
      // Create some low stock situations to trigger reorder alerts
      let quantity = 100 + Math.floor(Math.random() * 150);
      if (location.code === "IGRN3" && product.product_code === "INSC-0002") {
        quantity = 4; // triggers low stock alert
      }
      if (location.code === "IGRN4" && product.product_code === "SUPP-0001") {
        quantity = 2; // triggers low stock alert
      }

      await prisma.stock.create({
        data: {
          product_id: product.product_id,
          location_id: location.location_id,
          quantity_on_hand: quantity
        }
      });
    }
  }

  console.log("✅ Stock records seeded");

  // 8. Transactions (Invoices, Receipts, Settlements, Commissions)

  console.log("🌱 Seeding historic invoices and collections...");

  // Helper to subtract/add days
  const dateOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  };

  // Transaction 1: PAID Invoice from 60 days ago
  const invDate1 = dateOffset(60);
  const inv1 = await prisma.invoice.create({
    data: {
      customer_id: cust2.customer_id,
      rep_id: rep2.rep_id,
      created_by: adminUser.user_id,
      invoice_date: invDate1,
      total_amount: 49000,
      paid_amount: 49000,
      balance_amount: 0,
      invoice_number: "INV-202605-001",
      location_id: loc2.location_id,
      payment_status: InvoiceStatus.PAID,
      gin_status: GINStatus.ISSUED,
      invoice_lines: {
        create: [
          {
            product_id: p1.product_id,
            quantity: 10,
            unit_price: 2500,
            line_total: 25000,
            net_line_total: 25000,
            balance_amount: 25000
          },
          {
            product_id: p2.product_id,
            quantity: 20,
            unit_price: 1200,
            line_total: 24000,
            net_line_total: 24000,
            balance_amount: 24000
          }
        ]
      }
    }
  });

  const rcptDate1 = dateOffset(58); // Paid 2 days later
  const rcpt1 = await prisma.receipt.create({
    data: {
      invoice_id: inv1.invoice_id,
      payment_method: PaymentMethod.BANK_TRANSFER,
      amount: 49000,
      created_by: adminUser.user_id,
      receipt_number: "RCP-202605-001",
      receipt_date: rcptDate1,
      created_at: rcptDate1
    }
  });

  const setl1 = await prisma.invoiceSettlement.create({
    data: {
      invoice_id: inv1.invoice_id,
      receipt_id: rcpt1.receipt_id,
      amount: 49000,
      settled_date: rcptDate1,
      settlement_type: SettlementType.RECEIPT,
      commission_issued: true
    }
  });

  // Commission calculation: days = 2, rate = 2.0% (as it's > 0 and <= 65)
  await prisma.commission.create({
    data: {
      rep_id: rep2.rep_id,
      commission_rate: 0.02,
      commission_amount: 49000 * 0.02,
      days_to_pay: 2,
      status: CommissionStatus.PAID,
      settlement_id: setl1.settlement_id,
      created_at: rcptDate1
    }
  });


  // Transaction 2: PARTIAL Invoice from 25 days ago
  const invDate2 = dateOffset(25);
  const inv2 = await prisma.invoice.create({
    data: {
      customer_id: cust1.customer_id,
      rep_id: rep1.rep_id,
      created_by: adminUser.user_id,
      invoice_date: invDate2,
      total_amount: 40500,
      paid_amount: 25000,
      balance_amount: 15500,
      invoice_number: "INV-202606-001",
      location_id: loc1.location_id,
      payment_status: InvoiceStatus.PARTIAL,
      gin_status: GINStatus.ISSUED,
      invoice_lines: {
        create: [
          {
            product_id: p3.product_id,
            quantity: 5,
            unit_price: 4500,
            line_total: 22500,
            net_line_total: 22500,
            balance_amount: 22500
          },
          {
            product_id: p4.product_id,
            quantity: 10,
            unit_price: 1800,
            line_total: 18000,
            net_line_total: 18000,
            balance_amount: 18000
          }
        ]
      }
    }
  });

  const rcptDate2 = dateOffset(20); // Paid part 5 days later
  const rcpt2 = await prisma.receipt.create({
    data: {
      invoice_id: inv2.invoice_id,
      payment_method: PaymentMethod.CASH,
      amount: 25000,
      created_by: adminUser.user_id,
      receipt_number: "RCP-202606-001",
      receipt_date: rcptDate2,
      created_at: rcptDate2
    }
  });

  const setl2 = await prisma.invoiceSettlement.create({
    data: {
      invoice_id: inv2.invoice_id,
      receipt_id: rcpt2.receipt_id,
      amount: 25000,
      settled_date: rcptDate2,
      settlement_type: SettlementType.RECEIPT,
      commission_issued: false
    }
  });

  // Commission calculation: days = 5, rate = 2.0%
  await prisma.commission.create({
    data: {
      rep_id: rep1.rep_id,
      commission_rate: 0.02,
      commission_amount: 25000 * 0.02,
      days_to_pay: 5,
      status: CommissionStatus.PENDING,
      settlement_id: setl2.settlement_id,
      created_at: rcptDate2
    }
  });


  // Transaction 3: PAID Invoice from 20 days ago, collected instantly
  const invDate3 = dateOffset(20);
  const inv3 = await prisma.invoice.create({
    data: {
      customer_id: cust3.customer_id,
      rep_id: rep3.rep_id,
      created_by: adminUser.user_id,
      invoice_date: invDate3,
      total_amount: 48000,
      paid_amount: 48000,
      balance_amount: 0,
      invoice_number: "INV-202606-002",
      location_id: loc3.location_id,
      payment_status: InvoiceStatus.PAID,
      gin_status: GINStatus.ISSUED,
      invoice_lines: {
        create: [
          {
            product_id: p5.product_id,
            quantity: 15,
            unit_price: 3200,
            line_total: 48000,
            net_line_total: 48000,
            balance_amount: 48000
          }
        ]
      }
    }
  });

  const rcpt3 = await prisma.receipt.create({
    data: {
      invoice_id: inv3.invoice_id,
      payment_method: PaymentMethod.CHEQUE,
      amount: 48000,
      created_by: adminUser.user_id,
      receipt_number: "RCP-202606-002",
      receipt_date: invDate3,
      created_at: invDate3 // Instant collection (0 days diff)
    }
  });

  const setl3 = await prisma.invoiceSettlement.create({
    data: {
      invoice_id: inv3.invoice_id,
      receipt_id: rcpt3.receipt_id,
      amount: 48000,
      settled_date: invDate3,
      settlement_type: SettlementType.RECEIPT,
      commission_issued: true
    }
  });

  // Commission calculation: days = 0, rate = 2.5%
  await prisma.commission.create({
    data: {
      rep_id: rep3.rep_id,
      commission_rate: 0.025,
      commission_amount: 48000 * 0.025,
      days_to_pay: 0,
      status: CommissionStatus.PAID,
      settlement_id: setl3.settlement_id,
      created_at: invDate3
    }
  });


  // Transaction 4: UNPAID Invoice from 5 days ago
  const invDate4 = dateOffset(5);
  await prisma.invoice.create({
    data: {
      customer_id: cust4.customer_id,
      rep_id: rep1.rep_id,
      created_by: adminUser.user_id,
      invoice_date: invDate4,
      total_amount: 28500,
      paid_amount: 0,
      balance_amount: 28500,
      invoice_number: "INV-202607-001",
      location_id: loc4.location_id,
      payment_status: InvoiceStatus.UNPAID,
      gin_status: GINStatus.PENDING,
      invoice_lines: {
        create: [
          {
            product_id: p6.product_id,
            quantity: 30,
            unit_price: 950,
            line_total: 28500,
            net_line_total: 28500,
            balance_amount: 28500
          }
        ]
      }
    }
  });


  // Transaction 5: UNPAID Invoice from 2 days ago
  const invDate5 = dateOffset(2);
  await prisma.invoice.create({
    data: {
      customer_id: cust2.customer_id,
      rep_id: rep2.rep_id,
      created_by: adminUser.user_id,
      invoice_date: invDate5,
      total_amount: 20000,
      paid_amount: 0,
      balance_amount: 20000,
      invoice_number: "INV-202607-002",
      location_id: loc2.location_id,
      payment_status: InvoiceStatus.UNPAID,
      gin_status: GINStatus.PENDING,
      invoice_lines: {
        create: [
          {
            product_id: p1.product_id,
            quantity: 8,
            unit_price: 2500,
            line_total: 20000,
            net_line_total: 20000,
            balance_amount: 20000
          }
        ]
      }
    }
  });

  console.log("✅ Historic invoices and collections seeded");
  console.log("🎉 Seed complete! Database successfully populated with high-quality demo data.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect().then(() => pool.end()));
