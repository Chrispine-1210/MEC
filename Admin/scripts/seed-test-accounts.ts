import bcrypt from "bcrypt";
import { storage } from "../server/storage";

async function createTestAccounts() {
  // Use MemStorage specific roles since we are in MemStorage mode
  const roles = ["admin", "editor", "viewer"];
  
  console.log("Seeding test accounts...");
  
  for (const role of roles) {
    const username = `${role}_test`;
    const password = `${role}123`;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
      const existing = await storage.getUserByUsername(username);
      if (!existing) {
        await storage.createUser({
          username,
          email: `${role}@test.com`,
          password: hashedPassword,
          firstName: role.charAt(0).toUpperCase() + role.slice(1),
          lastName: "Test",
          role: role as any,
        });
        console.log(`✅ Created ${role} account: ${username} / ${password}`);
      } else {
        console.log(`ℹ️ ${role} account already exists`);
      }
    } catch (error) {
      console.error(`❌ Error creating ${role} account:`, error);
    }
  }
  console.log("Seeding complete.");
  process.exit(0);
}

createTestAccounts().catch(console.error);
