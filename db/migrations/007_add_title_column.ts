// Migration: Add title column to content_cards for idempotency
import { sql } from '../client.ts';

export async function up() {
  console.log('  Running migration: Add title column to content_cards');
  
  // Add title column (NOT NULL with default empty string for existing rows)
  await sql`
    ALTER TABLE content_cards 
    ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT ''
  `;
  console.log('  ✅ Added title column');
  
  // Create case-insensitive unique index using LOWER()
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_content_cards_title_lower 
    ON content_cards (LOWER(title))
  `;
  console.log('  ✅ Added unique case-insensitive index on title');
  
  // Add regular index for performance on title lookups
  await sql`
    CREATE INDEX IF NOT EXISTS idx_content_cards_title 
    ON content_cards (title)
  `;
  console.log('  ✅ Added performance index on title');
  
  console.log('  ✅ Title column migration complete');
}

export async function down() {
  console.log('  Rolling back: Remove title column from content_cards');
  
  await sql`
    DROP INDEX IF EXISTS idx_content_cards_title
  `;
  
  await sql`
    DROP INDEX IF EXISTS idx_content_cards_title_lower
  `;
  
  await sql`
    ALTER TABLE content_cards 
    DROP COLUMN IF EXISTS title
  `;
  
  console.log('  ✅ Removed title column and indexes');
}
