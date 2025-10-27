import { sql } from "./client.ts";

export async function runMigrations() {
  console.log("🔄 Running database migrations...");

  try {
    // Create schemas table
    await sql`
      CREATE TABLE IF NOT EXISTS schemas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        user_id UUID NOT NULL,
        organization_id UUID,
        is_extension BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        field_definitions JSONB NOT NULL
      )
    `;
    console.log("✅ Schemas table created");

    // Create content_cards table
    await sql`
      CREATE TABLE IF NOT EXISTS content_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        schema_id UUID REFERENCES schemas(id) ON DELETE CASCADE,
        schema_name TEXT NOT NULL,
        user_id UUID NOT NULL,
        project_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        last_refreshed_at TIMESTAMPTZ,
        is_refreshable BOOLEAN DEFAULT false,
        token_count INTEGER,
        data JSONB NOT NULL,
        content TEXT NOT NULL,
        origin_data JSONB,
        metadata JSONB
      )
    `;
    console.log("✅ Content cards table created");

    // Create tags table
    await sql`
      CREATE TABLE IF NOT EXISTS tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        color TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log("✅ Tags table created");

    // Create card_tags junction table
    await sql`
      CREATE TABLE IF NOT EXISTS card_tags (
        card_id UUID REFERENCES content_cards(id) ON DELETE CASCADE,
        tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (card_id, tag_id)
      )
    `;
    console.log("✅ Card-tags junction table created");

    // Create views table
    await sql`
      CREATE TABLE IF NOT EXISTS views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        user_id UUID NOT NULL,
        schema_id UUID REFERENCES schemas(id) ON DELETE SET NULL,
        tag_ids UUID[],
        field_filters JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log("✅ Views table created");

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_cards_schema_id ON content_cards(schema_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_card_tags_card_id ON card_tags(card_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_card_tags_tag_id ON card_tags(tag_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_views_user_id ON views(user_id)`;
    console.log("✅ Indexes created");

    console.log("✅ All migrations completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

export async function seedData() {
  console.log("🌱 Seeding sample data from JSON file...");

  try {
    // Load seed data from JSON file
    const seedDataText = await Deno.readTextFile("./db/seed-data.json");
    const seedData = JSON.parse(seedDataText);
    
    console.log(`📋 Loaded seed data with ${seedData.tags.length} tags, ${Object.keys(seedData.schemas).length} schemas, ${seedData.cards.length} cards`);

    // Get all existing schemas
    const existingSchemas = await sql`SELECT name FROM schemas`;
    const existingSchemaNames = existingSchemas.map((s: any) => s.name);
    
    console.log(`📋 Existing schemas: ${existingSchemaNames.join(', ') || 'none'}`);

    // Create tags (idempotent with ON CONFLICT)
    const tagIds: Record<string, string> = {};
    for (const tag of seedData.tags) {
      const result = await sql`
        INSERT INTO tags (name, color)
        VALUES (${tag.name}, ${tag.color})
        ON CONFLICT (name) DO UPDATE SET color = ${tag.color}
        RETURNING id
      `;
      tagIds[tag.name] = result[0].id;
    }
    console.log("✅ Sample tags created");

    // Create schemas from JSON data
    const schemaIdMap: Record<string, string> = {};
    
    for (const [schemaName, schemaConfig] of Object.entries(seedData.schemas)) {
      const config = schemaConfig as any;
      
      if (!existingSchemaNames.includes(schemaName)) {
        const schemaResult = await sql`
          INSERT INTO schemas (name, description, user_id, field_definitions)
          VALUES (
            ${config.name},
            ${config.description},
            gen_random_uuid(),
            ${JSON.stringify(config.field_definitions)}
          )
          RETURNING id
        `;
        schemaIdMap[schemaName] = schemaResult[0].id;
        console.log(`✅ ${schemaName} schema created`);
      } else {
        const existing = await sql`SELECT id FROM schemas WHERE name = ${schemaName}`;
        schemaIdMap[schemaName] = existing[0].id;
        console.log(`ℹ️  ${schemaName} schema already exists, using existing`);
      }
    }

    // Create content cards from JSON data
    for (const card of seedData.cards) {
      const schemaId = schemaIdMap[card.schema_name];
      
      if (!schemaId) {
        console.warn(`⚠️  Skipping card "${card.data.title}" - schema "${card.schema_name}" not found`);
        continue;
      }
      
      // Check if we should skip based on existing schema
      if (existingSchemaNames.includes(card.schema_name)) {
        console.log(`ℹ️  Skipping card "${card.data.title}" - ${card.schema_name} cards already exist`);
        continue;
      }
      
      // Insert the card
      const cardResult = await sql`
        INSERT INTO content_cards (schema_id, schema_name, user_id, data, content, title)
        VALUES (
          ${schemaId},
          ${card.schema_name},
          gen_random_uuid(),
          ${JSON.stringify(card.data)},
          ${card.content},
          ${card.data.title}
        )
        RETURNING id
      `;
      
      // Add tags to card
      if (card.tags && card.tags.length > 0) {
        for (const tagName of card.tags) {
          if (tagIds[tagName]) {
            await sql`
              INSERT INTO card_tags (card_id, tag_id)
              VALUES (${cardResult[0].id}, ${tagIds[tagName]})
              ON CONFLICT DO NOTHING
            `;
          }
        }
      }
      
      console.log(`✅ Created card: "${card.data.title}"`);
    }

    console.log("✅ All seed data loaded successfully");
    console.log("🎉 Seed data complete!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}
