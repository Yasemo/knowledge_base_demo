# Symposium v2 Documentation

> **A Data Orchestration & Knowledge Management Platform**

## Overview

Symposium v2 transforms from a simple knowledge base into a comprehensive data
orchestration platform that automates the collection, aggregation, and
distribution of structured knowledge through integrations, scheduled executions,
and intelligent filtering.

## Documentation Structure

1. **[System Architecture](01-system-architecture.md)** - High-level overview of
   how Symposium v2 works
2. **[Entity Relationships](02-entity-relationships.md)** - Complete data model
   and relationships
3. **[Content Cards](03-content-cards.md)** - The core unit of knowledge
4. **[Integration System](04-integration-system.md)** - External service
   connections
5. **[Sources](05-sources.md)** - Configured API calls that generate cards
6. **[Queries](06-queries.md)** - Multi-source aggregation
7. **[Outputs](07-outputs.md)** - Content delivery to external systems
8. **[Scheduler](08-scheduler.md)** - Unified scheduling architecture
9. **[Filtering & Views](09-filtering-views.md)** - Advanced card selection
10. **[UI Architecture](10-ui-architecture.md)** - Eight-tab interface design
11. **[Showcases](11-showcases.md)** - Public presentation system
12. **[Policies](12-policies.md)** - External access control
13. **[Data Flow Examples](13-data-flow-examples.md)** - End-to-end scenarios

## Core Concepts

### The Content Card

The fundamental unit of information - a schema-driven, markdown-rich knowledge
object that can be:

- **Created manually** by users through forms
- **Generated automatically** by integrations (sources)
- **Aggregated** from multiple sources (queries)

### The Integration System

```
Integration Types (dev-defined blueprints)
    ↓
Integrations (user instances with credentials)
    ↓
    ├── Sources → Generate Content Cards
    ├── Queries → Aggregate Multiple Sources → Generate Content Cards
    └── Outputs → Deliver Cards to External Systems
```

### The Scheduler

A unified system that manages all time-based executions:

- Source executions (generate new cards)
- Query executions (aggregate and create digest cards)
- Output deliveries (send cards to external systems)

## Key Features

### 1. Flexible Data Model

- **Hybrid JSONB approach**: Frequently queried fields in columns, flexible data
  in JSONB
- **Schema-driven forms**: Dynamic UI generation from field definitions
- **Content separation**: Structured `data` + rich markdown `content`

### 2. Boolean Filter Logic

- Complex expressions: `(tag1 AND tag2) OR (tag3 AND NOT tag4)`
- Field-level filtering with operators
- View-based card organization

### 3. Automated Orchestration

- Schedule sources to fetch data automatically
- Chain sources into queries for multi-source digests
- Deliver filtered content on schedules to external systems

### 4. Extensible Architecture

- Plugin-based content rendering
- Integration types added by developers
- Template-based aggregation and formatting

## Quick Start Guide

### Creating Your First Integration

1. Go to **Integrations** tab
2. Select an integration type (e.g., Perplexity)
3. Enter credentials
4. Test connection
5. Save

### Creating a Source

1. Go to **Sources** tab
2. Choose an integration
3. Configure API parameters
4. Select tags for generated cards
5. Optionally enable scheduling

### Creating a Query

1. Go to **Queries** tab
2. Select multiple sources to aggregate
3. Define aggregation template
4. Choose tags for resulting card
5. Enable scheduling if desired

### Setting Up an Output

1. Go to **Outputs** tab
2. Choose output integration (e.g., Mailchimp)
3. Define card filter (which cards to include)
4. Create formatting template
5. Configure schedule

## Design Principles

### 1. Everything is a Card

Manual entries, API responses, and aggregated digests all become content cards
with consistent structure.

### 2. Configuration Over Code

Integration types are dev-defined, but users configure everything through UI
forms generated from schemas.

### 3. Composability

Sources → Queries → Outputs form a composable pipeline where outputs of one
stage become inputs to another.

### 4. Temporal Awareness

The scheduler tracks all time-based operations, providing visibility and control
over automated workflows.

### 5. Access Control

Policies enable secure sharing of filtered card collections with external
systems (input/output).

## Technology Stack Considerations

- **Database**: PostgreSQL with JSONB for flexibility
- **Scheduling**: Cron expressions with timezone support
- **Templating**: Handlebars for aggregation and output formatting
- **Content Rendering**: Plugin-based markdown with special blocks
- **API Design**: RESTful with clear separation of concerns

## Next Steps

1. Read [System Architecture](01-system-architecture.md) for the big picture
2. Review [Entity Relationships](02-entity-relationships.md) to understand data
   connections
3. Explore specific features in their dedicated documents
4. Reference [Data Flow Examples](13-data-flow-examples.md) for practical
   scenarios

---

**Version**: 2.0 (Greenfield Design)\
**Status**: Architectural Documentation\
**Last Updated**: October 2024
