import { sql } from "./client.ts";

// ========== CHANNELS ==========

export async function getAllChannels() {
  return await sql`
    SELECT * FROM channels
    ORDER BY created_at DESC
  `;
}

export async function getChannelById(id: string) {
  const result = await sql`
    SELECT * FROM channels
    WHERE id = ${id}
  `;
  return result[0] || null;
}

export async function getChannelByConnectionString(connectionString: string) {
  const result = await sql`
    SELECT * FROM channels
    WHERE connection_string = ${connectionString}
    AND is_active = true
  `;
  return result[0] || null;
}

function generateChannelConnectionString(username: string): string {
  const randomPart = crypto.randomUUID().replace(/-/g, '');
  return `ch_${username}_${randomPart}`;
}

export async function createChannel(data: {
  name: string;
  description?: string;
  username: string;
}) {
  const connectionString = generateChannelConnectionString(data.username);
  
  const result = await sql`
    INSERT INTO channels (name, description, connection_string, user_id)
    VALUES (
      ${data.name},
      ${data.description || null},
      ${connectionString},
      gen_random_uuid()
    )
    RETURNING *
  `;
  return result[0];
}

export async function updateChannel(id: string, data: {
  name?: string;
  description?: string;
  is_active?: boolean;
}) {
  const current = await getChannelById(id);
  if (!current) return null;
  
  const result = await sql`
    UPDATE channels
    SET name = ${data.name !== undefined ? data.name : current.name},
        description = ${data.description !== undefined ? data.description : current.description},
        is_active = ${data.is_active !== undefined ? data.is_active : current.is_active},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] || null;
}

export async function deleteChannel(id: string) {
  await sql`DELETE FROM channels WHERE id = ${id}`;
  return true;
}

// ========== CHANNEL MESSAGES ==========

export async function getChannelMessages(channelId: string, limit = 100) {
  return await sql`
    SELECT * FROM channel_messages
    WHERE channel_id = ${channelId}
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
}

export async function getRecentChannelMessages(channelId: string, since: Date) {
  return await sql`
    SELECT * FROM channel_messages
    WHERE channel_id = ${channelId}
    AND created_at > ${since}
    ORDER BY created_at ASC
  `;
}

export async function createChannelMessage(data: {
  channel_id: string;
  sender_type: 'kb' | 'client' | 'assistant';
  sender_identifier: string;
  message: string;
  has_mention?: boolean;
  parent_message_id?: string;
}) {
  const result = await sql`
    INSERT INTO channel_messages (
      channel_id, sender_type, sender_identifier, message,
      has_mention, parent_message_id
    )
    VALUES (
      ${data.channel_id},
      ${data.sender_type},
      ${data.sender_identifier},
      ${data.message},
      ${data.has_mention || false},
      ${data.parent_message_id || null}
    )
    RETURNING *
  `;
  return result[0];
}

export async function deleteChannelMessage(id: string) {
  await sql`DELETE FROM channel_messages WHERE id = ${id}`;
  return true;
}

export async function getConversationHistory(channelId: string, limit = 10) {
  return await sql`
    SELECT * FROM channel_messages
    WHERE channel_id = ${channelId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}
