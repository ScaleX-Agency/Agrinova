import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.commission.updateMany({
    where: {
      status: "PENDING",
    },
    data: {
      status: "PAID",
    },
  });

  console.log(`Updated ${result.count} commissions from PENDING to PAID.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
