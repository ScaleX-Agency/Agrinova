import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { prisma } from "./lib/prisma";

async function main() {
  const rolesCount = await prisma.role.count();
  console.log("Count:", rolesCount);
}
main().catch(console.error).finally(() => prisma.$disconnect());
