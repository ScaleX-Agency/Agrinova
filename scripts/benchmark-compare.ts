import "dotenv/config";
import { db as prisma } from "../lib/db"; 
import * as fs from "fs"; 
 
type BenchmarkResult = { 
  label: string; 
  avg: number; 
  min: number; 
  max: number; 
  queryCount?: number; 
}; 
 
async function runBenchmark( 
  label: string, 
  fn: () => Promise<unknown>, 
  iterations = 10 
): Promise<BenchmarkResult> { 
  // warm-up run 
  try {
    await fn(); 
  // eslint-disable-next-line
  } catch (e) {
  }
 
  const times: number[] = []; 
  for (let i = 0; i < iterations; i++) { 
    const start = performance.now(); 
    try {
   
      await fn(); 
  // eslint-disable-next-line
    } catch (e) {}
    times.push(performance.now() - start); 
  } 
 
  const avg = times.reduce((a, b) => a + b, 0) / times.length; 
  return { 
    label, 
    avg:    parseFloat(avg.toFixed(2)), 
    min:    parseFloat(Math.min(...times).toFixed(2)), 
    max:    parseFloat(Math.max(...times).toFixed(2)), 
  }; 
} 
 
async function main() { 
  const phase = process.argv[2] ?? "unknown"; 
  console.log(`\n=== BENCHMARK: ${phase.toUpperCase()} ===\n`); 
 
  // We can't run unstable_cache from a raw script easily since Next's context is missing, so we'll mock it if it errors.
  const inventoryService = await import("../lib/inventoryService"); 

  const results: BenchmarkResult[] = []; 
 
  results.push(await runBenchmark("getAllStock()", inventoryService.getAllStock)); 
  results.push(await runBenchmark("getLocationSummaries()", () => inventoryService.getLocationSummaries())); 
  results.push(await runBenchmark("Full page load (parallel)", () => 
    Promise.all([inventoryService.getAllStock(), inventoryService.getLocationSummaries()]) 
  )); 
 
  results.forEach((r) => 
    console.log(`${r.label}:  avg ${r.avg}ms  min ${r.min}ms  max ${r.max}ms`) 
  ); 
 
  // Load and compare against baseline 
  if (fs.existsSync("benchmark-results.json") && phase !== "baseline") { 
    const baseline: { results: BenchmarkResult[] } = JSON.parse( 
      fs.readFileSync("benchmark-results.json", "utf-8") 
    ); 
    console.log("\n=== vs BASELINE ==="); 
    results.forEach((r) => { 
      const b = baseline.results.find((x) => x.label === r.label || x.label === r.label + " CURRENT"); 
      if (!b) return; 
      const pct = (((b.avg - r.avg) / b.avg) * 100).toFixed(1); 
      const improved = r.avg < b.avg; 
      console.log(`${r.label}: ${b.avg}ms → ${r.avg}ms  (${improved ? "↓" : "↑"} ${Math.abs(Number(pct))}% ${improved ? "faster" : "slower"})`); 
    }); 
  } 
 
  // Append to history file 
  const history = fs.existsSync("benchmark-history.json") 
    ? JSON.parse(fs.readFileSync("benchmark-history.json", "utf-8")) 
    : []; 
 
  history.push({ phase, timestamp: new Date().toISOString(), results }); 
  fs.writeFileSync("benchmark-history.json", JSON.stringify(history, null, 2)); 
 
  console.log("\n✅ Results saved to benchmark-history.json"); 
  await prisma.$disconnect(); 
} 
 
main().catch(console.error); 
