// Migration: Add demo cards showcasing the extensible renderer capabilities
import { sql } from '../client.ts';

export async function up() {
  console.log('  Running migration: Add renderer demo cards');
  
  // Get schemas and tags
  const schemas = await sql`SELECT id, name FROM schemas`;
  const tags = await sql`SELECT id, name FROM tags`;
  
  const schemaMap: Record<string, string> = {};
  const tagMap: Record<string, string> = {};
  
  for (const schema of schemas) {
    schemaMap[schema.name] = schema.id;
  }
  
  for (const tag of tags) {
    tagMap[tag.name] = tag.id;
  }
  
  // Helper function to add cards
  async function addCard(schemaName: string, data: any, content: string, tagNames: string[]) {
    if (!schemaMap[schemaName]) {
      console.log(`  ⚠️  Schema '${schemaName}' not found, skipping card`);
      return;
    }
    
    const result = await sql`
      INSERT INTO content_cards (schema_id, schema_name, user_id, data, content)
      VALUES (${schemaMap[schemaName]}, ${schemaName}, gen_random_uuid(), ${JSON.stringify(data)}, ${content})
      RETURNING id
    `;
    
    for (const tagName of tagNames) {
      if (tagMap[tagName]) {
        await sql`INSERT INTO card_tags (card_id, tag_id) VALUES (${result[0].id}, ${tagMap[tagName]}) ON CONFLICT DO NOTHING`;
      }
    }
  }
  
  // 1. MERMAID DIAGRAM DEMO - System Architecture
  await addCard('Article',
    { 
      title: "Knowledge Base System Architecture",
      author: "System Design Team",
      published_date: "2024-02-25"
    },
    `# Knowledge Base System Architecture

Our application follows a modern full-stack architecture with clear separation of concerns.

## System Components

\`\`\`mermaid
graph TD
    User[User] --> Project[Project]
    Project --> Objective[Objective]
    
    Objective --> Chat[Chat System]
    Objective --> ActiveContext[Active Context]
    
    Chat --> ChatHistory[Chat History]
    Chat --> LLMSelection[LLM Selection]
    Chat --> Messages[Messages]
    
    Messages --> UserMsg[User Messages]
    Messages --> AssistantMsg[Assistant Messages]
    Messages --> ExtMsg[Extension Messages]
    
    UserMsg --> MsgActions[Message Actions]
    AssistantMsg --> MsgActions
    ExtMsg --> MsgActions
    
    MsgActions --> Delete[Delete]
    MsgActions --> Hide[Hide from Prompt]
    MsgActions --> Convert[Convert to Card]
    
    ActiveContext --> KnowledgeBase[Knowledge Base]
    
    KnowledgeBase --> ContentCards[Content Cards]
    KnowledgeBase --> Tags[Tags]
    KnowledgeBase --> Views[Saved Views]
    
    ContentCards --> Schema[Schema/Type]
    ContentCards --> Fields[Fields]
    ContentCards --> ContentField[Content Field]
    ContentCards --> TagRefs[Tag References]
    ContentCards --> OriginField[Origin Field]
    
    Schema --> FieldTypes[Field Types]
    
    Tags --> FilterByTag[Filter by Tag]
    Views --> FilterByView[Filter by View]
    
    FilterByTag --> ActiveContext
    FilterByView --> ActiveContext
    
    Extensions[Extensions] --> ExtAPI[3rd Party APIs]
    Extensions --> ExtCards[Extension Cards]
    
    ExtCards --> StoreKB[Store in KB]
    ExtCards --> InsertChat[Insert in Chat]
    
    StoreKB --> ContentCards
    
    ExtCards --> Refresh[Refresh Capability]
    Refresh --> Schedule[Scheduled Updates]
    
    ContentCards --> Showcases[Showcases]
    Showcases --> Export[Export HTML/SPA]
    
    User --> GlobalPrompt[Global System Prompt]
    Project --> GlobalPrompt
    Objective --> GlobalPrompt
    Schema --> GlobalPrompt
    ActiveContext --> GlobalPrompt
    ChatHistory --> GlobalPrompt
    
    GlobalPrompt --> LLM[LLM API]
    LLM --> AssistantMsg
    LLM --> GenerateCards[Generate Content Cards]
    
    GenerateCards --> ContentCards
    
    style GlobalPrompt fill:#ff6b6b
    style KnowledgeBase fill:#4ecdc4
    style ContentCards fill:#45b7d1
    style Extensions fill:#96ceb4
    style Showcases fill:#ffeaa7
\`\`\`

## Key Features

- **Dynamic Content Cards**: Flexible schema-based content storage
- **Rich Context Management**: Filter and organize with tags and views
- **Extensible Design**: Plugin-based extensions for third-party integrations
- **Export Capabilities**: Generate standalone showcases`,
    ["Backend", "Frontend"]
  );
  
  // 2. MERMAID SEQUENCE DIAGRAM - API Flow
  await addCard('Note',
    { 
      title: "API Authentication Flow",
      category: "work"
    },
    `# API Authentication Flow

Understanding how authentication works in our system.

## Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database
    participant AuthService
    
    User->>Frontend: Enter credentials
    Frontend->>API: POST /api/auth/login
    API->>Database: Verify credentials
    Database-->>API: User data
    API->>AuthService: Generate JWT
    AuthService-->>API: JWT token
    API-->>Frontend: Return token + user data
    Frontend->>Frontend: Store token in localStorage
    Frontend-->>User: Show dashboard
    
    Note over User,AuthService: Subsequent requests
    
    User->>Frontend: Request protected resource
    Frontend->>API: GET /api/cards (with JWT)
    API->>AuthService: Validate token
    AuthService-->>API: Token valid
    API->>Database: Fetch cards
    Database-->>API: Card data
    API-->>Frontend: Return cards
    Frontend-->>User: Display cards
\`\`\`

## Security Considerations

- Tokens expire after 24 hours
- Refresh tokens for seamless re-authentication
- HTTPS only in production
- Rate limiting on auth endpoints`,
    ["Backend", "Security"]
  );
  
  // 3. CHART DEMO - JSON Format (Bar Chart)
  await addCard('Task',
    { 
      title: "Q1 2024 Performance Metrics",
      priority: "medium",
      status: "done",
      assignee: "Analytics Team",
      due_date: "2024-03-31"
    },
    `# Q1 2024 Performance Report

Our performance metrics for the first quarter of 2024.

## Key Performance Indicators

\`\`\`chart
{
  "type": "bar",
  "data": {
    "labels": ["January", "February", "March"],
    "datasets": [{
      "label": "Revenue ($K)",
      "data": [45, 67, 82],
      "backgroundColor": "#4ecdc4"
    }, {
      "label": "New Users",
      "data": [120, 180, 250],
      "backgroundColor": "#45b7d1"
    }]
  },
  "options": {
    "responsive": true,
    "plugins": {
      "title": {
        "display": true,
        "text": "Q1 2024 Growth Metrics"
      }
    },
    "scales": {
      "y": {
        "beginAtZero": true
      }
    }
  }
}
\`\`\`

## Analysis

- **Revenue Growth**: 82% increase from January to March
- **User Acquisition**: Consistent growth, 108% increase
- **Trend**: Strong upward trajectory

## Next Steps

- Continue current marketing strategies
- Focus on user retention
- Expand to new markets`,
    ["Feature", "Backend"]
  );
  
  // 4. CHART DEMO - DSV Format (Line Chart)
  await addCard('Note',
    { 
      title: "Server Response Time Analysis",
      category: "work"
    },
    `# Server Performance Monitoring

Tracking our API response times over the past week.

## Response Times (ms)

\`\`\`chart:line
Day,API Endpoint 1,API Endpoint 2,Database Queries
Monday,45,32,28
Tuesday,42,35,30
Wednesday,48,38,32
Thursday,44,33,29
Friday,41,31,27
Saturday,43,34,28
Sunday,46,36,31
\`\`\`

## Observations

- All endpoints maintain sub-50ms response times
- Database queries are the fastest component
- Friday shows best performance (likely lower traffic)
- Response times are stable and consistent

## Optimization Opportunities

1. **Caching Strategy**: Implement Redis for frequently accessed data
2. **Query Optimization**: Review slow query logs
3. **CDN**: Serve static assets from edge locations
4. **Connection Pooling**: Already implemented, working well`,
    ["Backend", "Performance"]
  );
  
  // 5. CHART DEMO - Pie Chart (JSON)
  await addCard('Article',
    { 
      title: "Technology Stack Distribution",
      author: "Engineering Team",
      published_date: "2024-02-20"
    },
    `# Our Technology Stack

A breakdown of the technologies we use in production.

## Stack Distribution

\`\`\`chart
{
  "type": "pie",
  "data": {
    "labels": ["TypeScript", "PostgreSQL", "Deno", "React", "CSS"],
    "datasets": [{
      "data": [35, 25, 20, 15, 5],
      "backgroundColor": [
        "#4ecdc4",
        "#45b7d1",
        "#96ceb4",
        "#ffeaa7",
        "#ff6b6b"
      ]
    }]
  },
  "options": {
    "responsive": true,
    "plugins": {
      "legend": {
        "position": "right"
      },
      "title": {
        "display": true,
        "text": "Technology Stack by Usage"
      }
    }
  }
}
\`\`\`

## Technology Choices

### TypeScript (35%)
- Type safety across the stack
- Better tooling and IDE support
- Reduced runtime errors

### PostgreSQL (25%)
- Robust relational database
- JSONB for flexible schemas
- Excellent performance

### Deno (20%)
- Modern JavaScript runtime
- Built-in TypeScript support
- Secure by default

### React (15%)
- Component-based UI
- Large ecosystem
- Easy to maintain

### CSS (5%)
- Custom NYT-inspired design
- No framework dependencies
- Clean and maintainable`,
    ["Frontend", "Backend"]
  );
  
  // 6. TABLE DEMO - Feature Comparison
  await addCard('Article',
    { 
      title: "Database Comparison Guide",
      author: "Data Architect",
      published_date: "2024-02-15"
    },
    `# Database Technology Comparison

Choosing the right database for your project.

## Feature Comparison

| Database | Type | ACID | Scalability | Query Language | Best For |
|----------|------|------|-------------|----------------|----------|
| PostgreSQL | Relational | ✅ Yes | Vertical | SQL | Complex queries, JSONB |
| MongoDB | Document | ⚠️ Partial | Horizontal | MQL | Flexible schemas |
| Redis | Key-Value | ⚠️ Partial | Horizontal | Commands | Caching, sessions |
| Cassandra | Wide-Column | ❌ No | Horizontal | CQL | Time-series, IoT |
| Neo4j | Graph | ✅ Yes | Vertical | Cypher | Relationships, networks |

## Performance Metrics

| Database | Read Speed | Write Speed | Storage | Memory Usage |
|----------|------------|-------------|---------|--------------|
| PostgreSQL | Fast | Fast | Efficient | Moderate |
| MongoDB | Very Fast | Fast | Good | High |
| Redis | Extremely Fast | Extremely Fast | In-Memory | Very High |
| Cassandra | Fast | Very Fast | Excellent | Moderate |
| Neo4j | Fast | Moderate | Good | High |

## Use Case Recommendations

### PostgreSQL
- Traditional applications with complex relationships
- Applications requiring ACID compliance
- Systems with structured data

### MongoDB
- Content management systems
- Catalogs with varying attributes
- Real-time analytics

### Redis
- Session storage
- Real-time leaderboards
- Pub/sub messaging

### Cassandra
- Time-series data
- IoT sensor data
- Write-heavy workloads

### Neo4j
- Social networks
- Recommendation engines
- Fraud detection`,
    ["Database", "Backend"]
  );
  
  // 7. COMPREHENSIVE DEMO - All Features Combined
  await addCard('Article',
    { 
      title: "Comprehensive Renderer Showcase",
      author: "Demo Team",
      published_date: "2024-02-25"
    },
    `# Comprehensive Renderer Feature Showcase

This card demonstrates all available rendering capabilities in our knowledge base system.

## 1. Mermaid Diagram: Development Workflow

\`\`\`mermaid
graph LR
    A[Start] --> B{Code Review?}
    B -->|Approved| C[Merge to Main]
    B -->|Changes Needed| D[Update Code]
    D --> B
    C --> E[Run Tests]
    E -->|Pass| F[Deploy to Staging]
    E -->|Fail| G[Fix Issues]
    G --> E
    F --> H[QA Testing]
    H -->|Approved| I[Deploy to Production]
    H -->|Issues| G
    I --> J[Monitor]
    
    style A fill:#4ecdc4
    style I fill:#4caf50
    style J fill:#ffeaa7
\`\`\`

## 2. Performance Metrics Chart

\`\`\`chart
{
  "type": "line",
  "data": {
    "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
    "datasets": [{
      "label": "Page Load Time (ms)",
      "data": [850, 720, 650, 580],
      "borderColor": "#4ecdc4",
      "backgroundColor": "rgba(78, 205, 196, 0.1)",
      "tension": 0.4
    }, {
      "label": "API Response Time (ms)",
      "data": [120, 95, 85, 75],
      "borderColor": "#45b7d1",
      "backgroundColor": "rgba(69, 183, 209, 0.1)",
      "tension": 0.4
    }]
  },
  "options": {
    "responsive": true,
    "plugins": {
      "title": {
        "display": true,
        "text": "Performance Improvements Over Time"
      }
    },
    "scales": {
      "y": {
        "beginAtZero": true,
        "title": {
          "display": true,
          "text": "Time (milliseconds)"
        }
      }
    }
  }
}
\`\`\`

## 3. Team Velocity (Simple DSV Chart)

\`\`\`chart:bar
Sprint,Story Points,Bugs Fixed,Features Delivered
Sprint 1,32,8,3
Sprint 2,38,5,4
Sprint 3,42,6,5
Sprint 4,45,4,6
\`\`\`

## 4. Feature Comparison Table

| Feature | Free Plan | Pro Plan | Enterprise |
|---------|-----------|----------|------------|
| Content Cards | 100 | Unlimited | Unlimited |
| Schemas | 3 | 10 | Unlimited |
| Tags | 20 | 100 | Unlimited |
| Team Members | 1 | 5 | Unlimited |
| API Access | ❌ | ✅ | ✅ |
| Custom Branding | ❌ | ❌ | ✅ |
| SSO | ❌ | ❌ | ✅ |
| Support | Email | Priority | Dedicated |
| Price | Free | $29/mo | Custom |

## 5. Code Example

Here's how to use our extensible renderer:

\`\`\`typescript
import { contentRenderer } from './content-renderer.js';
import { mermaidRenderer } from './renderers/mermaid-renderer.js';
import { chartRenderer } from './renderers/chart-renderer.js';

// Register plugins
contentRenderer.registerPlugin('mermaid', mermaidRenderer);
contentRenderer.registerPlugin('chart', chartRenderer);

// Render content
const html = await contentRenderer.render(content);

// Initialize after inserting into DOM
await contentRenderer.initialize(container);
\`\`\`

## 6. Architecture Decision

\`\`\`mermaid
graph TD
    A[Markdown Content] --> B[Extract Special Blocks]
    B --> C{Has Plugins?}
    C -->|Yes| D[Render with Plugin]
    C -->|No| E[Render as Code Block]
    D --> F[Replace Placeholder]
    E --> F
    F --> G[Process Markdown]
    G --> H[Return HTML]
    H --> I[Insert into DOM]
    I --> J[Initialize Plugins]
    
    style A fill:#96ceb4
    style H fill:#4ecdc4
    style J fill:#ffeaa7
\`\`\`

## Summary

This showcase demonstrates:
- ✅ Mermaid flowcharts and sequence diagrams
- ✅ Chart.js visualizations (bar, line, pie)
- ✅ Simple DSV format charts
- ✅ Markdown tables with styling
- ✅ Code syntax highlighting
- ✅ Mixed content rendering

All features work seamlessly together in a single content card!`,
    ["Frontend", "Feature", "Design"]
  );
  
  console.log('  ✅ Added 7 renderer demonstration cards');
  console.log('  ✅ Migration completed successfully');
}

export async function down() {
  console.log('  Rolling back: Remove renderer demo cards');
  console.log('  ⚠️  Manual cleanup required if needed');
  console.log('  ✅ Rollback completed');
}
