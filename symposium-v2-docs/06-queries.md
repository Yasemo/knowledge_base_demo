# Queries

## Overview

**Queries** aggregate multiple sources into a single digest card. They execute
sources in sequence, collect results, and combine them using a template.

```
Query = Multiple Sources + Aggregation Template + Schedule

Result:
  Source 1 + Source 2 + Source 3 → Template → Single Digest Card
```

## Structure

```json
{
  "id": "query-uuid",
  "user_id": "user-uuid",
  "name": "Morning Tech Brief",
  "description": "Daily digest of AI news, GitHub trends, and HN stories",
  "source_ids": [
    "ai-news-source-uuid",
    "github-trending-source-uuid",
    "hn-stories-source-uuid"
  ],
  "aggregation_template": "# {{query_name}}\n\n{{#each sources}}## {{name}}\n{{content}}\n---\n{{/each}}",
  "tags": ["digest-uuid", "automated-uuid", "daily-uuid"],
  "schedule_enabled": true,
  "schedule_cron": "0 8 * * *",
  "schedule_timezone": "America/Toronto",
  "next_run_at": "2024-10-31T08:00:00-04:00",
  "is_active": true,
  "last_executed_at": "2024-10-30T08:00:00-04:00"
}
```

## Execution Flow

```
Query Triggered (Scheduled or Manual)
  ↓
For Each Source in source_ids:
  ├── Execute Source
  ├── Collect Result (data + content)
  └── Store in results array
  ↓
Apply Aggregation Template
  ├── Inject source results
  ├── Render template with Handlebars
  └── Generate combined content
  ↓
Create Query Card
  ├── card_type = 'query'
  ├── query_id = query.id
  ├── data = { sources_count, execution_time, etc. }
  ├── content = rendered template
  └── tags = query.tags
  ↓
Update Query
  └── Calculate next_run_at
```

## Template System

### Handlebars Syntax

**Available Variables**:

```handlebars
{{query_name}}              - Query name
{{execution_date}}          - Timestamp
{{sources_count}}           - Number of sources
{{#each sources}}           - Iterate sources
  {{this.name}}             - Source name
  {{this.content}}          - Source content
  {{this.data}}             - Source data fields
{{/each}}
```

**Example Templates**:

**Simple Digest**:

```handlebars
# {{query_name}} - {{execution_date}}

{{#each sources}}
## {{this.name}}

{{this.content}}

---
{{/each}}

**Total Sources**: {{sources_count}}
```

**Structured Digest**:

```handlebars
# Daily Brief

Generated: {{execution_date}}

## AI Developments
{{sources.0.content}}

## GitHub Trending
{{sources.1.content}}

## Hacker News
{{sources.2.content}}

---
*Compiled from {{sources_count}} sources*
```

## Partial Success Handling

```
Query with 3 Sources:
  Source A: Success ✓
  Source B: Failure ✗
  Source C: Success ✓

Result:
  - Create card with available data
  - Include A and C content
  - Note B missing in template
  - Mark execution as 'partial'
  - Log error details for B
```

## Use Cases

1. **Daily Briefings**: Combine news from multiple sources
2. **Status Dashboards**: Aggregate monitoring data
3. **Research Digests**: Multiple research sources into one
4. **Competitive Intelligence**: Combine competitor data
5. **Weekly Reports**: Summarize week's activities

## Best Practices

- **Order Sources**: Put most important first
- **Template Structure**: Clear sections per source
- **Handle Failures**: Template should work with missing sources
- **Reasonable Limits**: 3-5 sources optimal
- **Schedule Wisely**: After all sources have run
- **Tag Appropriately**: "digest", "aggregated", etc.

---

**Next**: [Outputs](07-outputs.md)
