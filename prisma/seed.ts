import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() { 
  // Categories 
  const cats = await Promise.all([ 
    prisma.category.upsert({ where:{ tag:"FERT" }, update:{}, create:{ name:"Fertilizer",  tag:"FERT" } }), 
    prisma.category.upsert({ where:{ tag:"FUNG" }, update:{}, create:{ name:"Fungicide",   tag:"FUNG" } }), 
    prisma.category.upsert({ where:{ tag:"HERB" }, update:{}, create:{ name:"Herbicide",   tag:"HERB" } }), 
    prisma.category.upsert({ where:{ tag:"INSC" }, update:{}, create:{ name:"Insecticide", tag:"INSC" } }), 
    prisma.category.upsert({ where:{ tag:"NEMA" }, update:{}, create:{ name:"Nematicide",  tag:"NEMA" } }), 
    prisma.category.upsert({ where:{ tag:"SUPP" }, update:{}, create:{ name:"Supplement",  tag:"SUPP" } }), 
    prisma.category.upsert({ where:{ tag:"SOIL" }, update:{}, create:{ name:"Soil",        tag:"SOIL" } }), 
  ]); 

  // Locations 
  const locs = await Promise.all([ 
    prisma.inventoryLocation.upsert({ where:{ code:"IGRN1" }, update:{}, create:{ code:"IGRN1", name:"Head Office"   } }), 
    prisma.inventoryLocation.upsert({ where:{ code:"IGRN2" }, update:{}, create:{ code:"IGRN2", name:"Kuliyapitiya"  } }), 
    prisma.inventoryLocation.upsert({ where:{ code:"IGRN3" }, update:{}, create:{ code:"IGRN3", name:"Nuwara Eliya"  } }), 
    prisma.inventoryLocation.upsert({ where:{ code:"IGRN4" }, update:{}, create:{ code:"IGRN4", name:"Peradeniya"    } }), 
  ]); 

  // Admin user (needed for movement created_by FK) 
  const role = await prisma.role.upsert({ where:{ role_id:1 }, update:{}, create:{ role_name:"Administrator" } }); 
  await prisma.user.upsert({ 
    where: { username:"admin" }, 
    update:{}, 
    create:{ role_id:role.role_id, full_name:"Admin User", username:"admin", password_hash:"placeholder" }, 
  }); 

  // Products 
  const fert = cats.find(c => c.tag === "FERT")!; 
  const p1 = await prisma.product.upsert({ 
    where:  { product_code:"FERT-0001" }, 
    update: {}, 
    create: { product_code:"FERT-0001", product_name:"AgriGold Fertilizer", pack_size:"25 kg", selling_price:2500, category_id:fert.category_id }, 
  }); 

  // Stock entries 
  await prisma.stock.upsert({ 
    where:  { stock_id:1 }, 
    update: {}, 
    create: { product_id:p1.product_id, location_id:locs[0].location_id, quantity_on_hand:120 }, 
  }); 

  console.log("✅ Seed complete"); 
} 

main().catch(console.error).finally(() => prisma.$disconnect()); 
