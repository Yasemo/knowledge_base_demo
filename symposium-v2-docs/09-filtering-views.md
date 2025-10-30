# Filtering & Views

## Overview

**Views** are saved filter configurations that dynamically select and display
cards. They enable organization without duplication.

```
View = Filter Definition + Sort + Display Mode

Evaluation:
  Filter Expression → Evaluates All Cards → Filtered Subset
```

## View Structure

```json
{
  "id": "view-uuid",
  "user_id": "user-uuid",
  "name": "High Priority Tasks",
  "description": "All high priority tasks not yet complete",
  "icon": "⚡",
  "filter": {
    "schema_ids": ["task-schema-uuid"],
    "tags": {
      "mode": "simple",
      "simple": {
        "operator": "AND",
        "tags": ["project-alpha-uuid"],
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
    ],
    "date_range": {
      "field": "created_at",
      "relative": "last_n_days",
      "value": 30
    }
  },
  "sort_by": "created_at",
  "sort_order": "DESC",
  "display_mode": "table"
}
```

## Filter Components

### Schema Filter

```json
{
  "schema_ids": ["task-uuid", "note-uuid"]
}
```

Only includes cards from specified schemas. Empty = all schemas.

### Tag Filter

**Simple Mode** (most common):

```json
{
  "mode": "simple",
  "simple": {
    "operator": "AND", // or "OR"
    "tags": ["tag1-uuid", "tag2-uuid"],
    "exclude": ["archived-uuid"]
  }
}
```

**Boolean Mode** (advanced):

```json
{
  "mode": "boolean",
  "boolean": "(tag1 AND tag2) OR (tag3 AND NOT tag4)"
}
```

### Field Filter

```json
{
  "field": "priority",
  "operator": "equals", // equals, not_equals, contains, gt, lt, etc.
  "value": "high"
}
```

Operators:

- `equals`, `not_equals`
- `contains`, `not_contains`
- `gt`, `gte`, `lt`, `lte` (numbers/dates)
- `is_empty`, `is_not_empty`

### Date Range Filter

**Absolute**:

```json
{
  "field": "created_at",
  "absolute": {
    "start": "2024-10-01T00:00:00Z",
    "end": "2024-10-31T23:59:59Z"
  }
}
```

**Relative**:

```json
{
  "field": "created_at",
  "relative": "last_n_days",
  "value": 7
}
```

Options: `last_n_days`, `last_n_weeks`, `last_n_months`, `today`, `this_week`,
`this_month`

### Card Type Filter

```json
{
  "card_types": ["manual", "source"]
}
```

Filters by card generation method.

## Filter Evaluation

```sql
-- Conceptual SQL generation from filter

SELECT * FROM content_cards
WHERE user_id = :user_id
  
  -- Schema filter
  AND schema_id IN (:schema_ids)
  
  -- Tag filter (simple AND)
  AND tags @> ARRAY[:required_tags]
  AND NOT (tags && ARRAY[:excluded_tags])
  
  -- Field filters
  AND data->>'priority' = 'high'
  AND data->>'status' != 'done'
  
  -- Date range filter
  AND created_at >= NOW() - INTERVAL '30 days'
  
  -- Card type filter
  AND card_type IN ('manual', 'source')

-- Sort
ORDER BY created_at DESC

-- Pagination
LIMIT 50 OFFSET 0;
```

## Display Modes

### Grid (default)

- Card tiles with preview
- Good for visual scanning
- Shows icons, titles, excerpts

### List

- Rows with more detail
- Better for reading
- Shows more metadata

### Table

- Spreadsheet-like
- Best for data comparison
- Inline field editing

### Carousel

- One card at a time
- Full content display
- Good for focused review

## View Operations

### Dynamic Evaluation

```
Views are evaluated on demand:
  - User opens view
  - System applies filter to current cards
  - Results reflect latest state
  - No stale data
```

### View Modification

```
User Modifies View Filter
  ↓
Save New Filter Configuration
  ↓
Re-evaluate Against Cards
  ↓
Display Updated Results
  
Note: Cards themselves unchanged
```

### Default Views

```
System can provide:
  - "All Cards" (no filters)
  - "Recent" (last 7 days)
  - "Untagged" (no tags)
  - "Manual Cards"
  - "Automated Cards"

Users can set any view as default
```

## Use Cases

1. **Project Views**: Filter by project tag
2. **Status Views**: Group by status field
3. **Priority Views**: High priority items
4. **Time Views**: Recent, this week, this month
5. **Source Views**: Cards from specific sources
6. **Workflow Views**: Inbox, review, completed

## Best Practices

- **Name Clearly**: "High Priority Open Tasks" vs "View 1"
- **Single Purpose**: One clear filtering goal
- **Use Tags**: More flexible than field filters
- **Test Filters**: Ensure they select expected cards
- **Review Regularly**: Archive unused views

## Performance

### Optimization

```sql
-- Index commonly filtered fields
CREATE INDEX idx_cards_schema ON content_cards(schema_id);
CREATE INDEX idx_cards_created ON content_cards(created_at DESC);
CREATE INDEX idx_cards_type ON content_cards(card_type);

-- JSONB indexes for field filters
CREATE INDEX idx_cards_data ON content_cards USING GIN(data);

-- Array indexes for tags
CREATE INDEX idx_cards_tags ON content_cards USING GIN(tags);
```

### Caching

```
View Results:
  - Short-lived cache (30-60 seconds)
  - Invalidate on card changes
  - Per-user cache
```

---

**Next**: [UI Architecture](10-ui-architecture.md)
