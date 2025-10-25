import { neon } from "@neon/serverless";

// Load environment variables
const DATABASE_URL = Deno.env.get("DATABASE_URL");

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create Neon client
export const sql = neon(DATABASE_URL);

// Test connection
export async function testConnection() {
  try {
    const result = await sql`SELECT NOW() as time`;
    console.log("✅ Database connected successfully at:", result[0].time);
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}
