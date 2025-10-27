import { sql } from "./client.ts";

// ========== SCHEMAS ==========

export async function getAllSchemas() {
  return await sql`
    SELECT * FROM schemas
    ORDER BY created_at DESC
  `;
}

export async function getSchemaById(id: string) {
  const result = await sql`
    SELECT * FROM schemas
    WHERE id = ${id}
  `;
  return result[0] || null;
}

export async function createSchema(data: {
  name: string;
  description?: string;
  field_definitions: object;
}) {
  const result = await sql`
    INSERT INTO schemas (name, description, user_id, field_definitions)
    VALUES (${data.name}, ${data.description || null}, gen_random_uuid(), ${JSON.stringify(data.field_definitions)})
    RETURNING *
  `;
  return result[0];
}

export async function updateSchema(id: string, data: {
  name?: string;
  description?: string;
  field_definitions?: object;
}) {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.field_definitions !== undefined) {
    updates.push(`field_definitions = $${paramIndex++}`);
    values.push(JSON.stringify(data.field_definitions));
  }

  updates.push(`updated_at = NOW()`);

  const result = await sql`
    UPDATE schemas
    SET name = ${data.name || sql`name`},
        description = ${data.description !== undefined ? data.description : sql`description`},
        field_definitions = ${data.field_definitions ? JSON.stringify(data.field_definitions) : sql`field_definitions`},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] || null;
}

export async function deleteSchema(id: string) {
  await sql`DELETE FROM schemas WHERE id = ${id}`;
  return true;
}

// ========== CONTENT CARDS ==========

export async function getAllCards(tagIds?: string[]) {
  if (!tagIds || tagIds.length === 0) {
    // No tag filtering
    return await sql`
      SELECT 
        c.*,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name, 'color', t.color)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM content_cards c
      LEFT JOIN card_tags ct ON c.id = ct.card_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
  } else {
    // AND filtering: card must have ALL specified tags
    return await sql`
      SELECT 
        c.*,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name, 'color', t.color)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM content_cards c
      LEFT JOIN card_tags ct ON c.id = ct.card_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.id IN (
        SELECT card_id
        FROM card_tags
        WHERE tag_id = ANY(${tagIds})
        GROUP BY card_id
        HAVING COUNT(DISTINCT tag_id) = ${tagIds.length}
      )
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
  }
}

export async function getCardById(id: string) {
  const result = await sql`
    SELECT 
      c.*,
      COALESCE(
        json_agg(
          json_build_object('id', t.id, 'name', t.name, 'color', t.color)
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) as tags
    FROM content_cards c
    LEFT JOIN card_tags ct ON c.id = ct.card_id
    LEFT JOIN tags t ON ct.tag_id = t.id
    WHERE c.id = ${id}
    GROUP BY c.id
  `;
  return result[0] || null;
}

export async function createCard(data: {
  schema_id: string;
  schema_name: string;
  data: object;
  content: string;
  tag_ids?: string[];
}) {
  const result = await sql`
    INSERT INTO content_cards (
      schema_id, schema_name, user_id, data, content
    )
    VALUES (
      ${data.schema_id}, 
      ${data.schema_name}, 
      gen_random_uuid(), 
      ${JSON.stringify(data.data)}, 
      ${data.content}
    )
    RETURNING *
  `;

  const card = result[0];

  // Add tags if provided
  if (data.tag_ids && data.tag_ids.length > 0) {
    for (const tagId of data.tag_ids) {
      await sql`
        INSERT INTO card_tags (card_id, tag_id)
        VALUES (${card.id}, ${tagId})
        ON CONFLICT DO NOTHING
      `;
    }
  }

  return await getCardById(card.id);
}

export async function updateCard(id: string, data: {
  data?: object;
  content?: string;
  tag_ids?: string[];
}) {
  // Update card data
  await sql`
    UPDATE content_cards
    SET data = ${data.data ? JSON.stringify(data.data) : sql`data`},
        content = ${data.content !== undefined ? data.content : sql`content`},
        updated_at = NOW()
    WHERE id = ${id}
  `;

  // Update tags if provided
  if (data.tag_ids !== undefined) {
    // Remove all existing tags
    await sql`DELETE FROM card_tags WHERE card_id = ${id}`;

    // Add new tags
    for (const tagId of data.tag_ids) {
      await sql`
        INSERT INTO card_tags (card_id, tag_id)
        VALUES (${id}, ${tagId})
        ON CONFLICT DO NOTHING
      `;
    }
  }

  return await getCardById(id);
}

export async function deleteCard(id: string) {
  await sql`DELETE FROM content_cards WHERE id = ${id}`;
  return true;
}

// ========== TAGS ==========

export async function getAllTags() {
  return await sql`
    SELECT * FROM tags
    ORDER BY name ASC
  `;
}

export async function getTagById(id: string) {
  const result = await sql`
    SELECT * FROM tags
    WHERE id = ${id}
  `;
  return result[0] || null;
}

export async function createTag(data: {
  name: string;
  color: string;
}) {
  const result = await sql`
    INSERT INTO tags (name, color)
    VALUES (${data.name}, ${data.color})
    RETURNING *
  `;
  return result[0];
}

export async function updateTag(id: string, data: {
  name?: string;
  color?: string;
}) {
  const result = await sql`
    UPDATE tags
    SET name = ${data.name !== undefined ? data.name : sql`name`},
        color = ${data.color !== undefined ? data.color : sql`color`}
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] || null;
}

export async function deleteTag(id: string) {
  await sql`DELETE FROM tags WHERE id = ${id}`;
  return true;
}

// ========== VIEWS ==========

export async function getAllViews() {
  return await sql`
    SELECT * FROM views
    ORDER BY created_at DESC
  `;
}

export async function getViewById(id: string) {
  const result = await sql`
    SELECT * FROM views
    WHERE id = ${id}
  `;
  return result[0] || null;
}

export async function createView(data: {
  name: string;
  description?: string;
  schema_id?: string;
  tag_ids?: string[];
  field_filters?: any[];
}) {
  const result = await sql`
    INSERT INTO views (name, description, user_id, schema_id, tag_ids, field_filters)
    VALUES (
      ${data.name},
      ${data.description || null},
      gen_random_uuid(),
      ${data.schema_id || null},
      ${data.tag_ids || []},
      ${JSON.stringify(data.field_filters || [])}
    )
    RETURNING *
  `;
  return result[0];
}

export async function updateView(id: string, data: {
  name?: string;
  description?: string;
  schema_id?: string;
  tag_ids?: string[];
  field_filters?: any[];
}) {
  const result = await sql`
    UPDATE views
    SET name = ${data.name !== undefined ? data.name : sql`name`},
        description = ${data.description !== undefined ? data.description : sql`description`},
        schema_id = ${data.schema_id !== undefined ? data.schema_id : sql`schema_id`},
        tag_ids = ${data.tag_ids !== undefined ? data.tag_ids : sql`tag_ids`},
        field_filters = ${data.field_filters !== undefined ? JSON.stringify(data.field_filters) : sql`field_filters`},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] || null;
}

export async function deleteView(id: string) {
  await sql`DELETE FROM views WHERE id = ${id}`;
  return true;
}

// ========== CONNECTION POLICIES ==========

export async function getAllPolicies() {
  return await sql`
    SELECT * FROM connection_policies
    ORDER BY created_at DESC
  `;
}

export async function getPolicyById(id: string) {
  const result = await sql`
    SELECT * FROM connection_policies
    WHERE id = ${id}
  `;
  return result[0] || null;
}

export async function getPolicyByConnectionString(connectionString: string) {
  const result = await sql`
    SELECT * FROM connection_policies
    WHERE connection_string = ${connectionString}
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  `;
  return result[0] || null;
}

function generateConnectionString(username: string): string {
  const randomPart = crypto.randomUUID().replace(/-/g, '');
  return `kb_${username}_${randomPart}`;
}

export async function createPolicy(data: {
  name: string;
  description?: string;
  policy_type: 'output' | 'input';
  username: string;
  view_ids?: string[];
  schema_id?: string;
  tag_ids?: string[];
  duration_days?: number;
  refresh_schedule?: string;
}) {
  const connectionString = generateConnectionString(data.username);
  const expiresAt = data.duration_days 
    ? new Date(Date.now() + data.duration_days * 24 * 60 * 60 * 1000)
    : null;

  const result = await sql`
    INSERT INTO connection_policies (
      name, description, policy_type, connection_string, user_id,
      view_ids, schema_id, tag_ids, duration_days, expires_at, refresh_schedule
    )
    VALUES (
      ${data.name},
      ${data.description || null},
      ${data.policy_type},
      ${connectionString},
      gen_random_uuid(),
      ${data.view_ids || []},
      ${data.schema_id || null},
      ${data.tag_ids || []},
      ${data.duration_days || null},
      ${expiresAt},
      ${data.refresh_schedule || 'manual'}
    )
    RETURNING *
  `;
  return result[0];
}

export async function updatePolicy(id: string, data: {
  name?: string;
  description?: string;
  view_ids?: string[];
  schema_id?: string;
  tag_ids?: string[];
  duration_days?: number;
  refresh_schedule?: string;
  is_active?: boolean;
}) {
  // Get current policy to preserve unchanged values
  const current = await getPolicyById(id);
  if (!current) return null;
  
  const expiresAt = data.duration_days 
    ? new Date(Date.now() + data.duration_days * 24 * 60 * 60 * 1000)
    : (data.duration_days === null ? null : current.expires_at);

  const result = await sql`
    UPDATE connection_policies
    SET name = ${data.name !== undefined ? data.name : current.name},
        description = ${data.description !== undefined ? data.description : current.description},
        view_ids = ${data.view_ids !== undefined ? data.view_ids : current.view_ids},
        schema_id = ${data.schema_id !== undefined ? data.schema_id : current.schema_id},
        tag_ids = ${data.tag_ids !== undefined ? data.tag_ids : current.tag_ids},
        duration_days = ${data.duration_days !== undefined ? data.duration_days : current.duration_days},
        expires_at = ${expiresAt},
        refresh_schedule = ${data.refresh_schedule !== undefined ? data.refresh_schedule : current.refresh_schedule},
        is_active = ${data.is_active !== undefined ? data.is_active : current.is_active},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] || null;
}

export async function regeneratePolicyConnectionString(id: string, username: string) {
  const newConnectionString = generateConnectionString(username);
  const result = await sql`
    UPDATE connection_policies
    SET connection_string = ${newConnectionString},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] || null;
}

export async function deletePolicy(id: string) {
  await sql`DELETE FROM connection_policies WHERE id = ${id}`;
  return true;
}

export async function getCardsByViewIds(viewIds: string[]) {
  if (!viewIds || viewIds.length === 0) {
    return [];
  }

  console.log("🔍 getCardsByViewIds: Fetching cards for view IDs:", viewIds);

  // Get all views
  const views = await sql`
    SELECT * FROM views
    WHERE id = ANY(${viewIds})
  `;

  if (views.length === 0) {
    console.log("❌ No views found for IDs:", viewIds);
    return [];
  }

  console.log(`✓ Found ${views.length} view(s)`);

  // Get cards matching each view and combine results
  const allCards = new Map(); // Use map to deduplicate by card ID

  for (const view of views) {
    console.log(`\n🔍 Processing view: "${view.name}" (ID: ${view.id})`);
    console.log("  - Schema ID:", view.schema_id || "none");
    console.log("  - Tag IDs:", view.tag_ids || []);
    console.log("  - Field Filters:", view.field_filters || []);

    // Start with all cards if no filters, or apply filters
    let viewCards;

    const hasSchemaFilter = view.schema_id;
    const hasTagFilter = view.tag_ids && view.tag_ids.length > 0;
    const hasFieldFilters = view.field_filters && view.field_filters.length > 0;

    if (!hasSchemaFilter && !hasTagFilter && !hasFieldFilters) {
      // No filters - return ALL cards
      console.log("  ℹ️ No filters - returning all cards");
      viewCards = await sql`
        SELECT 
          c.*,
          COALESCE(
            json_agg(
              json_build_object('id', t.id, 'name', t.name, 'color', t.color)
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'
          ) as tags
        FROM content_cards c
        LEFT JOIN card_tags ct ON c.id = ct.card_id
        LEFT JOIN tags t ON ct.tag_id = t.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `;
    } else {
      // Apply filters based on what's available
      if (hasSchemaFilter && hasTagFilter) {
        // Both schema and tag filters
        viewCards = await sql`
          SELECT 
            c.*,
            COALESCE(
              json_agg(
                json_build_object('id', t.id, 'name', t.name, 'color', t.color)
              ) FILTER (WHERE t.id IS NOT NULL),
              '[]'
            ) as tags
          FROM content_cards c
          LEFT JOIN card_tags ct ON c.id = ct.card_id
          LEFT JOIN tags t ON ct.tag_id = t.id
          WHERE c.schema_id = ${view.schema_id}
          AND c.id IN (
            SELECT card_id
            FROM card_tags
            WHERE tag_id = ANY(${view.tag_ids})
            GROUP BY card_id
            HAVING COUNT(DISTINCT tag_id) = ${view.tag_ids.length}
          )
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `;
      } else if (hasSchemaFilter) {
        // Schema filter only
        viewCards = await sql`
          SELECT 
            c.*,
            COALESCE(
              json_agg(
                json_build_object('id', t.id, 'name', t.name, 'color', t.color)
              ) FILTER (WHERE t.id IS NOT NULL),
              '[]'
            ) as tags
          FROM content_cards c
          LEFT JOIN card_tags ct ON c.id = ct.card_id
          LEFT JOIN tags t ON ct.tag_id = t.id
          WHERE c.schema_id = ${view.schema_id}
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `;
      } else if (hasTagFilter) {
        // Tag filter only
        viewCards = await sql`
          SELECT 
            c.*,
            COALESCE(
              json_agg(
                json_build_object('id', t.id, 'name', t.name, 'color', t.color)
              ) FILTER (WHERE t.id IS NOT NULL),
              '[]'
            ) as tags
          FROM content_cards c
          LEFT JOIN card_tags ct ON c.id = ct.card_id
          LEFT JOIN tags t ON ct.tag_id = t.id
          WHERE c.id IN (
            SELECT card_id
            FROM card_tags
            WHERE tag_id = ANY(${view.tag_ids})
            GROUP BY card_id
            HAVING COUNT(DISTINCT tag_id) = ${view.tag_ids.length}
          )
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `;
      } else {
        // Only field filters - get all cards first
        viewCards = await sql`
          SELECT 
            c.*,
            COALESCE(
              json_agg(
                json_build_object('id', t.id, 'name', t.name, 'color', t.color)
              ) FILTER (WHERE t.id IS NOT NULL),
              '[]'
            ) as tags
          FROM content_cards c
          LEFT JOIN card_tags ct ON c.id = ct.card_id
          LEFT JOIN tags t ON ct.tag_id = t.id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `;
      }

      // Apply field filters in JavaScript (since they're dynamic)
      if (hasFieldFilters && viewCards.length > 0) {
        console.log(`  🔍 Applying ${view.field_filters.length} field filter(s)`);
        viewCards = viewCards.filter((card: any) => {
          for (const filter of view.field_filters) {
            const fieldValue = card.data[filter.field_name];
            const filterValue = filter.value;

            switch (filter.operator) {
              case 'equals':
                if (fieldValue !== filterValue) return false;
                break;
              case 'contains':
                if (!String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase())) return false;
                break;
              case 'greater_than':
                if (!(Number(fieldValue) > Number(filterValue))) return false;
                break;
              case 'less_than':
                if (!(Number(fieldValue) < Number(filterValue))) return false;
                break;
              default:
                console.log(`  ⚠️ Unknown filter operator: ${filter.operator}`);
            }
          }
          return true;
        });
      }
    }

    console.log(`  ✓ View "${view.name}" matched ${viewCards.length} card(s)`);

    // Add cards to result map (deduplicates)
    for (const card of viewCards) {
      allCards.set(card.id, card);
    }
  }

  const result = Array.from(allCards.values());
  console.log(`\n✅ Total unique cards from all views: ${result.length}`);
  
  return result;
}

export async function logPolicyAccess(data: {
  policy_id: string;
  client_identifier?: string;
  access_type: 'fetch' | 'send' | 'validate';
  cards_count?: number;
  success?: boolean;
  error_message?: string;
}) {
  await sql`
    INSERT INTO policy_access_log (
      policy_id, client_identifier, access_type, 
      cards_count, success, error_message
    )
    VALUES (
      ${data.policy_id},
      ${data.client_identifier || null},
      ${data.access_type},
      ${data.cards_count || 0},
      ${data.success !== false},
      ${data.error_message || null}
    )
  `;
}

export async function registerWebhook(data: {
  policy_id: string;
  webhook_url: string;
  client_identifier?: string;
}) {
  const result = await sql`
    INSERT INTO policy_webhooks (policy_id, webhook_url, client_identifier)
    VALUES (${data.policy_id}, ${data.webhook_url}, ${data.client_identifier || null})
    ON CONFLICT (policy_id, webhook_url) 
    DO UPDATE SET 
      is_active = true,
      client_identifier = ${data.client_identifier || null}
    RETURNING *
  `;
  return result[0];
}

export async function getWebhooksByPolicyId(policyId: string) {
  return await sql`
    SELECT * FROM policy_webhooks
    WHERE policy_id = ${policyId}
    AND is_active = true
  `;
}

export async function updateWebhookPing(webhookId: string) {
  await sql`
    UPDATE policy_webhooks
    SET last_ping_at = NOW()
    WHERE id = ${webhookId}
  `;
}
