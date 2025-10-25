// Migration: Add field_filters column to views table
import { sql } from '../client.ts';

export async function up() {
  console.log('  Running migration: Add field_filters column to views table');
  
  await sql`
    ALTER TABLE views 
    ADD COLUMN IF NOT EXISTS field_filters JSONB DEFAULT '[]'::jsonb
  `;
  
  console.log('  ✅ Added field_filters column to views table');
}

export async function down() {
  console.log('  Rolling back: Remove field_filters column from views table');
  
  await sql`
    ALTER TABLE views 
    DROP COLUMN IF EXISTS field_filters
  `;
  
  console.log('  ✅ Removed field_filters column from views table');
}
