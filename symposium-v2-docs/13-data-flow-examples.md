# Data Flow Examples

## Overview

This chapter provides end-to-end scenarios showing how different components of
Symposium v2 work together.

## Example 1: Daily News Digest

**Goal**: Automatically collect AI news and email a daily digest

### Setup

```
1. Create Integration: "My Perplexity API"
   - Type: Perplexity
   - Credentials: API key

2. Create Source: "Daily AI News"
   - Integration: My Perplexity API
   - Config: { query: "latest AI developments", model: "sonar-medium" }
   - Tags: ["ai", "news", "automated"]
   - Schedule: Daily at 8am

3. Create Source: "GitHub AI Trending"
   - Integration: GitHub API
   - Config: { query: "topic:ai stars:>100", sort: "stars" }
   - Tags: ["ai", "github", "automated"]
   - Schedule: Daily at 8am

4. Create Query: "Morning AI Brief"
   - Sources: [Daily AI News, GitHub AI Trending]
   - Template: Combine both sources
   - Tags: ["digest", "automated"]
   - Schedule: Daily at 8:30am (after sources)

5. Create View: "AI Digest Cards"
   - Filter: Tags include "digest", last 1 day

6. Create Output: "Email AI Digest"
   - Integration: Mailchimp
   - Filter: Use "AI Digest Cards" view
   - Template: HTML email format
   - Schedule: Daily at 9am (after query)
```

### Daily Execution Flow

```
8:00am - Scheduler triggers sources
  ├── Execute "Daily AI News"
  │   ├── Call Perplexity API
  │   ├── Get AI developments
  │   └── Create source card
  │
  └── Execute "GitHub AI Trending"
      ├── Call GitHub API
      ├── Get trending repos
      └── Create source card

8:30am - Scheduler triggers query
  └── Execute "Morning AI Brief"
      ├── Execute both sources
      ├── Collect results
      ├── Apply aggregation template
      └── Create query card (digest)

9:00am - Scheduler triggers output
  └── Execute "Email AI Digest"
      ├── Filter cards (last 24h, digest tag)
      ├── Get query card from 8:30am
      ├── Apply email template
      ├── Send via Mailchimp
      └── Deliver to subscribers
```

**Result**: Subscribers receive daily AI news digest at 9am

## Example 2: Project Portfolio Website

**Goal**: Public showcase of completed projects

### Setup

```
1. Create Schema: "Project"
   - Fields: title, description, tech_stack, github_url, demo_url
   
2. Create Manual Cards (one per project)
   - Schema: Project
   - Content: Project details in markdown
   - Tags: ["portfolio", "published"]

3. Create View: "Published Projects"
   - Filter: Schema = Project, Tags include "published"
   - Sort: created_at DESC
   - Display: Grid

4. Create Showcase: "My Portfolio"
   - View: Published Projects
   - Layout: Grid with categories
   - Theme: Professional blue
   - URL: /s/portfolio
```

### User Flow

```
User Creates Project Card
  ↓
Fill Project Schema Fields
  ├── Title: "Task Manager App"
  ├── Tech: ["React", "Node.js", "PostgreSQL"]
  ├── GitHub: "github.com/..."
  └── Demo: "demo.example.com"
  ↓
Write Project Description
  └── Markdown with screenshots
  ↓
Add Tags: ["portfolio", "published", "web-app"]
  ↓
Save Card
  ↓
Showcase Auto-Regenerates
  ├── Detects card change
  ├── Re-renders HTML
  └── Updates public URL
  ↓
Visitors See Updated Portfolio
```

**Result**: Auto-updating public portfolio website

## Example 3: Team Status Dashboard

**Goal**: External dashboard shows project metrics

### Setup

```
1. Create Schema: "Metric"
   - Fields: metric_name, value, unit, status

2. Create Sources for various metrics
   - GitHub commits: Pull from GitHub API
   - Test coverage: Pull from CI/CD
   - Performance: Pull from monitoring
   - All tagged: ["metrics", "dashboard"]
   - Schedule: Every hour

3. Create View: "Dashboard Metrics"
   - Filter: Tags include "metrics", last 24 hours
   - Sort: created_at DESC

4. Create Connection Policy: "Dashboard Access"
   - Type: Output
   - Views: ["Dashboard Metrics"]
   - Expiration: 1 year
   - Generate: sym_abc123...
```

### Dashboard Integration

```
External Dashboard
  ↓
Every 5 minutes:
  GET /api/external/cards?connection=sym_abc123...
  ↓
Receive Latest Metrics Cards
  ├── Parse card data
  ├── Extract metric values
  ├── Update dashboard display
  └── Show real-time status
```

**Result**: Live dashboard with auto-updating metrics

## Example 4: Form Submission Pipeline

**Goal**: Website form creates cards in Symposium

### Setup

```
1. Create Schema: "Contact Form"
   - Fields: name, email, message, source

2. Create Connection Policy: "Form Submissions"
   - Type: Input
   - Schema: Contact Form
   - Tags: ["form-submission", "inbox"]
   - Generate: sym_xyz789...

3. Create View: "New Submissions"
   - Filter: Tags include "inbox", not tagged "processed"
   - Sort: created_at DESC

4. Website Form Integration
   - Action: POST to Symposium API
   - Authentication: Connection string
```

### Submission Flow

```
User Submits Website Form
  ↓
Frontend JavaScript
  POST /api/external/cards?connection=sym_xyz789...
  Body: {
    data: {
      name: "John Doe",
      email: "john@example.com",
      message: "...",
      source: "website"
    },
    content: "Contact form submission from John Doe\n\n..."
  }
  ↓
Symposium Validates & Creates Card
  ├── Check policy active
  ├── Validate schema
  ├── Create card
  ├── Apply tags: ["form-submission", "inbox"]
  └── Return success
  ↓
Team Views "New Submissions"
  ├── See new card
  ├── Review message
  ├── Take action
  └── Tag as "processed"
```

**Result**: Centralized form submissions in Symposium

## Example 5: Research Paper Aggregator

**Goal**: Weekly digest of ML research papers

### Setup

```
1. Create Sources (one per venue)
   - ArXiv ML papers
   - Papers with Code
   - Conference proceedings
   - All schedule: Daily
   - Tags: ["research", "papers", "automated"]

2. Create Query: "Weekly Research Digest"
   - Sources: All paper sources
   - Template: Categorized by venue
   - Tags: ["digest", "research", "weekly"]
   - Schedule: Every Monday 8am

3. Create View: "Research Digest"
   - Filter: Tags include "digest", "research"
   - Date: Last 7 days

4. Create Showcase: "Research Feed"
   - View: Research Digest
   - Layout: Timeline
   - Public: Yes

5. Create Output: "Email Research Digest"
   - Integration: Email service
   - Filter: Weekly digest cards
   - Schedule: Monday 9am
```

### Weekly Cycle

```
Monday-Sunday: Daily paper collection
  ├── Each source runs daily
  ├── Creates cards for new papers
  └── Tags with "research", "papers"

Monday 8am: Query aggregates
  ├── Collect week's papers
  ├── Group by venue/topic
  ├── Create digest card
  └── Tag with "digest", "weekly"

Monday 9am: Outputs deliver
  ├── Email subscribers
  └── Update public showcase

Ongoing:
  └── Showcase auto-updates as papers added
```

**Result**: Automated research paper tracking and distribution

## Common Patterns

### Pattern: Real-time Monitoring

```
1. Sources poll APIs (every 5-15 min)
2. Create cards for new data
3. View filters recent cards
4. Dashboard/showcase displays live
```

### Pattern: Daily Briefing

```
1. Multiple sources collect data (morning)
2. Query aggregates results (mid-morning)
3. Output delivers digest (morning)
4. Team reviews in Cards tab
```

### Pattern: External Integration

```
1. External system uses connection policy
2. Reads cards via API (output policy)
   OR writes cards via API (input policy)
3. Symposium processes as normal
4. Data flows bidirectionally
```

### Pattern: Public Showcase

```
1. Create cards (manual or automated)
2. Filter with view
3. Showcase generates HTML
4. Public URL shares knowledge
5. Auto-updates on changes
```

## Best Practices

1. **Stagger Schedules**: Space out dependent operations
2. **Use Tags Wisely**: Enable flexible filtering
3. **Monitor Executions**: Check for failures
4. **Test Filters**: Ensure views select correct cards
5. **Cache Strategically**: Reduce regeneration overhead
6. **Set Reasonable Rates**: Don't overwhelm APIs
7. **Plan Dependencies**: Sources before queries before outputs

---

**Documentation Complete**

Return to [README](README.md) for navigation.
