# Outputs

## Overview

**Outputs** deliver filtered content cards to external systems. They select
cards using filters, format them with templates, and send to integrations.

```
Output = Integration + Card Filter + Template + Schedule

Flow:
  Filter Cards → Format with Template → Send to External System
```

## Structure

```json
{
  "id": "output-uuid",
  "user_id": "user-uuid",
  "integration_id": "mailchimp-integration-uuid",
  "name": "Weekly Newsletter",
  "description": "Send weekly digest to subscribers",
  "config": {
    "list_id": "subscribers",
    "campaign_name": "Weekly Digest {{date}}",
    "subject_line": "Your Weekly Update"
  },
  "filter": {
    "view_ids": ["published-view-uuid"],
    "tags": ["newsletter-uuid"],
    "date_range": { "field": "created_at", "last_n_days": 7 }
  },
  "template": "{{#each cards}}<h2>{{title}}</h2>\n{{content}}\n{{/each}}",
  "schedule_enabled": true,
  "schedule_cron": "0 9 * * 1",
  "next_run_at": "2024-11-04T09:00:00-05:00"
}
```

## Card Selection

### Filter Options

```json
{
  "view_ids": ["view-uuid-1", "view-uuid-2"],
  "tags": ["tag-uuid-1"],
  "card_types": ["manual", "source"],
  "date_range": {
    "field": "created_at",
    "last_n_days": 7
  },
  "field_filters": [
    {
      "field": "priority",
      "operator": "equals",
      "value": "high"
    }
  ]
}
```

### Selection Process

```
Apply Filters in Order:
  1. Get cards from view_ids (if specified)
  2. Filter by tags
  3. Filter by card_types
  4. Filter by date_range
  5. Filter by field_filters
  ↓
Result: Filtered card set for delivery
```

## Template System

### Available Variables

```handlebars
{{#each cards}}
  {{this.id}}              - Card ID
  {{this.title}}           - Card title
  {{this.content}}         - Markdown content
  {{this.data.field}}      - Any data field
  {{this.created_at}}      - Creation date
  {{this.tags}}            - Tag array
{{/each}}

{{cards_count}}            - Total cards
{{output_name}}            - Output name
{{execution_date}}         - Timestamp
```

### Format Examples

**HTML Email**:

```handlebars
<h1>{{output_name}}</h1>
<p>Generated: {{execution_date}}</p>

{{#each cards}}
<div class="card">
  <h2>{{this.title}}</h2>
  <div>{{{this.content}}}</div>
  <small>{{this.created_at}}</small>
</div>
{{/each}}

<p>Total items: {{cards_count}}</p>
```

**Slack Message**:

```handlebars
*{{output_name}}* - {{execution_date}}

{{#each cards}}
*{{this.title}}*
{{this.content}}
---
{{/each}}

_{{cards_count}} updates_
```

**Plain Text**:

```handlebars
{{output_name}}
{{execution_date}}

{{#each cards}}
{{this.title}}
{{this.content}}

---
{{/each}}

Total: {{cards_count}}
```

## Execution Flow

```
Output Triggered
  ↓
Apply Card Filter
  ├── Get matching cards
  └── Sort by created_at DESC
  ↓
Apply Template
  ├── Render with Handlebars
  ├── Convert markdown to HTML (if needed)
  └── Format for integration
  ↓
Get Integration Handler
  ↓
Send via Integration
  ├── Call handler.send(config, formatted_content)
  ├── Handler delivers to external system
  └── Return delivery result
  ↓
Log Execution
  ├── status = 'success' | 'failure'
  ├── cards_sent = count
  └── delivery_id from integration
  ↓
Update Output
  └── Calculate next_run_at
```

## Integration-Specific Configurations

### Email (Mailchimp, SendGrid)

```json
{
  "list_id": "subscribers",
  "from_name": "Your Newsletter",
  "subject": "Weekly Update",
  "preview_text": "This week's highlights"
}
```

### Messaging (Slack, Discord)

```json
{
  "channel_id": "#general",
  "username": "Symposium Bot",
  "icon_emoji": ":robot_face:"
}
```

### Webhook

```json
{
  "url": "https://api.example.com/webhook",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer token",
    "Content-Type": "application/json"
  }
}
```

## Use Cases

1. **Email Newsletters**: Weekly digest to subscribers
2. **Team Notifications**: New high-priority items to Slack
3. **External Sync**: Push updates to other systems
4. **Report Generation**: Daily summaries via email
5. **Webhook Triggers**: Notify external services of changes

## Best Practices

- **Clear Filters**: Ensure filters select correct cards
- **Test Templates**: Preview before enabling schedule
- **Reasonable Frequency**: Don't spam recipients
- **Handle Empty Results**: Template should work with 0 cards
- **Monitor Delivery**: Check execution logs for failures
- **Respect Rates**: Follow integration rate limits

## Error Handling

```
Delivery Failures:
  - Log error details
  - Mark execution as failed
  - Keep output active (will retry on next schedule)
  - Notify user if persistent failures

Zero Cards Selected:
  - Option 1: Skip delivery (no-op)
  - Option 2: Send "nothing new" message
  - Configurable per output
```

---

**Next**: [Scheduler](08-scheduler.md)
