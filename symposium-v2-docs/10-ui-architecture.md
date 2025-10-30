# UI Architecture

## Overview

Symposium v2 uses an **8-tab interface** for organizing all functionality.

```
┌──────────────────────────────────────────────────────────┐
│ Cards | Views | Schemas | Tags | Sources | Queries |     │
│       | Outputs | Showcases | Integrations | Policies    │
└──────────────────────────────────────────────────────────┘
```

## Tab Structure

### 1. Cards Tab

**Purpose**: Browse, create, and manage content cards

**Layout**:

```
┌─────────────────┬──────────────────────────────────┐
│ Views Sidebar   │  Card Display Area               │
│ - All Cards     │                                  │
│ - Recent        │  [Card Grid/List/Table/Carousel] │
│ - Custom Views  │                                  │
│ - + New View    │                                  │
└─────────────────┴──────────────────────────────────┘
```

**Features**:

- Switch between display modes
- Quick filters
- Search across cards
- Bulk operations
- Create new cards

### 2. Views Tab

**Purpose**: Create and manage filter configurations

**Layout**:

```
┌─────────────────────────────────────────────────┐
│ Views List                                      │
│ ┌─────────────────────────────────────────┐   │
│ │ High Priority Tasks              [Edit] │   │
│ │ Schema: Task | Tags: project-a          │   │
│ │ 12 cards                                │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ [+ New View]                                    │
└─────────────────────────────────────────────────┘
```

**Features**:

- Visual filter builder
- Tag selector
- Field filter editor
- Preview results
- Set default view

### 3. Schemas Tab

**Purpose**: Define card structures

**Layout**:

```
┌─────────────────────────────────────────────────┐
│ Schema List          │  Field Editor            │
│ - Task (15 cards)    │  ┌──────────────────┐   │
│ - Note (50 cards)    │  │ Field: Priority  │   │
│ - Article (8 cards)  │  │ Type: Select     │   │
│                      │  │ Required: Yes    │   │
│ [+ New Schema]       │  └──────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Features**:

- Drag-drop field reordering
- Field type picker
- Validation rules
- Preview form
- Card count per schema

### 4. Tags Tab

**Purpose**: Manage tag taxonomy

**Layout**:

```
┌─────────────────────────────────────────────────┐
│ Tags List                                       │
│ 🔴 urgent (5 cards)                  [Edit]    │
│ 🟢 project-alpha (23 cards)          [Edit]    │
│ 🔵 automated (156 cards)             [Edit]    │
│                                                 │
│ [+ New Tag]                                     │
└─────────────────────────────────────────────────┘
```

**Features**:

- Color picker
- Usage count
- Bulk tag operations
- Tag merging
- Unused tag cleanup

### 5. Integrations Tab

**Purpose**: Manage external service connections

**Layout**:

```
┌──────────────────┬──────────────────────────────┐
│ Integration      │  Instances                   │
│ Types            │  ┌────────────────────────┐  │
│ - Perplexity AI  │  │ My Perplexity API      │  │
│ - GitHub         │  │ Active | Last used: 2h │  │
│ - Mailchimp      │  │ [Test] [Edit] [Delete] │  │
│ [+ Add Type]     │  └────────────────────────┘  │
└──────────────────┴──────────────────────────────┘
```

**Features**:

- Add integration instances
- Test connections
- View credentials (masked)
- Usage statistics
- Disable/enable

### 6. Sources Tab

**Purpose**: Configure automated data collection

**Layout**:

```
┌─────────────────────────────────────────────────┐
│ Sources List                                    │
│ ┌─────────────────────────────────────────┐   │
│ │ Daily AI News                           │   │
│ │ Perplexity | Schedule: Daily 9am        │   │
│ │ Last run: Success (2h ago)              │   │
│ │ [Execute Now] [Edit] [View Cards]       │   │
│ └─────────────────────────────────────────┘   │
│ [+ New Source]                                  │
└─────────────────────────────────────────────────┘
```

**Features**:

- Execute manually
- View generated cards
- Schedule management
- Execution history
- Success/failure indicators

### 7. Queries Tab

**Purpose**: Configure multi-source aggregation

**Layout**:

```
┌─────────────────────────────────────────────────┐
│ Query List                                      │
│ ┌─────────────────────────────────────────┐   │
│ │ Morning Tech Brief                      │   │
│ │ 3 sources | Schedule: Daily 8am         │   │
│ │ [Execute] [Edit] [View Cards]           │   │
│ └─────────────────────────────────────────┘   │
│ [+ New Query]                                   │
└─────────────────────────────────────────────────┘
```

**Features**:

- Source selector
- Template editor with preview
- Schedule configuration
- Test query
- View digest cards

### 8. Outputs Tab

**Purpose**: Configure content delivery

**Layout**:

```
┌─────────────────────────────────────────────────┐
│ Output List                                     │
│ ┌─────────────────────────────────────────┐   │
│ │ Weekly Newsletter                       │   │
│ │ Mailchimp | Schedule: Mon 9am           │   │
│ │ [Execute] [Edit] [Preview]              │   │
│ └─────────────────────────────────────────┘   │
│ [+ New Output]                                  │
└─────────────────────────────────────────────────┘
```

**Features**:

- Card filter builder
- Template editor
- Preview delivery
- Delivery history
- Recipients count

### 9. Showcases Tab

**Purpose**: Create public card presentations

**Layout**:

```
┌─────────────────────────────────────────────────┐
│ Showcase List                                   │
│ ┌─────────────────────────────────────────┐   │
│ │ Project Portfolio                       │   │
│ │ View: Published Items                   │   │
│ │ URL: symposium.app/s/portfolio          │   │
│ │ [View] [Edit] [Regenerate]              │   │
│ └─────────────────────────────────────────┘   │
│ [+ New Showcase]                                │
└─────────────────────────────────────────────────┘
```

**Features**:

- View selector
- Theme customization
- Layout configuration
- Public URL
- Auto-regeneration

### 10. Policies Tab

**Purpose**: Manage external access control

**Layout**:

```
┌─────────────────────────────────────────────────┐
│ Policy List                                     │
│ ┌─────────────────────────────────────────┐   │
│ │ API Access Token                        │   │
│ │ Type: Output | Views: 2 | Active        │   │
│ │ Connection: abc123...                   │   │
│ │ [Copy] [Edit] [Revoke]                  │   │
│ └─────────────────────────────────────────┘   │
│ [+ New Policy]                                  │
└─────────────────────────────────────────────────┘
```

**Features**:

- Generate connection strings
- Configure access scopes
- Set expiration
- View usage logs
- Revoke access

## Common UI Patterns

### Modal Dialogs

- Create/Edit forms
- Confirmation dialogs
- Multi-step wizards

### Side Panels

- Card detail view
- Quick filters
- Properties panel

### Inline Editing

- Table cells
- Field values
- Quick updates

### Drag & Drop

- Reorder fields
- Organize views
- Reorder sources in queries

## Responsive Design

```
Desktop (>1200px):
  - Full tab bar
  - Two-column layouts
  - Side panels

Tablet (768-1200px):
  - Full tab bar
  - Single column
  - Collapsible sidebars

Mobile (<768px):
  - Hamburger menu
  - Stack layouts
  - Bottom sheets
```

## State Management

```
Application State:
  - Current user
  - Active tab
  - Selected view
  - Filter state

Entity State:
  - Cards (paginated)
  - Views (cached)
  - Schemas (cached)
  - Tags (cached)

UI State:
  - Modal visibility
  - Panel collapse state
  - Form validation
  - Loading indicators
```

## Key Interactions

### Creating a Card

```
1. Click "+ New Card" button
2. Select schema
3. Fill form fields
4. Write markdown content
5. Select tags
6. Save
```

### Creating a Source

```
1. Navigate to Sources tab
2. Click "+ New Source"
3. Select integration
4. Configure API params
5. Select tags
6. Set schedule (optional)
7. Test execution
8. Save
```

### Creating a View

```
1. Navigate to Views tab
2. Click "+ New View"
3. Select schemas
4. Add tag filters
5. Add field filters
6. Set sort order
7. Choose display mode
8. Preview
9. Save
```

---

**Next**: [Showcases](11-showcases.md)
