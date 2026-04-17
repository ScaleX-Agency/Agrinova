import "dotenv/config";
import { db } from "../lib/db";

async function renameRole() {
  console.log("🔄 Starting role rename process: 'chairman' -> 'admin'...");

  try {
    // 1. Check if the 'chairman' role exists
    const chairmanRole = await db.role.findFirst({
      where: {
        role_name: {
          equals: 'chairman',
          mode: 'insensitive'
        }
      }
    });

    if (!chairmanRole) {
      console.log("⚠️ No 'chairman' role found. It might have already been renamed or doesn't exist.");
      
      // Check if 'admin' already exists
      const adminRole = await db.role.findFirst({
        where: {
          role_name: {
            equals: 'admin',
            mode: 'insensitive'
          }
        }
      });
      
      if (adminRole) {
        console.log("✅ 'admin' role already exists.");
      } else {
        console.log("❌ Neither 'chairman' nor 'admin' roles were found. Please check your ROLE table.");
      }
      return;
    }

    // 2. Rename the role
    await db.role.update({
      where: { role_id: chairmanRole.role_id },
      data: { role_name: 'admin' }
    });

    console.log(`✅ Successfully renamed role ID ${chairmanRole.role_id} from '${chairmanRole.role_name}' to 'admin'.`);
    
  } catch (error) {
    console.error("❌ Error renaming role:");
    console.error(error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

renameRole();
