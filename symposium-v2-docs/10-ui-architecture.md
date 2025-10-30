# UI Architecture

## Overview

Symposium v2 uses a **7-tab interface** organized by workflow progression.

```
┌──────────────────────────────────────────────────────────────┐
│ Integrations | Sources | Queries | Outputs | Cards | Views | │
│ Showcases | Policies                                          │
└──────────────────────────────────────────────────────────────┘
```

**Tab Order Philosophy**: Left to right follows data flow

- **Setup** (Integrations) → **Collect** (Sources) → **Aggregate** (Queries) →
  **Deliver** (Outputs) → **Manage** (Cards, Views) → **Share** (Showcases,
  Policies)

## Tab Structure

### 1. Integrations Tab

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

### 2. Sources Tab

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

### 3. Queries Tab

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

### 4. Outputs Tab

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

### 5. Cards Tab

**Purpose**: Browse, create, and manage all content cards

**Sub-Tab Structure**:

```
┌──────────────────────────────────────────────────┐
│ Cards | Schemas | Tags                           │
├──────────────────────────────────────────────────┤
│ [Content varies by active sub-tab]              │
└──────────────────────────────────────────────────┘
```

#### 5.1. Cards Sub-Tab (Default)

**Layout**:

```
┌─────────────────┬──────────────────────────────────┐
│ Quick Filters   │  Card Display Area               │
│ - All Cards     │                                  │
│ - Recent        │  [Card Grid/List/Table/Carousel] │
│ - By Schema     │                                  │
│ - By Tag        │  [+ New Card]                    │
│ - Untagged      │                                  │
└─────────────────┴──────────────────────────────────┘
```

**Features**:

- Switch display modes (grid/list/table/carousel)
- Quick filters and search
- Bulk operations
- Create new cards
- View, edit, delete cards

#### 5.2. Schemas Sub-Tab

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

- Create/edit/delete schemas
- Drag-drop field reordering
- Field type picker
- Validation rules
- Preview form
- Card count per schema

#### 5.3. Tags Sub-Tab

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

- Create/edit/delete tags
- Color picker
- Usage count
- Bulk tag operations
- Tag merging
- Unused tag cleanup

### 6. Views Tab

**Purpose**: View and manage cards through saved filter configurations

**Dynamic Sub-Tab Structure**:

```
┌──────────────────────────────────────────────────┐
│ All Cards | High Priority | Projects | +         │
├──────────────────────────────────────────────────┤
│ [Airtable-style table view of filtered cards]   │
└──────────────────────────────────────────────────┘
```

**Main Layout**:

```
┌─────────────────────────────────────────────────┐
│ View Tabs (dynamically generated)              │
│ ┌─────┬──────────┬────────┬───────────┬───┐   │
│ │ All │ Priority │ Active │ Completed │ + │   │
│ └─────┴──────────┴────────┴───────────┴───┘   │
│                                                 │
│ Current View: "High Priority"                   │
│ ┌─────────────────────────────────────────┐   │
│ │ Airtable-Style Table                    │   │
│ ├─────┬──────────┬──────────┬──────────┬──┤   │
│ │ Sel │ Title    │ Priority │ Status   │…│   │
│ ├─────┼──────────┼──────────┼──────────┼──┤   │
│ │ ☐   │ Task A   │ High     │ Active   │…│   │
│ │ ☐   │ Task B   │ High     │ Review   │…│   │
│ │ ☐   │ Task C   │ High     │ Testing  │…│   │
│ └─────┴──────────┴──────────┴──────────┴──┘   │
│                                                 │
│ [View Settings] [Export] [Share]                │
└─────────────────────────────────────────────────┘
```

**Each View Tab Shows**:

- Airtable-style table interface
- Sortable columns
- Filterable columns
- Inline cell editing
- Expandable rows for full content
- Bulk selection and operations
- Export options (CSV, JSON)
- View settings (filters, sorts, display)

**View Management**:

- **+ Tab**: Creates new view
- **Right-click tab**: Edit, duplicate, delete view
- **Drag tabs**: Reorder views
- **View settings**: Modify filters, sorts, columns

**Features**:

- Table view (primary): Airtable-style spreadsheet
- Grid view (alternate): Card tiles
- List view (alternate): Compact rows
- Carousel view (alternate): Full card focus
- Switch between view modes
- Filter builder UI
- Column show/hide
- Group by field
- Aggregate functions (count, sum, etc.)
- Share view with team

### 7. Showcases Tab

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
- Public URL management
- Auto-regeneration
- Preview before publishing

### 8. Policies Tab

**Purpose**: Manage external API access control

**Layout**:

```
┌─────────────────────────────────────────────────┐
│ Policy List                                     │
│ ┌─────────────────────────────────────────┐   │
│ │ API Access Token                        │   │
│ │ Type: Output | Views: 2 | Active        │   │
│ │ Connection: sym_abc123...               │   │
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

## Views Tab - Airtable-Style Features

### Table Interface

**Column Operations**:

- Click header to sort (asc/desc)
- Drag columns to reorder
- Resize column widths
- Hide/show columns
- Add calculated columns
- Column types match field types

**Row Operations**:

- Click row to expand card details
- Inline edit cells
- Bulk select with checkboxes
- Drag rows to reorder (if sort allows)
- Right-click for context menu
- Add new cards directly in table

**Cell Editing**:

- Text fields: Click to edit
- Select fields: Dropdown picker
- Date fields: Calendar picker
- Tags: Multi-select dropdown
- Numbers: Inline number input
- Rich text: Opens modal editor

**Filtering & Grouping**:

```
┌─────────────────────────────────────────────────┐
│ [Filter] [Group] [Sort] [Hide Fields]          │
│                                                 │
│ Grouped by: Priority                            │
│ ┌─ High (3 cards) ────────────────────────┐   │
│ │ Task A | Active | John                   │   │
│ │ Task B | Review | Sarah                  │   │
│ │ Task C | Testing | Mike                  │   │
│ └─────────────────────────────────────────┘   │
│ ┌─ Medium (5 cards) ──────────────────────┐   │
│ │ Task D | Active | Lisa                   │   │
│ │ ...                                      │   │
│ └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### View Management Modal

**Creating a New View**:

```
┌───────────────────────────────────────┐
│ Create New View                       │
├───────────────────────────────────────┤
│ Name: [High Priority Tasks      ]    │
│                                       │
│ Filter:                               │
│ ┌─────────────────────────────────┐  │
│ │ Schema: Task                    │  │
│ │ Priority: equals "high"         │  │
│ │ Status: not "done"              │  │
│ │ [+ Add Filter]                  │  │
│ └─────────────────────────────────┘  │
│                                       │
│ Sort by: [created_at ▼] [DESC ▼]    │
│                                       │
│ Display: [Table ▼]                   │
│                                       │
│ [Cancel] [Create View]                │
└───────────────────────────────────────┘
```

## Common UI Patterns

### Modal Dialogs

- Create/Edit forms
- Confirmation dialogs
- Multi-step wizards
- Card detail views

### Side Panels

- Quick filters
- Properties panel
- History/activity log

### Inline Editing

- Table cells (Views tab)
- Field values
- Quick updates without modal

### Drag & Drop

- Reorder view tabs
- Reorder table columns
- Reorder schema fields
- Reorder sources in queries

## Responsive Design

```
Desktop (>1200px):
  - Full 8-tab bar
  - Multi-column layouts
  - Side panels
  - Full table view

Tablet (768-1200px):
  - Full tab bar
  - Single column
  - Collapsible sidebars
  - Horizontal scroll for tables

Mobile (<768px):
  - Hamburger menu
  - Stack layouts
  - Card view (not table)
  - Bottom sheets
```

## State Management

```
Application State:
  - Current user
  - Active main tab
  - Active sub-tab (Cards, Views)
  - Active view in Views tab

Entity State:
  - Cards (paginated)
  - Views (list with metadata)
  - Schemas (cached)
  - Tags (cached)
  - Sources/Queries/Outputs (lists)

UI State:
  - Modal visibility
  - Panel collapse state
  - Table column configuration
  - Form validation
  - Loading indicators
```

## Key Interactions

### Viewing Cards in Airtable Style

```
1. Navigate to Views tab
2. Select a view tab (or use All Cards)
3. See cards in table format
4. Click column headers to sort
5. Click cells to edit inline
6. Click row to expand full card
7. Use filters to refine
```

### Creating a New View

```
1. Navigate to Views tab
2. Click "+" tab
3. Name the view
4. Build filter:
   - Select schemas
   - Add tag filters
   - Add field filters
   - Set date range
```
