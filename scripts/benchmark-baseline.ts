import "dotenv/config";
import { db as prisma } from "../lib/db";

async function getAllStock() {
  return prisma.stock.findMany({
    include: { product: { include: { category: true } }, location: true },
  });
}

async function getLocationSummaries() {
  // Current implementation — fetches stock AGAIN
  const locations = await prisma.inventoryLocation.findMany({
    include: { stocks: true },
  });
  return locations.map((loc) => ({
    location_id:    loc.location_id,
    code:           loc.code,
    name:           loc.name,
    total_products: loc.stocks.length,
    total_units:    loc.stocks.reduce((s, st) => s + st.quantity_on_hand, 0),
    low_count:      loc.stocks.filter((s) => s.quantity_on_hand > 0 && s.quantity_on_hand < 20).length,
    out_count:      loc.stocks.filter((s) => s.quantity_on_hand <= 0).length,
  }));
}

async function getAllMovements() {
  return prisma.stockMovement.findMany({
    include: { stock: { include: { location: true } }, product: true, creator: true },
    orderBy: { movement_date: "desc" },
    take: 200,
  });
}

async function runBenchmark(label: string, fn: () => Promise<unknown>, iterations = 5) {
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  console.log(`${label}:`);
  console.log(`  avg: ${avg.toFixed(1)}ms  min: ${min.toFixed(1)}ms  max: ${max.toFixed(1)}ms`);
  return { label, avg, min, max };
}

async function main() {
  console.log("\n=== BASELINE BENCHMARK ===\n");

  const results = [];

  // Individual query times
  results.push(await runBenchmark("getAllStock()", getAllStock));
  results.push(await runBenchmark("getLocationSummaries() CURRENT", getLocationSummaries));
  results.push(await runBenchmark("getAllMovements()", getAllMovements));

  // Full page load simulation (all 3 in parallel, as current page.tsx does)
  results.push(await runBenchmark("Full page load (parallel)", () =>
    Promise.all([getAllStock(), getLocationSummaries(), getAllMovements()])
  ));

  // Count actual DB queries using Prisma query log
  console.log("\n=== QUERY COUNT ===");
  const queryLog: string[] = [];
  const debugPrisma = prisma.$extends({
    query: { $allModels: { $allOperations: ({ operation, model, args, query }) => {
      queryLog.push(`${model}.${operation}`);
      return query(args);
    }}}
  });

  await Promise.all([
  // eslint-disable-next-line
    (debugPrisma as any).stock.findMany({ include: { product: { include: { category: true } }, location: true } }),
  // eslint-disable-next-line
    (debugPrisma as any).inventoryLocation.findMany({ include: { stocks: true } }),
  // eslint-disable-next-line
    (debugPrisma as any).stockMovement.findMany({ include: { stock: { include: { location: true } }, product: true, creator: true }, take: 200 }),
  ]);
  console.log(`Total queries fired: ${queryLog.length}`);
  console.log("Queries:", queryLog);

  // Save results to file for comparison
  const fs = await import("fs");
  const output = {
    timestamp: new Date().toISOString(),
    phase: "baseline",
    results,
    queryCount: queryLog.length,
    queries: queryLog,
  };
  fs.writeFileSync("benchmark-results.json", JSON.stringify(output, null, 2));
  console.log("\n✅ Saved to benchmark-results.json");

  await prisma.$disconnect();
}

main().catch(console.error);
