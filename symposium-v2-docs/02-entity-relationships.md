# Entity Relationships

## Complete Entity-Relationship Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    SYMPOSIUM V2 DATA MODEL                    │
└──────────────────────────────────────────────────────────────┘

┌─────────────────┐           ┌─────────────────┐
│ integration_    │           │  integrations   │
│   types         │1 ────── ∞│                 │
│ (dev-defined)   │           │ (user instances)│
└─────────────────┘           └─────────────────┘
                                      │1
                              ┌───────┴───────┐
                              │               │
                              │∞              │∞
                      ┌───────▼────┐   ┌─────▼─────┐
                      │  sources   │   │  outputs  │
                      │            │   │           │
                      └────────────┘   └───────────┘
                              │1              │
                              │               │uses view filter
                              │∞              │
                      ┌───────▼────────┐     │
                      │ content_cards  │◄────┘
                      │                │
                      └────────────────┘
                              ▲│
                       creates││has
                              │▼1
                      ┌───────────────┐
                      │   queries     │
                      │               │
                      └───────────────┘
                              │uses
                              │∞
                      ┌───────▼────┐
                      │  sources   │
                      │ (reference)│
                      └────────────┘

┌─────────────────┐           ┌─────────────────┐
│   schemas       │1 ────── ∞│ content_cards   │
│                 │           │                 │
└─────────────────┘           └─────────────────┘
                                      │∞
                                      │has
                                      │∞
                              ┌───────▼────┐
                              │    tags    │
                              │            │
                              └────────────┘
                                      │∞
                                      │used in
                                      │∞
                              ┌───────▼────┐
                              │   views    │
                              │            │
                              └────────────┘
                                      │1
                                      │powers
                                      │1
                              ┌───────▼────────┐
                              │   showcases    │
                              │                │
                              └────────────────┘

┌─────────────────┐           ┌─────────────────┐
│   views         │1 ────── ∞│ connection_     │
│                 │           │   policies      │
└─────────────────┘           └─────────────────┘

┌─────────────────┐
│   executions    │
│ (history log)   │
└─────────────────┘
        ▲
        │records
        │
┌───────┴───────┬───────────┬──────────┐
│               │           │          │
│ sources       │ queries   │ outputs  │
│               │           │          │
└───────────────┴───────────┴──────────┘
```

## Core Entities

### 1. Integration Types

**Purpose**: Developer-defined blueprints for external services

```
integration_types
├── id (UUID, PK)
├── name (TEXT, UNIQUE)
├── display_name (TEXT)
├── category (TEXT)
├── description (TEXT)
├── icon (TEXT)
├── auth_schema (JSONB)
├── source_schema (JSONB)
├── output_schema (JSONB)
├── supports_scheduling (BOOLEAN)
├── supports_refresh (BOOLEAN)
├── rate_limit_per_minute (INTEGER)
├── handler_module (TEXT)
└── created_at (TIMESTAMPTZ)

Relationships:
  → Has Many: integrations (1:∞)

Indexes:
  - PRIMARY KEY (id)
  - UNIQUE (name)
```

**Data Example**:

```json
{
  "name": "perplexity",
  "display_name": "Perplexity AI",
  "category": "source",
  "auth_schema": {
    "fields": [
      {
        "name": "api_key",
        "type": "password",
        "label": "API Key",
        "required": true
      }
    ]
  },
  "source_schema": {
    "fields": [
      {
        "name": "query",
        "type": "textarea",
        "label": "Search Query"
      },
      {
        "name": "model",
        "type": "select",
        "options": [...]
      }
    ]
  }
}
```

### 2. Integrations

**Purpose**: User-created instances with credentials

```
integrations
├── id (UUID, PK)
├── user_id (UUID, NOT NULL)
├── type_id (UUID, FK → integration_types.id)
├── name (TEXT, NOT NULL)
├── credentials (JSONB, NOT NULL)
├── config (JSONB)
├── is_active (BOOLEAN)
├── last_used_at (TIMESTAMPTZ)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

Relationships:
  → Belongs To: integration_types (∞:1)
  → Has Many: sources (1:∞)
  → Has Many: outputs (1:∞)

Constraints:
  - UNIQUE (user_id, type_id, name)

Indexes:
  - PRIMARY KEY (id)
  - FOREIGN KEY (type_id)
  - INDEX (user_id, is_active)
```

**Data Example**:

```json
{
  "id": "uuid",
  "user_id": "user-uuid",
  "type_id": "perplexity-type-uuid",
  "name": "My Perplexity API",
  "credentials": {
    "api_key": "encrypted_value"
  },
  "is_active": true
}
```

### 3. Sources

**Purpose**: Configured API calls that generate cards

```
sources
├── id (UUID, PK)
├── user_id (UUID, NOT NULL)
├── integration_id (UUID, FK → integrations.id)
├── name (TEXT, NOT NULL)
├── description (TEXT)
├── config (JSONB, NOT NULL)
├── tags (UUID[])
├── schedule_enabled (BOOLEAN)
├── schedule_cron (TEXT)
├── schedule_timezone (TEXT)
├── next_run_at (TIMESTAMPTZ)
├── is_active (BOOLEAN)
├── last_executed_at (TIMESTAMPTZ)
├── execution_count (INTEGER)
├── last_execution_status (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

Relationships:
  → Belongs To: integrations (∞:1)
  → Has Many: content_cards (1:∞)
  → Referenced By: queries (∞:∞)
  → Has Many: executions (1:∞)

Indexes:
  - PRIMARY KEY (id)
  - FOREIGN KEY (integration_id) ON DELETE CASCADE
  - INDEX (next_run_at) WHERE schedule_enabled AND is_active
  - INDEX (user_id)
```

**Data Example**:

```json
{
  "id": "source-uuid",
  "integration_id": "integration-uuid",
  "name": "AI News Daily",
  "config": {
    "query": "latest AI developments",
    "model": "sonar-medium-online",
    "temperature": 0.2
  },
  "tags": ["tag-uuid-1", "tag-uuid-2"],
  "schedule_enabled": true,
  "schedule_cron": "0 9 * * *",
  "next_run_at": "2024-10-30T09:00:00Z"
}
```

### 4. Queries

**Purpose**: Multi-source aggregations

```
queries
├── id (UUID, PK)
├── user_id (UUID, NOT NULL)
├── name (TEXT, NOT NULL)
├── description (TEXT)
├── source_ids (UUID[], NOT NULL)
├── tags (UUID[])
├── aggregation_template (TEXT, NOT NULL)
├── schedule_enabled (BOOLEAN)
├── schedule_cron (TEXT)
├── schedule_timezone (TEXT)
├── next_run_at (TIMESTAMPTZ)
├── is_active (BOOLEAN)
├── last_executed_at (TIMESTAMPTZ)
├── execution_count (INTEGER)
├── last_execution_status (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

Relationships:
  → References Many: sources (∞:∞)
  → Has Many: content_cards (1:∞)
  → Has Many: executions (1:∞)

Indexes:
  - PRIMARY KEY (id)
  - INDEX (next_run_at) WHERE schedule_enabled AND is_active
  - INDEX (user_id)
  - GIN (source_ids)
```

**Data Example**:

```json
{
  "id": "query-uuid",
  "name": "Morning Tech Brief",
  "source_ids": ["source-1-uuid", "source-2-uuid", "source-3-uuid"],
  "aggregation_template": "# {{query_name}}\n\n{{#each sources}}## {{this.name}}\n{{this.content}}\n\n---\n{{/each}}",
  "tags": ["digest-tag-uuid"],
  "schedule_cron": "0 8 * * *"
}
```

### 5. Outputs

**Purpose**: Content delivery to external systems

```
outputs
├── id (UUID, PK)
├── user_id (UUID, NOT NULL)
├── integration_id (UUID, FK → integrations.id)
├── name (TEXT, NOT NULL)
├── description (TEXT)
├── config (JSONB, NOT NULL)
├── filter (JSONB, NOT NULL)
├── template (TEXT, NOT NULL)
├── schedule_enabled (BOOLEAN)
├── schedule_cron (TEXT)
├── schedule_timezone (TEXT)
├── next_run_at (TIMESTAMPTZ)
├── is_active (BOOLEAN)
├── last_executed_at (TIMESTAMPTZ)
├── execution_count (INTEGER)
├── last_execution_status (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

Relationships:
  → Belongs To: integrations (∞:1)
  → Uses: views (through filter) (∞:∞)
  → Has Many: executions (1:∞)

Indexes:
  - PRIMARY KEY (id)
  - FOREIGN KEY (integration_id) ON DELETE CASCADE
  - INDEX (next_run_at) WHERE schedule_enabled AND is_active
  - INDEX (user_id)
```

**Data Example**:

```json
{
  "id": "output-uuid",
  "integration_id": "mailchimp-integration-uuid",
  "name": "Weekly Newsletter",
  "config": {
    "list_id": "subscribers",
    "campaign_name": "Weekly Digest {{date}}"
  },
  "filter": {
    "view_ids": ["published-view-uuid"],
    "tags": ["newsletter-tag-uuid"],
    "date_range": { "field": "created_at", "last_n_days": 7 }
  },
  "template": "{{#each cards}}## {{this.title}}\n{{this.content}}\n\n{{/each}}",
  "schedule_cron": "0 9 * * 1"
}
```

### 6. Content Cards

**Purpose**: Central knowledge storage

```
content_cards
├── id (UUID, PK)
├── user_id (UUID, NOT NULL)
├── card_type (TEXT, NOT NULL)
├── schema_id (UUID, FK → schemas.id)
├── schema_name (TEXT, NOT NULL)
├── title (TEXT)
├── data (JSONB, NOT NULL)
├── content (TEXT, NOT NULL)
├── source_id (UUID, FK → sources.id)
├── query_id (UUID, FK → queries.id)
├── execution_id (UUID, FK → executions.id)
├── api_request (JSONB)
├── token_count (INTEGER)
├── is_stale (BOOLEAN)
├── tags (UUID[])
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

Relationships:
  → Belongs To: schemas (∞:1)
  → Belongs To: sources (optional) (∞:1)
  → Belongs To: queries (optional) (∞:1)
  → Belongs To: executions (optional) (∞:1)
  → Has Many: tags (∞:∞ via tags array)

Indexes:
  - PRIMARY KEY (id)
  - INDEX (card_type)
  - INDEX (source_id) WHERE source_id IS NOT NULL
  - INDEX (query_id) WHERE query_id IS NOT NULL
  - GIN (tags)
  - GIN (data)
  - INDEX (created_at DESC)
  - INDEX (title) WHERE title IS NOT NULL
  - INDEX (user_id)
```

**Data Examples**:

**Manual Card**:

```json
{
  "id": "card-uuid",
  "card_type": "manual",
  "schema_id": "task-schema-uuid",
  "title": "Implement Feature X",
  "data": {
    "priority": "high",
    "status": "in_progress",
    "assignee": "John"
  },
  "content": "## Task Description\nImplement feature X...",
  "tags": ["project-uuid", "sprint-uuid"]
}
```

**Source Card**:

```json
{
  "id": "card-uuid",
  "card_type": "source",
  "schema_id": "perplexity-schema-uuid",
  "title": "Perplexity: Latest AI News",
  "source_id": "source-uuid",
  "execution_id": "execution-uuid",
  "data": {
    "query": "latest AI developments",
    "model": "sonar-medium-online",
    "citations_count": 5
  },
  "content": "## Search Results\n...",
  "api_request": {
    "integration_id": "integration-uuid",
    "config": {...},
    "timestamp": "2024-10-30T09:00:00Z"
  },
  "tags": ["ai-uuid", "news-uuid"]
}
```

**Query Card**:

```json
{
  "id": "card-uuid",
  "card_type": "query",
  "schema_id": "query-schema-uuid",
  "title": "Morning Tech Brief - Oct 30",
  "query_id": "query-uuid",
  "execution_id": "execution-uuid",
  "data": {
    "query_name": "Morning Tech Brief",
    "sources_count": 3,
    "execution_time_ms": 4523
  },
  "content": "# Morning Tech Brief\n\n## AI News\n...\n\n## GitHub Trending\n...",
  "tags": ["digest-uuid"]
}
```

### 7. Schemas

**Purpose**: Define structure for content cards

```
schemas
├── id (UUID, PK)
├── user_id (UUID, NOT NULL)
├── name (TEXT, NOT NULL)
├── description (TEXT)
├── icon (TEXT)
├── color (TEXT)
├── fields (JSONB, NOT NULL)
├── is_system (BOOLEAN)
├── card_count (INTEGER)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

Relationships:
  → Has Many: content_cards (1:∞)

Constraints:
  - UNIQUE (user_id, name)

Indexes:
  - PRIMARY KEY (id)
  - UNIQUE (user_id, name)
  - INDEX (is_system)
```

**Data Example**:

```json
{
  "id": "schema-uuid",
  "name": "Task",
  "fields": [
    {
      "name": "title",
      "type": "text",
      "label": "Title",
      "required": true
    },
    {
      "name": "priority",
      "type": "select",
      "options": [
        {"value": "high", "label": "High", "color": "#f44336"},
        {"value": "medium", "label": "Medium", "color": "#ff9800"},
        {"value": "low", "label": "Low", "color": "#4caf50"}
      ]
    },
    {
      "name": "status",
      "type": "select",
      "options": [...]
    }
  ],
  "is_system": false
}
```

### 8. Tags

**Purpose**: Categorization and filtering

```
tags
├── id (UUID, PK)
├── user_id (UUID, NOT NULL)
├── name (TEXT, NOT NULL)
├── color (TEXT, NOT NULL)
├── description (TEXT)
├── card_count (INTEGER)
└── created_at (TIMESTAMPTZ)

Relationships:
  → Referenced By: content_cards (∞:∞ via tags array)
  → Used In: sources (via tags array)
  → Used In: queries (via tags array)
  → Used In: views (via filter)

Constraints:
  - UNIQUE (user_id, name)

Indexes:
  - PRIMARY KEY (id)
  - UNIQUE (user_id, name)
```

### 9. Views

**Purpose**: Filter and organize cards

```
views
├── id (UUID, PK)
├── user_id (UUID, NOT NULL)
├── name (TEXT, NOT NULL)
├── description (TEXT)
├── icon (TEXT)
├── filter (JSONB, NOT NULL)
├── sort_by (TEXT)
├── sort_order (TEXT)
├── display_mode (TEXT)
├── is_default (BOOLEAN)
├── card_count (INTEGER)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

Relationships:
  → Filters: content_cards (dynamic query)
  → Referenced By: showcases (1:∞)
  → Referenced By: connection_policies (∞:∞)

Indexes:
  - PRIMARY KEY (id)
  - INDEX (user_id)
  - GIN (filter)
```

**Data Example**:

```json
{
  "id": "view-uuid",
  "name": "High Priority Tasks",
  "filter": {
    "schema_ids": ["task-schema-uuid"],
    "tags": {
      "mode": "simple",
      "simple": {
        "operator": "AND",
        "tags": ["project-uuid"],
        "exclude": ["archived-uuid"]
      }
    },
    "fields": [
      {
        "field": "priority",
        "operator": "equals",
        "value": "high"
      },
      {
        "field": "status",
        "operator": "not_equals",
        "value": "done"
      }
    ]
  },
  "sort_by": "created_at",
  "sort_order": "DESC",
  "display_mode": "table"
}
```

### 10. Executions

**Purpose**: Track all scheduled operations

```
executions
├── id (UUID, PK)
├── user_id (UUID, NOT NULL)
├── execution_type (TEXT, NOT NULL)
├── entity_id (UUID, NOT NULL)
├── entity_name (TEXT, NOT NULL)
├── started_at (TIMESTAMPTZ, NOT NULL)
├── completed_at (TIMESTAMPTZ)
├── duration_ms (INTEGER)
├── status (TEXT, NOT NULL)
├── cards_created (UUID[])
├── cards_sent (INTEGER)
├── result_summary (JSONB)
├── error_message (TEXT)
├── error_details (JSONB)
└── created_at (TIMESTAMPTZ)

Relationships:
  → References: sources | queries | outputs (polymorphic)
  → Referenced By: content_cards (1:∞)

Indexes:
  - PRIMARY KEY (id)
  - INDEX (execution_type, entity_id)
  - INDEX (started_at DESC)
  - INDEX (status)
  - INDEX (user_id)
```

### 11. Showcases

**Purpose**: Public card presentations

```
showcases
├── id (UUID, PK)
├── user_id (UUID, NOT NULL)
├── name (TEXT, NOT NULL)
├── description (TEXT)
├── view_id (UUID, FK → views.id)
├── layout (JSONB)
├── theme (JSONB)
├── rendered_html (TEXT)
├── cards_hash (TEXT)
├── needs_regeneration (BOOLEAN)
├── last_regenerated_at (TIMESTAMPTZ)
├── is_public (BOOLEAN)
├── public_url_slug (TEXT, UNIQUE)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

Relationships:
  → Belongs To: views (∞:1)

Indexes:
  - PRIMARY KEY (id)
  - FOREIGN KEY (view_id) ON DELETE CASCADE
  - UNIQUE (public_url_slug)
  - INDEX (is_public)
```

### 12. Connection Policies

**Purpose**: External access control

```
connection_policies
├── id (UUID, PK)
├── user_id (UUID, NOT NULL)
├── name (TEXT, NOT NULL)
├── description (TEXT)
├── policy_type (TEXT, NOT NULL)
├── connection_string (TEXT, UNIQUE NOT NULL)
├── view_ids (UUID[])
├── schema_id (UUID, FK → schemas.id)
├── tags (UUID[])
├── is_active (BOOLEAN)
├── expires_at (TIMESTAMPTZ)
├── access_count (INTEGER)
├── last_accessed_at (TIMESTAMPTZ)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

Relationships:
  → References Many: views (via view_ids)
  → References One: schemas (for input policies)

Indexes:
  - PRIMARY KEY (id)
  - UNIQUE (connection_string)
  - INDEX (policy_type)
  - INDEX (is_active, expires_at)
```

## Relationship Types

### One-to-Many (1:∞)

- Integration Types → Integrations
- Integrations → Sources
- Integrations → Outputs
- Sources → Content Cards
- Queries → Content Cards
- Schemas → Content Cards
- Views → Showcases

### Many-to-Many (∞:∞)

- Queries → Sources (via source_ids array)
- Content Cards → Tags (via tags array)
- Views → Connection Policies (via view_ids array)

### Optional Relationships

- Content Cards → Sources (only for source-type cards)
- Content Cards → Queries (only for query-type cards)
- Content Cards → Executions (for tracking origin)

## Data Flow Through Relationships

### Source Execution Flow

```
Integration Type → Integration Instance → Source
  → Execution (creates) → Content Card
```

### Query Execution Flow

```
Query (references) → Multiple Sources
  → Multiple Executions → Multiple Temporary Cards
    → Aggregation → Single Query Card
```

### Output Delivery Flow

```
Output (uses) → View (filters) → Content Cards
  → Template Application → Formatted Content
    → Integration Instance → External System
```

### Showcase Generation Flow

```
Showcase (uses) → View (filters) → Content Cards
  → Markdown Rendering → HTML Generation
    → Cached HTML Storage
```

---

**Next**: [Content Cards](03-content-cards.md)
