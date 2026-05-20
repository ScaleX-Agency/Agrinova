import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });

const pool = new Pool({ connectionString: process.env.DIRECT_URL as string });

async function main() {
  console.log("Creating enum...");
  try {
    await pool.query("CREATE TYPE \"LocationStatus\" AS ENUM ('ACTIVE', 'INACTIVE');");
  } catch {
    console.log("Enum already exists?");
  }
  
  console.log("Altering table...");
  try {
     await pool.query("ALTER TABLE \"INVENTORY_LOCATION\" ADD COLUMN \"address\" TEXT, ADD COLUMN \"status\" \"LocationStatus\" NOT NULL DEFAULT 'ACTIVE', ADD COLUMN \"created_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD COLUMN \"updated_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;");
  } catch {
    console.log("Columns already exist?");
  }
  
  const result = await pool.query("UPDATE \"INVENTORY_LOCATION\" SET \"status\" = 'ACTIVE';");
  console.log(`Updated ${result.rowCount} locations.`);
  
  await pool.end();
}

main().catch(console.error);
