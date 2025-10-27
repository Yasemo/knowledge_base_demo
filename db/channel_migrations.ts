import { sql } from "./client.ts";

export async function runChannelMigrations() {
  console.log("🔄 Running channel migrations...");

  try {
    // Create channels table
    await sql`
      CREATE TABLE IF NOT EXISTS channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        connection_string TEXT UNIQUE NOT NULL,
        user_id UUID NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log("✅ Channels table created");

    // Create channel_messages table
    await sql`
      CREATE TABLE IF NOT EXISTS channel_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
        sender_type TEXT NOT NULL CHECK (sender_type IN ('kb', 'client', 'assistant')),
        sender_identifier TEXT NOT NULL,
        message TEXT NOT NULL,
        has_mention BOOLEAN DEFAULT false,
        parent_message_id UUID REFERENCES channel_messages(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log("✅ Channel messages table created");

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_channels_connection_string ON channels(connection_string)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_channels_user_id ON channels(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_channel_messages_channel_id ON channel_messages(channel_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_channel_messages_created_at ON channel_messages(created_at)`;
    console.log("✅ Channel indexes created");

    console.log("✅ All channel migrations completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Channel migration failed:", error);
    throw error;
  }
}
