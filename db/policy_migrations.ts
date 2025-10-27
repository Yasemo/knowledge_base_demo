import { sql } from "./client.ts";

export async function runPolicyMigrations() {
  console.log("🔄 Running connection policy migrations...");

  try {
    // Create connection_policies table
    await sql`
      CREATE TABLE IF NOT EXISTS connection_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        policy_type TEXT NOT NULL CHECK (policy_type IN ('output', 'input')),
        connection_string TEXT UNIQUE NOT NULL,
        user_id UUID NOT NULL,
        
        -- For output policies
        view_ids UUID[],
        
        -- For input policies
        schema_id UUID REFERENCES schemas(id) ON DELETE SET NULL,
        tag_ids UUID[],
        
        -- Lifecycle management
        duration_days INTEGER,
        expires_at TIMESTAMPTZ,
        refresh_schedule TEXT CHECK (refresh_schedule IN ('manual', 'hourly', 'daily', 'weekly')),
        last_refreshed_at TIMESTAMPTZ,
        
        -- Status
        is_active BOOLEAN DEFAULT true,
        
        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log("✅ Connection policies table created");

    // Create policy_access_log table
    await sql`
      CREATE TABLE IF NOT EXISTS policy_access_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        policy_id UUID REFERENCES connection_policies(id) ON DELETE CASCADE,
        client_identifier TEXT,
        access_type TEXT CHECK (access_type IN ('fetch', 'send', 'validate')),
        accessed_at TIMESTAMPTZ DEFAULT NOW(),
        cards_count INTEGER DEFAULT 0,
        success BOOLEAN DEFAULT true,
        error_message TEXT
      )
    `;
    console.log("✅ Policy access log table created");

    // Create policy_webhooks table for push notifications
    await sql`
      CREATE TABLE IF NOT EXISTS policy_webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        policy_id UUID REFERENCES connection_policies(id) ON DELETE CASCADE,
        webhook_url TEXT NOT NULL,
        client_identifier TEXT,
        is_active BOOLEAN DEFAULT true,
        last_ping_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(policy_id, webhook_url)
      )
    `;
    console.log("✅ Policy webhooks table created");

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_policies_connection_string ON connection_policies(connection_string)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_policies_user_id ON connection_policies(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_policies_expires_at ON connection_policies(expires_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_access_log_policy_id ON policy_access_log(policy_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_webhooks_policy_id ON policy_webhooks(policy_id)`;
    console.log("✅ Policy indexes created");

    // Add every_minute to refresh_schedule constraint
    try {
      await sql`
        ALTER TABLE connection_policies 
        DROP CONSTRAINT IF EXISTS connection_policies_refresh_schedule_check
      `;
      await sql`
        ALTER TABLE connection_policies 
        ADD CONSTRAINT connection_policies_refresh_schedule_check 
        CHECK (refresh_schedule IN ('manual', 'every_minute', 'hourly', 'daily', 'weekly'))
      `;
      console.log("✅ Updated refresh_schedule constraint to include 'every_minute'");
    } catch (err) {
      console.log("ℹ️ Refresh schedule constraint already updated or doesn't need updating");
    }

    console.log("✅ All policy migrations completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Policy migration failed:", error);
    throw error;
  }
}
