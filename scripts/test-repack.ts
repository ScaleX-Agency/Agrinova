import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking Prisma client fields...");
  console.log("productRepack exists on client:", typeof prisma.productRepack !== "undefined");
  try {
    const count = await prisma.productRepack.count();
    console.log("Repacks count in DB:", count);
  } catch (err) {
    console.error("Error accessing productRepack:", err);
  } finally {
    // Wait for pool disconnect
  }
}

main();
