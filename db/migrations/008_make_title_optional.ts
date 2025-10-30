// Migration: Make title column optional and non-unique
import { sql } from '../client.ts';

export async function up() {
    console.log('  Running migration: Make title optional and non-unique');

    // Drop the unique case-insensitive index
    await sql`
    DROP INDEX IF EXISTS idx_content_cards_title_lower
  `;
    console.log('  ✅ Dropped unique case-insensitive index on title');

    // Alter title column to allow NULL values
    await sql`
    ALTER TABLE content_cards 
    ALTER COLUMN title DROP NOT NULL
  `;
    console.log('  ✅ Made title column nullable');

    // Update existing empty string titles to NULL
    await sql`
    UPDATE content_cards 
    SET title = NULL 
    WHERE title = ''
  `;
    console.log('  ✅ Updated empty titles to NULL');

    console.log('  ✅ Title column is now optional and non-unique');
}

export async function down() {
    console.log('  Rolling back: Make title required and unique again');

    // Update NULL titles to empty string before making NOT NULL
    await sql`
    UPDATE content_cards 
    SET title = '' 
    WHERE title IS NULL
  `;

    // Make title NOT NULL again
    await sql`
    ALTER TABLE content_cards 
    ALTER COLUMN title SET NOT NULL
  `;

    // Recreate the unique case-insensitive index
    await sql`
    CREATE UNIQUE INDEX idx_content_cards_title_lower 
    ON content_cards (LOWER(title))
  `;

    console.log('  ✅ Restored title uniqueness and NOT NULL constraint');
}
