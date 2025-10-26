import { sql } from './client.ts';

interface Migration {
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

// Track which migrations have been run
async function createMigrationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// Get list of applied migrations
async function getAppliedMigrations(): Promise<string[]> {
  const result = await sql`
    SELECT migration_name FROM schema_migrations ORDER BY id
  `;
  return result.map((row: any) => row.migration_name);
}

// Mark migration as applied
async function markMigrationApplied(name: string) {
  await sql`
    INSERT INTO schema_migrations (migration_name)
    VALUES (${name})
    ON CONFLICT (migration_name) DO NOTHING
  `;
}

// Run pending migrations
export async function runPendingMigrations() {
  console.log('🔄 Checking for pending migrations...');
  
  // Ensure migrations tracking table exists
  await createMigrationsTable();
  
  // Get list of already applied migrations
  const appliedMigrations = await getAppliedMigrations();
  
  // Load all migration files from the migrations folder
  const migrations: Migration[] = [];
  
  try {
    // Import migration files
    const migration007 = await import('./migrations/007_add_title_column.ts');
    migrations.push({
      name: '007_add_title_column',
      up: migration007.up,
      down: migration007.down,
    });
  } catch (error) {
    console.log('  ℹ️  Error loading migrations:', error);
  }
  
  // Filter out already applied migrations
  const pendingMigrations = migrations.filter(
    m => !appliedMigrations.includes(m.name)
  );
  
  if (pendingMigrations.length === 0) {
    console.log('✅ All migrations up to date');
    return;
  }
  
  console.log(`📋 Found ${pendingMigrations.length} pending migration(s)`);
  
  // Run each pending migration
  for (const migration of pendingMigrations) {
    try {
      console.log(`\n🔄 Running migration: ${migration.name}`);
      await migration.up();
      await markMigrationApplied(migration.name);
      console.log(`✅ Migration ${migration.name} completed`);
    } catch (error) {
      console.error(`❌ Migration ${migration.name} failed:`, error);
      throw error;
    }
  }
  
  console.log('\n✅ All pending migrations completed successfully\n');
}
