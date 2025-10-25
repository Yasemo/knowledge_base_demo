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
