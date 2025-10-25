// Migration: Add field_filters column to views table
import { sql } from './db/client.ts';

async function runMigration() {
  console.log('🔄 Running migration: Add field_filters column to views table...');
  
  try {
    // Load environment variables from .env file
    try {
      const envContent = await Deno.readTextFile(".env");
      for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valueParts] = trimmed.split("=");
          const value = valueParts.join("=");
          if (key && value) {
            Deno.env.set(key.trim(), value.trim());
          }
        }
      }
    } catch {
      console.log("No .env file found, using system environment variables");
    }

    // Add the field_filters column if it doesn't exist
    await sql`
      ALTER TABLE views 
      ADD COLUMN IF NOT EXISTS field_filters JSONB DEFAULT '[]'::jsonb
    `;
    
    console.log('✅ Successfully added field_filters column to views table');
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    Deno.exit(1);
  }
  
  Deno.exit(0);
}

runMigration();
