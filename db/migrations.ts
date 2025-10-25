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
  console.log("🌱 Seeding sample data...");

  try {
    // Get all existing schemas
    const existingSchemas = await sql`SELECT name FROM schemas`;
    const existingSchemaNames = existingSchemas.map((s: any) => s.name);
    
    console.log(`📋 Existing schemas: ${existingSchemaNames.join(', ') || 'none'}`);

    // Create sample tags (idempotent with ON CONFLICT)
    const tagData = [
      { name: "Frontend", color: "#e91e63" },
      { name: "Backend", color: "#9c27b0" },
      { name: "Database", color: "#3f51b5" },
      { name: "Bug", color: "#f44336" },
      { name: "Feature", color: "#4caf50" },
    ];

    const tagIds: Record<string, string> = {};
    for (const tag of tagData) {
      const result = await sql`
        INSERT INTO tags (name, color)
        VALUES (${tag.name}, ${tag.color})
        ON CONFLICT (name) DO UPDATE SET color = ${tag.color}
        RETURNING id
      `;
      tagIds[tag.name] = result[0].id;
    }
    console.log("✅ Sample tags created");

    // Create Task schema
    const taskSchema = {
      fields: [
        {
          name: "title",
          type: "text",
          label: "Task Title",
          description: "Brief description of the task",
          required: true,
          max_length: 200,
          display_order: 1,
        },
        {
          name: "priority",
          type: "select",
          label: "Priority Level",
          description: "Urgency of the task",
          required: true,
          options: [
            { value: "critical", label: "Critical", color: "#f44336" },
            { value: "high", label: "High", color: "#ff9800" },
            { value: "medium", label: "Medium", color: "#2196f3" },
            { value: "low", label: "Low", color: "#4caf50" },
          ],
          default_value: "medium",
          display_order: 2,
        },
        {
          name: "status",
          type: "select",
          label: "Status",
          description: "Current state of the task",
          required: true,
          options: [
            { value: "backlog", label: "Backlog", color: "#9e9e9e" },
            { value: "in_progress", label: "In Progress", color: "#2196f3" },
            { value: "review", label: "In Review", color: "#ff9800" },
            { value: "done", label: "Done", color: "#4caf50" },
            { value: "blocked", label: "Blocked", color: "#f44336" },
          ],
          default_value: "backlog",
          display_order: 3,
        },
        {
          name: "assignee",
          type: "text",
          label: "Assigned To",
          description: "Person responsible for this task",
          required: false,
          max_length: 100,
          display_order: 4,
        },
        {
          name: "due_date",
          type: "date",
          label: "Due Date",
          description: "When this task should be completed",
          required: false,
          display_order: 5,
        },
        {
          name: "content",
          type: "markdown",
          label: "Task Details",
          description: "Full description and details of the task",
          required: true,
          is_primary_content: true,
          display_order: 6,
        },
      ],
    };

    let schemaId: string;
    
    // Only create Task schema if it doesn't exist
    if (!existingSchemaNames.includes('Task')) {
      const schemaResult = await sql`
        INSERT INTO schemas (
          name, 
          description, 
          user_id, 
          field_definitions
        )
        VALUES (
          'Task',
          'A structured task with priority, status, and assignee tracking',
          gen_random_uuid(),
          ${JSON.stringify(taskSchema)}
        )
        RETURNING id
      `;
      schemaId = schemaResult[0].id;
      console.log("✅ Task schema created");
    } else {
      const existing = await sql`SELECT id FROM schemas WHERE name = 'Task'`;
      schemaId = existing[0].id;
      console.log("ℹ️  Task schema already exists, using existing");
    }

    // Create Note schema
    const noteSchema = {
      fields: [
        {
          name: "title",
          type: "text",
          label: "Note Title",
          description: "Title of the note",
          required: true,
          max_length: 150,
          display_order: 1,
        },
        {
          name: "category",
          type: "select",
          label: "Category",
          description: "Note category",
          required: false,
          options: [
            { value: "personal", label: "Personal", color: "#4caf50" },
            { value: "work", label: "Work", color: "#2196f3" },
            { value: "idea", label: "Idea", color: "#ff9800" },
            { value: "research", label: "Research", color: "#9c27b0" },
          ],
          display_order: 2,
        },
        {
          name: "content",
          type: "markdown",
          label: "Note Content",
          description: "Your note in markdown",
          required: true,
          is_primary_content: true,
          display_order: 3,
        },
      ],
    };

    let noteSchemaId: string;
    
    // Only create Note schema if it doesn't exist
    if (!existingSchemaNames.includes('Note')) {
      const noteSchemaResult = await sql`
        INSERT INTO schemas (name, description, user_id, field_definitions)
        VALUES ('Note', 'Quick notes and ideas', gen_random_uuid(), ${JSON.stringify(noteSchema)})
        RETURNING id
      `;
      noteSchemaId = noteSchemaResult[0].id;
      console.log("✅ Note schema created");
    } else {
      const existing = await sql`SELECT id FROM schemas WHERE name = 'Note'`;
      noteSchemaId = existing[0].id;
      console.log("ℹ️  Note schema already exists, using existing");
    }

    // Create Article schema
    const articleSchema = {
      fields: [
        {
          name: "title",
          type: "text",
          label: "Article Title",
          description: "Title of the article",
          required: true,
          max_length: 250,
          display_order: 1,
        },
        {
          name: "author",
          type: "text",
          label: "Author",
          description: "Article author",
          required: false,
          max_length: 100,
          display_order: 2,
        },
        {
          name: "published_date",
          type: "date",
          label: "Published Date",
          description: "When the article was published",
          required: false,
          display_order: 3,
        },
        {
          name: "url",
          type: "url",
          label: "Source URL",
          description: "Link to original article",
          required: false,
          display_order: 4,
        },
        {
          name: "content",
          type: "markdown",
          label: "Article Content",
          description: "Article summary or full content",
          required: true,
          is_primary_content: true,
          display_order: 5,
        },
      ],
    };

    let articleSchemaId: string;
    
    // Only create Article schema if it doesn't exist
    if (!existingSchemaNames.includes('Article')) {
      const articleSchemaResult = await sql`
        INSERT INTO schemas (name, description, user_id, field_definitions)
        VALUES ('Article', 'Articles and blog posts', gen_random_uuid(), ${JSON.stringify(articleSchema)})
        RETURNING id
      `;
      articleSchemaId = articleSchemaResult[0].id;
      console.log("✅ Article schema created");
    } else {
      const existing = await sql`SELECT id FROM schemas WHERE name = 'Article'`;
      articleSchemaId = existing[0].id;
      console.log("ℹ️  Article schema already exists, using existing");
    }

    // Create sample content cards for Tasks (only if Task schema was just created)
    const cards = [
      {
        data: {
          title: "Implement Content Card Refresh Mechanism",
          priority: "high",
          status: "in_progress",
          assignee: "Yaseen",
          due_date: "2024-03-01",
        },
        content: `## Task Description

Build the refresh mechanism for extension-generated content cards, allowing them to update their data from the original API source.

### Requirements

- Add refresh endpoint to backend API
- Store origin data for all extension cards
- Implement scheduling system for automatic refreshes
- Add UI button for manual refresh
- Handle refresh failures gracefully

### Technical Approach

The refresh system will query the \`origin_data\` field to get original API parameters, re-execute the API call, and update the card data.

### Acceptance Criteria

- [ ] Manual refresh works for all extension types
- [ ] Scheduled refreshes run reliably
- [ ] Error handling prevents data corruption
- [ ] UI shows last refresh timestamp`,
        tags: ["Backend", "Feature"],
      },
      {
        data: {
          title: "Design New UI Component Library",
          priority: "medium",
          status: "backlog",
          assignee: "Sarah",
          due_date: "2024-03-15",
        },
        content: `## Overview

Create a comprehensive UI component library following the New York Times design aesthetic.

### Components Needed

1. **Typography System** - Headers, body text, captions
2. **Card Components** - Various card layouts for content
3. **Form Elements** - Inputs, selects, textareas
4. **Navigation** - Header, footer, breadcrumbs
5. **Data Display** - Tables, lists, grids

### Design Guidelines

- Clean, minimal aesthetic
- Strong typography hierarchy
- Generous white space
- Accessible color contrast
- Responsive layouts`,
        tags: ["Frontend", "Feature"],
      },
      {
        data: {
          title: "Fix Database Connection Pool Leak",
          priority: "critical",
          status: "review",
          assignee: "Mike",
          due_date: "2024-02-28",
        },
        content: `## Bug Report

**Issue**: Database connection pool is not releasing connections properly, causing the application to hang after extended use.

**Symptoms**:
- Application becomes unresponsive after 2-3 hours
- Database shows max connections reached
- Server requires restart to recover

**Root Cause**: Missing \`finally\` blocks in database query handlers are preventing proper connection release.

**Fix Applied**:
\`\`\`javascript
try {
  const result = await db.query(sql);
  return result;
} finally {
  connection.release(); // Always release!
}
\`\`\`

**Testing**: Ran load tests for 6 hours with no issues.`,
        tags: ["Backend", "Database", "Bug"],
      },
    ];

    // Only add Task cards if Task schema was newly created
    if (!existingSchemaNames.includes('Task')) {
      for (const card of cards) {
        const cardResult = await sql`
          INSERT INTO content_cards (
            schema_id,
            schema_name,
            user_id,
            data,
            content
          )
          VALUES (
            ${schemaId},
            'Task',
            gen_random_uuid(),
            ${JSON.stringify(card.data)},
            ${card.content}
          )
          RETURNING id
        `;

        // Add tags to card
        for (const tagName of card.tags) {
          await sql`
            INSERT INTO card_tags (card_id, tag_id)
            VALUES (${cardResult[0].id}, ${tagIds[tagName]})
          `;
        }
      }
      console.log("✅ Task cards created");
    } else {
      console.log("ℹ️  Task cards already exist, skipping");
    }

    // Create sample notes
    const notes = [
      {
        data: {
          title: "Meeting Notes - Q1 Planning",
          category: "work",
        },
        content: `# Q1 Planning Meeting - Jan 15, 2024

## Attendees
- Sarah (Product Manager)
- Mike (Tech Lead)
- Yaseen (Full Stack Developer)

## Key Discussion Points

### Product Roadmap
- Launch new knowledge base feature by March
- Focus on user experience improvements
- Integrate AI-powered search

### Technical Priorities
1. Database optimization
2. API performance improvements
3. Frontend modernization

## Action Items
- [ ] Sarah: Draft product requirements document
- [ ] Mike: Prepare technical architecture proposal
- [ ] Yaseen: Research markdown rendering libraries

## Next Meeting
February 1, 2024 at 2 PM`,
        tags: ["Frontend", "Backend"],
      },
      {
        data: {
          title: "App Architecture Ideas",
          category: "idea",
        },
        content: `# Application Architecture Thoughts

## Current Challenges
- Monolithic structure making it hard to scale
- Database queries getting slower
- Frontend bundle size too large

## Proposed Solutions

### Microservices Architecture
Break down into smaller services:
- **Authentication Service** - Handle user auth
- **Content Service** - Manage cards and schemas
- **Search Service** - Full-text search with Elasticsearch

### Database Optimization
- Add read replicas for queries
- Implement caching layer with Redis
- Use materialized views for complex queries

### Frontend Improvements
- Code splitting by route
- Lazy loading components
- Use CDN for static assets

## Next Steps
Research and prototype these solutions`,
        tags: ["Feature"],
      },
    ];

    // Only add Note cards if Note schema was newly created
    if (!existingSchemaNames.includes('Note')) {
      for (const note of notes) {
        const noteResult = await sql`
          INSERT INTO content_cards (schema_id, schema_name, user_id, data, content)
          VALUES (${noteSchemaId}, 'Note', gen_random_uuid(), ${JSON.stringify(note.data)}, ${note.content})
          RETURNING id
        `;
        for (const tagName of note.tags) {
          await sql`
            INSERT INTO card_tags (card_id, tag_id)
            VALUES (${noteResult[0].id}, ${tagIds[tagName]})
          `;
        }
      }
      console.log("✅ Note cards created");
    } else {
      console.log("ℹ️  Note cards already exist, skipping");
    }

    // Create sample articles
    const articles = [
      {
        data: {
          title: "The Future of Web Development",
          author: "Jane Developer",
          published_date: "2024-01-10",
          url: "https://example.com/future-of-web",
        },
        content: `# The Future of Web Development

The landscape of web development is evolving at an unprecedented pace. Here's what to watch for in 2024 and beyond.

## Key Trends

### Server Components
React Server Components are changing how we think about rendering. By executing components on the server, we can:
- Reduce client-side JavaScript
- Improve initial page load times
- Enable better data fetching patterns

### Edge Computing
Moving computation closer to users:
- **Cloudflare Workers** - Execute code at the edge
- **Vercel Edge Functions** - Deploy serverless at scale
- **Deno Deploy** - Modern JavaScript runtime

### Type Safety Everywhere
TypeScript adoption has reached critical mass:
- Better developer experience
- Fewer runtime errors
- Improved tooling and IDE support

## The Rise of Full-Stack Frameworks
Modern frameworks blur the line between frontend and backend:
- **Next.js** - React with server-side rendering
- **SvelteKit** - Svelte's full-stack solution
- **Remix** - Focused on web fundamentals

## Conclusion
The future is about better developer experience, improved performance, and stronger type safety. The tools are getting better, and the ecosystem is maturing.`,
        tags: ["Frontend"],
      },
      {
        data: {
          title: "Database Design Best Practices",
          author: "DB Expert",
          published_date: "2024-01-20",
          url: "https://example.com/db-design",
        },
        content: `# Database Design Best Practices

A well-designed database is the foundation of any successful application.

## Normalization Principles

### First Normal Form (1NF)
- Eliminate repeating groups
- Each column contains atomic values
- Each row is unique

### Second Normal Form (2NF)
- Meet 1NF requirements
- Remove partial dependencies
- All non-key attributes depend on the entire primary key

### Third Normal Form (3NF)
- Meet 2NF requirements
- Remove transitive dependencies
- Non-key attributes depend only on the primary key

## Indexing Strategies

### When to Use Indexes
✅ Columns frequently used in WHERE clauses
✅ Foreign key columns
✅ Columns used in JOIN operations
✅ Columns used in ORDER BY

### When to Avoid Indexes
❌ Tables with frequent writes
❌ Small tables (overhead not worth it)
❌ Columns with low cardinality

## Performance Tips
1. Use connection pooling
2. Implement query caching
3. Monitor slow query logs
4. Regular VACUUM on PostgreSQL
5. Consider read replicas for scaling

Remember: Premature optimization is the root of all evil. Profile first, then optimize.`,
        tags: ["Database", "Backend"],
      },
    ];

    // Only add Article cards if Article schema was newly created
    if (!existingSchemaNames.includes('Article')) {
      for (const article of articles) {
        const articleResult = await sql`
          INSERT INTO content_cards (schema_id, schema_name, user_id, data, content)
          VALUES (${articleSchemaId}, 'Article', gen_random_uuid(), ${JSON.stringify(article.data)}, ${article.content})
          RETURNING id
        `;
        for (const tagName of article.tags) {
          await sql`
            INSERT INTO card_tags (card_id, tag_id)
            VALUES (${articleResult[0].id}, ${tagIds[tagName]})
          `;
        }
      }
      console.log("✅ Article cards created");
    } else {
      console.log("ℹ️  Article cards already exist, skipping");
    }

    console.log("✅ Seed data complete");
    console.log("🎉 Seed data complete!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}
