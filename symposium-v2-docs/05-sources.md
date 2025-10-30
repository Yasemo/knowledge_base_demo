# Sources

## Overview

**Sources** are configured API calls that automatically generate content cards
by fetching data from external services. They are the primary mechanism for
automating content collection in Symposium v2.

## Concept

```
Source = Integration Instance + Configuration + Schedule + Tags

When executed:
  Integration → API Call → Response → Content Card
```

A source is essentially a "saved API call" that can be executed:

- **Manually**: User clicks "Execute Now"
- **Scheduled**: Runs automatically on cron schedule
- **On-Demand**: Triggered by external events

## Source Structure

### Core Fields

```
source
├── Identity
│   ├── id (UUID)
│   ├── user_id (UUID)
│   ├── name (TEXT)
│   └── description (TEXT)
│
├── Integration
│   ├── integration_id → Integration Instance
│   └── config (JSONB) - API-specific parameters
│
├── Content Generation
│   └── tags (UUID[]) - Applied to generated cards
│
├── Scheduling
│   ├── schedule_enabled (BOOLEAN)
│   ├── schedule_cron (TEXT)
│   ├── schedule_timezone (TEXT)
│   └── next_run_at (TIMESTAMPTZ)
│
├── State
│   ├── is_active (BOOLEAN)
│   ├── last_executed_at (TIMESTAMPTZ)
│   ├── execution_count (INTEGER)
│   └── last_execution_status (TEXT)
│
└── Timestamps
    ├── created_at (TIMESTAMPTZ)
    └── updated_at (TIMESTAMPTZ)
```

### Data Structure

```json
{
  "id": "source-uuid",
  "user_id": "user-uuid",
  "integration_id": "perplexity-integration-uuid",
  "name": "Daily AI News",
  "description": "Fetch latest AI developments every morning",
  "config": {
    "query": "latest AI developments and breakthroughs",
    "model": "sonar-medium-online",
    "temperature": 0.2,
    "max_tokens": 2000
  },
  "tags": ["ai-tag-uuid", "news-tag-uuid", "automated-tag-uuid"],
  "schedule_enabled": true,
  "schedule_cron": "0 9 * * *",
  "schedule_timezone": "America/Toronto",
  "next_run_at": "2024-10-31T09:00:00-04:00",
  "is_active": true,
  "last_executed_at": "2024-10-30T09:00:00-04:00",
  "execution_count": 45,
  "last_execution_status": "success",
  "created_at": "2024-09-15T10:00:00Z",
  "updated_at": "2024-10-30T09:00:00Z"
}
```

## Source Configuration

### Config Field Structure

The `config` field contains integration-specific parameters defined by the
integration type's `source_schema`:

**Perplexity Source Config**:

```json
{
  "query": "latest machine learning research papers",
  "model": "sonar-large-online",
  "temperature": 0.2,
  "return_citations": true,
  "search_domain": "academic"
}
```

**GitHub Source Config**:

```json
{
  "query": "language:typescript stars:>1000 created:>2024-01-01",
  "sort": "stars",
  "order": "desc",
  "per_page": 30
}
```

**RSS Feed Source Config**:

```json
{
  "feed_url": "https://news.ycombinator.com/rss",
  "max_items": 10,
  "include_content": true,
  "filter_keywords": ["AI", "machine learning", "LLM"]
}
```

**Weather API Source Config**:

```json
{
  "location": "Toronto, ON",
  "units": "metric",
  "include_forecast": true,
  "forecast_days": 7
}
```

## Source Creation Flow

### User Experience

```
1. Navigate to Sources Tab
   ↓
2. Click "New Source"
   ↓
3. Select Integration Instance
   (e.g., "My Perplexity API")
   ↓
4. Form Renders Based on Integration's source_schema
   ↓
5. User Fills Configuration Fields
   - Query parameters
   - Options and settings
   - Output preferences
   ↓
6. User Selects Tags (optional)
   ↓
7. User Configures Schedule (optional)
   - Enable scheduling checkbox
   - Select frequency (cron or preset)
   - Choose timezone
   ↓
8. User Tests Source (optional)
   - Executes immediately
   - Shows preview of result
   - User can adjust config
   ↓
9. User Saves Source
   ↓
10. Source Created
    - If scheduled: next_run_at calculated
    - If active: ready for execution
```

### System Processing

```
Source Created
  ↓
Validate Configuration
  ├── Check integration exists and is active
  ├── Validate config against source_schema
  ├── Verify tags exist
  └── Parse cron expression (if scheduled)
  ↓
Calculate Next Run
  ├── If schedule_enabled
  ├── Parse cron in timezone
  └── Set next_run_at
  ↓
Save to Database
  ↓
Ready for Execution
```

## Source Execution

### Execution Triggers

**1. Scheduled Execution**:

```
Global Scheduler (every 30 seconds)
  ↓
Query: SELECT * FROM sources
  WHERE schedule_enabled = true
  AND is_active = true
  AND next_run_at <= NOW()
  ↓
For Each Due Source:
  → Execute Source
```

**2. Manual Execution**:

```
User Clicks "Execute Now" on Source
  ↓
Immediate Execution
  ↓
Result Displayed to User
```

**3. Bulk Execution**:

```
User Selects Multiple Sources
  ↓
Clicks "Execute Selected"
  ↓
Queue for Execution
  ↓
Execute in Sequence (respecting rate limits)
```

### Execution Process

```
┌────────────────────────────────────────────────┐
│          SOURCE EXECUTION PROCESS               │
└────────────────────────────────────────────────┘

Start Execution
  ↓
Create Execution Record
  ├── execution_id
  ├── execution_type = 'source'
  ├── entity_id = source.id
  ├── started_at = NOW()
  └── status = 'running'
  ↓
Get Integration Instance
  ├── Verify is_active
  ├── Verify credentials exist
  └── Load integration type
  ↓
Get Integration Type Handler
  ├── Load handler module
  └── Verify source capability
  ↓
Check Rate Limits
  ├── Count recent requests
  ├── If under limit → proceed
  └── If at limit → queue/delay
  ↓
Execute Handler
  ├── Decrypt credentials
  ├── Call integration.execute(source.config)
  ├── Handler makes API call
  ├── Handler processes response
  ├── Handler formats data & content
  └── Handler returns CardData
  ↓
Create Content Card
  ├── card_type = 'source'
  ├── source_id = source.id
  ├── execution_id = execution_id
  ├── schema_id = integration_type.schema_id
  ├── title = generated title
  ├── data = handler.data
  ├── content = handler.content
  ├── tags = source.tags
  ├── api_request = {
  │     integration_id,
  │     config,
  │     timestamp
  │   }
  └── token_count = estimated
  ↓
Update Execution Record
  ├── completed_at = NOW()
  ├── duration_ms = calculated
  ├── status = 'success'
  ├── cards_created = [card.id]
  └── result_summary = {
        api_response_time: ms,
        tokens_used: count,
        citations_found: count
      }
  ↓
Update Source
  ├── last_executed_at = NOW()
  ├── execution_count += 1
  ├── last_execution_status = 'success'
  └── If scheduled:
      └── next_run_at = calculate_next(cron, timezone)
  ↓
Notify User (if manual execution)
  ↓
Complete
```

### Error Handling During Execution

```
Error Occurs in Handler
  ↓
Catch Exception
  ↓
Log Error Details
  ├── Error type
  ├── Error message
  ├── Stack trace
  ├── Request details
  └── Response (if any)
  ↓
Update Execution Record
  ├── status = 'failure'
  ├── error_message = summary
  └── error_details = full details
  ↓
Update Source
  ├── last_executed_at = NOW()
  ├── execution_count += 1
  ├── last_execution_status = 'failure'
  └── If scheduled:
      └── next_run_at = calculate_next(cron, timezone)
  ↓
Determine Retry Strategy
  ├── Auth error → Disable source, notify user
  ├── Rate limit → Will retry on next schedule
  ├── Server error → Will retry on next schedule
  └── Network error → Will retry on next schedule
  ↓
Notify User (if manual or repeated failures)
```

## Scheduling

### Cron Expressions

Sources use standard cron expressions for scheduling:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday = 0)
│ │ │ │ │
* * * * *
```

**Common Patterns**:

```
Every hour:         0 * * * *
Every day at 9am:   0 9 * * *
Every Monday at 9:  0 9 * * 1
Twice daily:        0 9,17 * * *
Every 15 minutes:   */15 * * * *
First of month:     0 0 1 * *
Weekdays at noon:   0 12 * * 1-5
```

### Timezone Handling

```
Source Configuration:
  schedule_cron = "0 9 * * *"
  schedule_timezone = "America/Toronto"

Calculation:
  1. Parse cron expression
  2. Apply timezone
  3. Convert to UTC for storage
  4. Calculate next_run_at in UTC

Storage:
  next_run_at = "2024-10-31T13:00:00Z" (9am Toronto = 1pm UTC)

Execution:
  Scheduler checks: next_run_at <= NOW() in UTC
```

### Schedule Management

**Enabling Schedule**:

```
User Enables Schedule on Source
  ↓
Set schedule_enabled = true
  ↓
Parse cron expression
  ↓
Calculate next_run_at
  ↓
Save
  ↓
Scheduler will execute at next_run_at
```

**Disabling Schedule**:

```
User Disables Schedule on Source
  ↓
Set schedule_enabled = false
  ↓
Keep cron and timezone (can re-enable later)
  ↓
Set next_run_at = NULL
  ↓
Scheduler will not execute
```

**Changing Schedule**:

```
User Modifies Cron Expression
  ↓
Validate new expression
  ↓
Update schedule_cron
  ↓
Recalculate next_run_at from NOW()
  ↓
Save
  ↓
Next execution uses new schedule
```

## Tag Application

### Tag Selection

When creating/editing a source, user selects which tags to apply to generated
cards:

```
Source Configuration:
  tags = [
    "ai-tag-uuid",
    "research-tag-uuid",
    "automated-tag-uuid"
  ]

When Card Created:
  card.tags = source.tags
```

### Tag Strategy

**Purpose of Source Tags**:

1. **Categorization**: Group automated cards by topic
2. **Filtering**: Enable view-based organization
3. **Identification**: Mark as automated vs manual
4. **Workflow**: Support different processes

**Best Practices**:

```
Use tags to indicate:
  ├── Content type (e.g., "news", "research", "monitoring")
  ├── Source type (e.g., "automated", "api-generated")
  ├── Topic area (e.g., "ai", "security", "frontend")
  ├── Project (e.g., "project-alpha", "client-beta")
  └── Workflow stage (e.g., "inbox", "review", "processed")
```

**Example Tag Strategies**:

```
News Aggregation Source:
  tags: ["news", "automated", "daily", "tech"]

Research Monitoring Source:
  tags: ["research", "papers", "ai", "automated"]

Competitive Intelligence Source:
  tags: ["competitors", "monitoring", "analysis", "automated"]
```

## Source Management

### Lifecycle States

**Active**:

```
is_active = true
- Can be executed manually
- Will execute on schedule (if enabled)
- Appears in active sources list
```

**Inactive/Paused**:

```
is_active = false
- Cannot be executed manually
- Will NOT execute on schedule
- Appears in paused sources list
- Configuration preserved
- Can be reactivated
```

**Disabled (due to errors)**:

```
is_active = false (auto-set by system)
- Too many consecutive failures
- Authentication failed
- Integration disabled
- Requires user intervention
```

### Source Operations

**Edit Source**:

```
User Edits Source Configuration
  ↓
Load Current Config
  ↓
User Modifies Fields
  ↓
Validate Changes
  ↓
Save Updated Config
  ↓
If config changed:
  └── Mark existing source cards as stale
      (is_stale = true)
```

**Delete Source**:

```
User Deletes Source
  ↓
Confirm Deletion
  ↓
Delete Source Record
  ↓
Generated Cards Remain
  ├── source_id becomes NULL (orphaned)
  ├── Can no longer be refreshed
  └── Historical record preserved
  ↓
Execution History Preserved
```

**Duplicate Source**:

```
User Duplicates Source
  ↓
Copy Configuration
  ├── Same integration_id
  ├── Same config
  ├── Same tags
  └── New name (e.g., "Copy of Original")
  ↓
Schedule NOT Copied
  ├── schedule_enabled = false
  ├── User must explicitly enable
  └── Prevents accidental double-execution
  ↓
Save as New Source
```

**View Generated Cards**:

```
User Clicks "View Cards" on Source
  ↓
Query: SELECT * FROM content_cards
  WHERE source_id = :source_id
  ORDER BY created_at DESC
  ↓
Display Cards in Modal/Panel
  ├── Show count
  ├── Show latest
  └── Link to full view
```

## Source Monitoring

### Execution History

Track all executions for debugging and analysis:

```
Execution Log Entry:
{
  "id": "execution-uuid",
  "execution_type": "source",
  "entity_id": "source-uuid",
  "entity_name": "Daily AI News",
  "started_at": "2024-10-30T09:00:00Z",
  "completed_at": "2024-10-30T09:00:03Z",
  "duration_ms": 3245,
  "status": "success",
  "cards_created": ["card-uuid"],
  "result_summary": {
    "api_response_time_ms": 2890,
    "tokens_used": 1842,
    "citations_count": 5,
    "confidence_score": 0.94
  },
  "error_message": null,
  "error_details": null
}
```

### Success Metrics

**Per Source**:

```
- Total executions
- Success rate (successful / total)
- Average duration
- Cards created count
- Last successful execution
- Failure streak (consecutive failures)
```

### Failure Tracking

**Automatic Actions**:

```
If failure_streak >= 3:
  → Set is_active = false
  → Notify user
  → Suggest checking credentials

If error_type = 'authentication':
  → Set is_active = false immediately
  → Notify user
  → Suggest updating credentials

If error_type = 'rate_limit':
  → Keep active
  → Will retry on next schedule
  → Log rate limit hit
```

## Refresh Capability

### Card Refresh from Source

Source-generated cards can be refreshed:

```
User Clicks "Refresh" on Source Card
  ↓
System Reads card.api_request
  ├── integration_id
  ├── config (original parameters)
  └── timestamp
  ↓
Get Current Integration Instance
  ↓
Execute with Original Config
  ↓
Compare Result with Current Card
  ↓
If Different:
  ├── Update card.data
  ├── Update card.content
  ├── Update card.updated_at
  ├── Clear card.is_stale
  └── Keep card.created_at (original date)
  ↓
If Same:
  ├── Only update card.updated_at
  └── Clear card.is_stale
  ↓
Show User: "Card refreshed" or "No changes"
```

### Bulk Refresh

```
User Clicks "Refresh All Cards" on Source
  ↓
Query All Cards from Source
  WHERE source_id = :source_id
  AND api_request IS NOT NULL
  ↓
For Each Card:
  → Execute Refresh
  → Respect rate limits
  → Log results
  ↓
Show Summary:
  ├── Cards refreshed: X
  ├── Cards updated: Y
  ├── Cards unchanged: Z
  └── Cards failed: N
```

### Staleness Detection

```
When Source Config Changes:
  ↓
Query All Cards from Source
  WHERE source_id = :source_id
  ↓
Set is_stale = true
  ↓
UI Shows "Stale" Indicator
  ↓
User Can:
  ├── Refresh individual cards
  ├── Bulk refresh all cards
  └── Leave as-is (historical data)
```

## Integration with Other Systems

### Used by Queries

Sources can be referenced by queries:

```
Query Configuration:
  source_ids = [
    "ai-news-source-uuid",
    "github-trending-source-uuid",
    "hn-top-stories-source-uuid"
  ]

Query Execution:
  For each source_id:
    → Execute source
    → Collect result
  → Aggregate results
  → Create query card
```

### Used in Views

Source-generated cards can be filtered in views:

```
View Filter:
{
  "card_types": ["source"],
  "tags": ["automated"],
  "date_range": {"last_n_days": 7}
}

Result:
  All source cards from last 7 days with "automated" tag
```

### Used in Showcases

Source cards can be included in showcases:

```
Showcase Based on View:
  View → Filter (includes source cards)
  → Cards Selected
  → Rendered in Showcase
  → Auto-updates when cards change
```

## Best Practices

### Naming

```
Good Names:
  ✓ "Daily AI News from Perplexity"
  ✓ "Hourly GitHub Trending TypeScript"
  ✓ "Weather Forecast - Toronto"
  ✓ "HN Top Stories Every Morning"

Bad Names:
  ✗ "Source 1"
  ✗ "Test"
  ✗ "API"
  ✗ "Untitled"

Pattern: [Frequency] [Content Type] [Optional: Location/Filter]
```

### Scheduling Strategy

```
Consider:
  ├── API rate limits
  ├── Content update frequency
  ├── User needs (when do they need data?)
  └── System load

Examples:
  News: Every hour or twice daily
  Weather: Every 6 hours
  GitHub: Daily
  Stock prices: Every 15 minutes (trading hours)
  Research papers: Daily or weekly
```

### Tag Organization

```
Use consistent tag taxonomy:
  ├── Source type: "automated", "api", "scheduled"
  ├── Content category: "news", "research", "monitoring"
  ├── Topic: "ai", "security", "frontend"
  └── Project: "project-name"

Example:
  tags: ["automated", "news", "ai", "project-alpha"]
```

### Configuration Management

```
Document your config:
  ├── Use clear field names in UI
  ├── Provide examples in help text
  ├── Test before enabling schedule
  └── Keep description field updated
```

### Monitoring

```
Regular Review:
  ├── Check execution success rates
  ├── Review generated cards quality
  ├── Adjust schedules if needed
  ├── Update configs as APIs change
  └── Archive unused sources
```

## Performance Considerations

### Rate Limiting

```
Multiple Sources, Same Integration:
  ├── All share rate limit pool
  ├── System tracks per integration_id
  ├── Sources may queue if limit reached
  └── Execution delayed, not failed
```

### Execution Timing

```
Many Sources, Same Schedule:
  ├── Scheduler processes in order
  ├── May spread over several seconds
  ├── Consider staggering schedules
  └── Example: 10 sources at 9am → execute 9:00:00, 9:00:03, 9:00:06...
```

### Concurrency

```
Parallel Execution:
  ├── Different integrations → Can run in parallel
  ├── Same integration → Respects rate limit
  └── Consider: Worker pools for high-volume systems
```

### Database Load

```
High-Volume Sources:
  ├── Use bulk inserts for cards
  ├── Batch execution logging
  ├── Consider read replicas
  └── Archive old execution logs
```

## Troubleshooting

### Common Issues

**Source Won't Execute**:

```
Check:
  ├── is_active = true?
  ├── schedule_enabled = true?
  ├── Integration is_active = true?
  ├── Credentials valid?
  └── Rate limit not exceeded?
```

**Cards Not Being Created**:

```
Check:
  ├── Execution logs for errors
  ├── Handler returning valid CardData?
  ├── Schema exists and is valid?
  └── Tags exist and are valid?
```

**Schedule Not Running**:

```
Check:
  ├── next_run_at in future?
  ├── Cron expression valid?
  ├── Timezone correct?
  ├── Scheduler running?
  └── Source not disabled due to failures?
```

**Stale Cards**:

```
Solution:
  ├── Refresh individual cards
  ├── Bulk refresh from source
  ├── Or accept as historical data
```

---

**Next**: [Queries](06-queries.md)
