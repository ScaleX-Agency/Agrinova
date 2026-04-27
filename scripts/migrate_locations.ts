import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });

const pool = new Pool({ connectionString: process.env.DIRECT_URL as string });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting migration...");
  
  const result = await prisma.inventoryLocation.updateMany({
    data: {
      status: "ACTIVE",
    },
  });

  console.log(`Updated ${result.count} location(s) to ACTIVE status.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
