// scripts/test-db.ts
import "dotenv/config";
import { db } from "../lib/db";

async function testConnection() {
  console.log("🔍 Testing database connection...");
  
  try {
    // Attempt a simple query to verify connection
    const start = Date.now();
    await db.$connect();
    const duration = Date.now() - start;
    
    console.log(`✅ Connection established in ${duration}ms`);
    
    // Check if we can reach the ROLE table
    const rolesCount = await db.role.count();
    console.log(`📊 Successfully reached database. Total roles in system: ${rolesCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

testConnection();
