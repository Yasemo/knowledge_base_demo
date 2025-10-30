# Integration System

## Overview

The Integration System is Symposium v2's extensible framework for connecting to
external services. It enables automated data collection (sources), content
delivery (outputs), and the entire orchestration pipeline.

## Architecture

### Two-Level Design

```
┌─────────────────────────────────────────────────────┐
│              INTEGRATION ARCHITECTURE                │
└─────────────────────────────────────────────────────┘

Level 1: Integration Types (Dev-Defined Blueprints)
├── Perplexity AI
├── GitHub API
├── Mailchimp
├── Slack
├── Airtable
└── [More added by developers]

Level 2: Integration Instances (User Configurations)
├── "My Perplexity API" → credentials
├── "Work GitHub" → credentials  
├── "Newsletter List" → credentials
├── "Team Slack" → credentials
└── [Multiple instances per type]

Usage:
Integration Instance → Used by → Sources/Outputs
```

**Why Two Levels?**

1. **Separation of concerns**: Devs define capabilities, users provide
   credentials
2. **Reusability**: One type → many user instances
3. **Security**: Credentials stored separately from configuration
4. **Flexibility**: Same integration for different use cases

## Integration Types

### Developer-Defined Blueprints

Integration types are **added by developers** and define:

```
Integration Type
├── Identity
│   ├── name (unique identifier)
│   ├── display_name (UI label)
│   ├── category (source | output | both)
│   ├── description (what it does)
│   └── icon (visual identifier)
│
├── Authentication Schema
│   └── Fields needed to authenticate
│       (API keys, OAuth tokens, etc.)
│
├── Source Schema (if source-capable)
│   └── Fields needed to configure API calls
│       (query params, endpoints, options)
│
├── Output Schema (if output-capable)
│   └── Fields needed to configure deliveries
│       (recipients, formatting, destinations)
│
├── Capabilities
│   ├── supports_scheduling (boolean)
│   ├── supports_refresh (boolean)
│   └── rate_limit_per_minute (integer)
│
└── Handler Module
    └── Code that executes integrations
        (makes API calls, processes responses)
```

### Data Structure

```json
{
  "id": "uuid",
  "name": "perplexity",
  "display_name": "Perplexity AI",
  "category": "source",
  "description": "AI-powered search and research",
  "icon": "🔍",

  "auth_schema": {
    "fields": [
      {
        "name": "api_key",
        "type": "password",
        "label": "API Key",
        "required": true,
        "help": "Get your API key from perplexity.ai/settings"
      }
    ]
  },

  "source_schema": {
    "fields": [
      {
        "name": "query",
        "type": "textarea",
        "label": "Search Query",
        "required": true,
        "placeholder": "What would you like to research?"
      },
      {
        "name": "model",
        "type": "select",
        "label": "Model",
        "required": true,
        "options": [
          { "value": "sonar-small-online", "label": "Sonar Small (Fast)" },
          {
            "value": "sonar-medium-online",
            "label": "Sonar Medium (Balanced)"
          },
          { "value": "sonar-large-online", "label": "Sonar Large (Best)" }
        ],
        "default": "sonar-medium-online"
      },
      {
        "name": "temperature",
        "type": "number",
        "label": "Temperature",
        "min": 0,
        "max": 2,
        "step": 0.1,
        "default": 0.2
      }
    ]
  },

  "capabilities": {
    "supports_scheduling": true,
    "supports_refresh": true,
    "rate_limit_per_minute": 20
  },

  "handler_module": "integrations/perplexity.ts"
}
```

### Integration Categories

**Source Integrations** (category: "source")

- Purpose: Fetch data, create content cards
- Examples: Perplexity, GitHub, RSS, Weather API
- Require: source_schema
- Output: Content card data

**Output Integrations** (category: "output")

- Purpose: Deliver content to external systems
- Examples: Mailchimp, Slack, Webhook
- Require: output_schema
- Output: Delivery confirmation

**Both** (category: "both")

- Can act as source OR output
- Example: Notion (read pages as source, create pages as output)
- Require: Both schemas

## Integration Instances

### User-Created Configurations

Users create instances of integration types with their credentials:

```
Integration Instance
├── Identity
│   ├── id (UUID)
│   ├── user_id (owner)
│   ├── type_id (references integration type)
│   └── name (user-friendly label)
│
├── Credentials (encrypted)
│   └── Keys, tokens, passwords per auth_schema
│
├── Configuration
│   └── Optional additional settings
│
└── Status
    ├── is_active (can be disabled)
    └── last_used_at (tracking)
```

### Data Structure

```json
{
  "id": "integration-uuid",
  "user_id": "user-uuid",
  "type_id": "perplexity-type-uuid",
  "name": "My Perplexity API",
  "credentials": {
    "api_key": "sk-...encrypted..."
  },
  "config": {
    "default_temperature": 0.3,
    "preferred_model": "sonar-medium-online"
  },
  "is_active": true,
  "last_used_at": "2024-10-30T09:00:00Z",
  "created_at": "2024-10-15T10:00:00Z"
}
```

### Credential Security

**Storage**:

```
1. User enters credentials in UI
2. Client sends to server over HTTPS
3. Server encrypts using encryption key from env
4. Encrypted value stored in database
5. Never exposed in API responses
```

**Usage**:

```
1. System needs to use integration
2. Retrieves encrypted credentials
3. Decrypts in memory
4. Makes API call
5. Immediately discards decrypted value
6. Never logs credentials
```

**Best Practices**:

- Use environment variable for encryption key
- Rotate encryption keys periodically
- Audit credential access
- Allow users to regenerate/revoke
- Use OAuth when available

## Integration Handlers

### Handler Interface

Each integration type has a handler module that implements:

**For Source Integrations**:

```
Handler
├── execute(integration, config) → CardData
│   ├── Makes API call
│   ├── Processes response
│   ├── Extracts structured data
│   ├── Formats markdown content
│   └── Returns card-ready data
│
└── formatResponse(apiResponse) → Markdown
    └── Converts API response to readable content
```

**For Output Integrations**:

```
Handler
└── send(integration, config, cards) → DeliveryResult
    ├── Formats cards using template
    ├── Applies output configuration
    ├── Makes API call to deliver
    └── Returns success/failure
```

### Handler Conceptual Examples

**Perplexity Source Handler**:

```
Input:
  integration.credentials.api_key = "sk-..."
  config.query = "latest AI developments"
  config.model = "sonar-medium-online"
  
Process:
  1. Call Perplexity API
  2. Get search results with citations
  3. Extract metadata (citations, confidence)
  4. Format as markdown
  
Output:
  {
    title: "Perplexity: latest AI developments",
    data: {
      query: "latest AI developments",
      model: "sonar-medium-online",
      citations_count: 5,
      confidence: 0.94
    },
    content: "## Search Results\n\n### Key Points\n...",
    api_request: {
      integration_id: "uuid",
      config: {...},
      timestamp: "2024-10-30T09:00:00Z"
    }
  }
```

**GitHub Source Handler**:

```
Input:
  integration.credentials.token = "ghp_..."
  config.query = "language:typescript stars:>1000"
  config.sort = "stars"
  
Process:
  1. Call GitHub Search API
  2. Get repository results
  3. Extract repo metadata
  4. Format as markdown list
  
Output:
  {
    title: "GitHub: Top TypeScript Projects",
    data: {
      query: "language:typescript stars:>1000",
      results_count: 30,
      total_stars: 125000
    },
    content: "## Trending TypeScript Repositories\n\n1. **microsoft/TypeScript**\n   Stars: 95k...",
    api_request: {...}
  }
```

**Mailchimp Output Handler**:

```
Input:
  integration.credentials.api_key = "..."
  config.list_id = "subscribers"
  config.campaign_name = "Weekly Digest"
  config.subject = "Your Weekly Update"
  cards = [card1, card2, card3]
  template = "{{#each cards}}...{{/each}}"
  
Process:
  1. Apply template to cards → HTML content
  2. Create Mailchimp campaign
  3. Set recipients, subject, content
  4. Send or schedule campaign
  
Output:
  {
    success: true,
    delivery_id: "campaign-123",
    recipients_count: 1500,
    scheduled_for: "2024-11-01T09:00:00Z"
  }
```

## Integration Flow Patterns

### Source Flow

```
┌─────────────────────────────────────────────────┐
│            SOURCE EXECUTION FLOW                 │
└─────────────────────────────────────────────────┘

Trigger (Manual or Scheduled)
  ↓
Get Source Configuration
  ├── source.integration_id → Integration Instance
  ├── source.config → API parameters
  └── source.tags → Tags for card
  ↓
Get Integration Type
  ├── Validate capabilities
  ├── Check rate limits
  └── Load handler module
  ↓
Execute Handler
  ├── Decrypt credentials
  ├── Make API call
  ├── Handle response
  ├── Format data & content
  └── Return card data
  ↓
Create Content Card
  ├── card_type = 'source'
  ├── source_id = source.id
  ├── data = handler output
  ├── content = formatted markdown
  ├── api_request = original request
  └── tags = source.tags
  ↓
Log Execution
  ├── execution_id
  ├── status (success/failure)
  ├── duration
  └── result summary
  ↓
Update Source
  ├── last_executed_at = now
  ├── execution_count += 1
  └── next_run_at = calculate from cron
```

### Output Flow

```
┌─────────────────────────────────────────────────┐
│            OUTPUT EXECUTION FLOW                 │
└─────────────────────────────────────────────────┘

Trigger (Manual or Scheduled)
  ↓
Get Output Configuration
  ├── output.integration_id → Integration Instance
  ├── output.filter → Card selection criteria
  ├── output.template → Formatting template
  └── output.config → Delivery settings
  ↓
Filter Cards
  ├── Apply view filters
  ├── Apply tag filters
  ├── Apply field filters
  └── Get matching cards
  ↓
Get Integration Type
  ├── Validate capabilities
  ├── Check rate limits
  └── Load handler module
  ↓
Format Content
  ├── Apply template to cards
  ├── Render markdown to HTML (if needed)
  └── Prepare final payload
  ↓
Execute Handler
  ├── Decrypt credentials
  ├── Call external API
  ├── Deliver content
  └── Handle response
  ↓
Log Execution
  ├── execution_id
  ├── status (success/failure)
  ├── cards_sent count
  └── delivery confirmation
  ↓
Update Output
  ├── last_executed_at = now
  ├── execution_count += 1
  └── next_run_at = calculate from cron
```

## Built-In Integration Types

### Source Integrations

**Perplexity AI**

- **Purpose**: AI-powered search and research
- **Auth**: API key
- **Config**: Query, model, temperature
- **Output**: Search results with citations
- **Rate Limit**: 20/min

**GitHub API**

- **Purpose**: Repository data, issues, PRs
- **Auth**: Personal access token
- **Config**: Query, filters, sort
- **Output**: Formatted repository/issue data
- **Rate Limit**: 60/min (authenticated)

**RSS/Atom Feed**

- **Purpose**: Blog posts, news feeds
- **Auth**: None (or basic auth)
- **Config**: Feed URL, item count
- **Output**: Parsed feed items
- **Rate Limit**: None

**Weather API**

- **Purpose**: Weather data
- **Auth**: API key
- **Config**: Location, units
- **Output**: Current/forecast weather
- **Rate Limit**: Varies by provider

**Web Scraper**

- **Purpose**: Extract data from websites
- **Auth**: None (or custom)
- **Config**: URL, selectors
- **Output**: Extracted content
- **Rate Limit**: Respect robots.txt

### Output Integrations

**Mailchimp**

- **Purpose**: Email marketing campaigns
- **Auth**: API key
- **Config**: List, campaign settings
- **Delivery**: Email to subscribers
- **Rate Limit**: Varies by plan

**Slack**

- **Purpose**: Team messaging
- **Auth**: Webhook URL or OAuth
- **Config**: Channel, formatting
- **Delivery**: Message to channel
- **Rate Limit**: 1/sec per channel

**Webhook**

- **Purpose**: Generic HTTP POST
- **Auth**: Custom headers/tokens
- **Config**: URL, method, headers
- **Delivery**: JSON payload
- **Rate Limit**: None (respect target)

**Discord**

- **Purpose**: Community messaging
- **Auth**: Webhook URL
- **Config**: Channel, embeds
- **Delivery**: Message to channel
- **Rate Limit**: 5/2sec per webhook

### Bidirectional Integrations

**Notion**

- **As Source**: Read pages and databases
- **As Output**: Create/update pages
- **Auth**: OAuth token
- **Rate Limit**: 3/sec

**Airtable**

- **As Source**: Read records
- **As Output**: Create/update records
- **Auth**: API key
- **Rate Limit**: 5/sec

## Rate Limiting

### Per-Integration Limits

```
Integration Type Definition:
{
  "rate_limit_per_minute": 20
}

System Tracking:
- Count requests per integration instance
- Track in rolling 60-second window
- Queue requests when approaching limit
- Exponential backoff on 429 errors
```

### Implementation Strategy

```
Rate Limiter
├── Track requests by integration_id
├── Sliding window (60 seconds)
├── Pre-execution check:
│   ├── Count recent requests
│   ├── If under limit → proceed
│   └── If at limit → queue/delay
├── Post-execution:
│   └── Record timestamp
└── Error handling:
    └── If 429 → backoff and retry
```

### Queue Management

```
When rate limit reached:
1. Add request to queue
2. Calculate wait time
3. Schedule for next available slot
4. Notify user of delay
5. Process when slot opens
```

## Error Handling

### Integration Failures

**Types of Errors**:

- Authentication failures (invalid credentials)
- Rate limit exceeded (429)
- API errors (4xx, 5xx)
- Network failures (timeout, connection)
- Invalid response (parsing errors)

**Handling Strategy**:

```
Error Occurs
  ↓
Log Error Details
  ├── Error type
  ├── Error message
  ├── Request details
  ├── Response (if any)
  └── Timestamp
  ↓
Determine Retry Strategy
  ├── Auth error → Don't retry, disable integration
  ├── Rate limit → Backoff and retry
  ├── Server error → Exponential backoff
  ├── Network error → Retry with delay
  └── Invalid response → Don't retry, log for dev
  ↓
Update Integration Status
  ├── If persistent failures → is_active = false
  ├── Notify user of failure
  └── Suggest corrective action
  ↓
Record in Execution Log
  ├── status = 'failure'
  ├── error_message
  └── error_details (full trace)
```

### Partial Success (Queries)

When a query executes multiple sources and some fail:

```
Query Execution
  ↓
Execute Source 1 → Success
Execute Source 2 → Failure
Execute Source 3 → Success
  ↓
Create Card with Available Data
  ├── Include successful sources
  ├── Note missing/failed sources
  ├── Mark as partial success
  └── Include error summary
  ↓
Log Execution
  ├── status = 'partial'
  ├── sources_succeeded = 2
  ├── sources_failed = 1
  └── error_details for failed source
```

## Extension Guide

### Adding New Integration Types

**Step 1: Define Integration Type**

Create configuration in database:

```json
{
  "name": "new_service",
  "display_name": "New Service",
  "category": "source",
  "auth_schema": {...},
  "source_schema": {...},
  "capabilities": {...},
  "handler_module": "integrations/new_service.ts"
}
```

**Step 2: Implement Handler**

Create handler module with required interface:

```
Handler must implement:
- execute(integration, config) for sources
- send(integration, config, cards) for outputs
- Error handling and logging
- Response formatting
```

**Step 3: Register in System**

Add to integration types table:

```
Seed or migrate integration type
System automatically loads on startup
Users can now create instances
```

**Step 4: Document**

Provide documentation:

- What the integration does
- How to get credentials
- Configuration options
- Example use cases
- Rate limits and constraints

### Handler Best Practices

1. **Validate inputs early**: Check config before API calls
2. **Handle all error cases**: Auth, rate limit, network, parsing
3. **Log comprehensively**: But never log credentials
4. **Return consistent format**: Follow CardData interface
5. **Respect rate limits**: Track and queue proactively
6. **Format markdown well**: Users see this content
7. **Include metadata**: Help users understand responses
8. **Enable refresh**: Store api_request for repeatability

## Security Considerations

### Credential Management

**Storage**:

- Encrypt at rest using strong algorithm (AES-256)
- Store encryption key in environment variable
- Never commit encryption key to repository
- Use different keys per environment

**Access**:

- Only decrypt when needed for API call
- Discard decrypted value immediately
- Never log credentials
- Never return in API responses
- Audit all credential access

### API Key Rotation

**Support key rotation**:

1. User enters new credentials
2. System validates with test call
3. If valid → update encrypted value
4. If invalid → keep old value, show error
5. Log rotation event

### OAuth Integration

**For OAuth-based integrations**:

1. Redirect to OAuth provider
2. Receive authorization code
3. Exchange for access token
4. Store encrypted refresh token
5. Auto-refresh before expiry
6. Handle revocation gracefully

## Monitoring & Observability

### Key Metrics

**Per Integration Instance**:

- Request count (success/failure)
- Average response time
- Error rate
- Rate limit hits
- Last successful execution

**Per Integration Type**:

- Total instances created
- Active vs inactive instances
- Aggregate success rate
- Popular configurations

### Logging

**What to Log**:

- Every integration execution (start/complete)
- Authentication events (success/failure)
- Rate limit events (approaching/hit)
- Errors with full context
- Performance metrics

**What NOT to Log**:

- Credentials or tokens
- Full API responses (may contain sensitive data)
- User personal data

### Alerting

**Alert Conditions**:

- Integration failure rate > 10%
- Rate limit hit repeatedly
- Authentication failure (possible revoked key)
- Unusual response times
- API deprecated/changed (parsing errors)

---

**Next**: [Sources](05-sources.md)
