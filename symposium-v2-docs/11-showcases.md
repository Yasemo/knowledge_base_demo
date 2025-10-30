# Showcases

## Overview

**Showcases** are public presentations of filtered card collections. They
generate static HTML sites for sharing knowledge externally.

```
Showcase = View + Layout + Theme → Rendered HTML → Public URL
```

## Structure

```json
{
  "id": "showcase-uuid",
  "user_id": "user-uuid",
  "name": "Project Portfolio",
  "description": "Public showcase of completed projects",
  "view_id": "published-view-uuid",
  "layout": {
    "style": "tabbed-sidebar",
    "sections": ["category", "date"],
    "cards_per_page": 20
  },
  "theme": {
    "primary_color": "#007bff",
    "font": "Inter",
    "show_metadata": true
  },
  "rendered_html": "<!DOCTYPE html>...",
  "cards_hash": "abc123def456",
  "needs_regeneration": false,
  "is_public": true,
  "public_url_slug": "portfolio",
  "last_regenerated_at": "2024-10-30T10:00:00Z"
}
```

## Generation Process

```
Showcase Created/Updated
  ↓
Get Cards from View
  ├── Apply view filters
  └── Get filtered card set
  ↓
Calculate cards_hash
  ├── Hash of card IDs + timestamps
  └── Used to detect changes
  ↓
Render Cards
  ├── Convert markdown to HTML
  ├── Apply syntax highlighting
  ├── Render special blocks (charts, mermaid)
  └── Sanitize HTML
  ↓
Apply Layout
  ├── Generate navigation
  ├── Organize into sections
  └── Apply responsive structure
  ↓
Apply Theme
  ├── Inject CSS
  ├── Apply colors
  └── Set typography
  ↓
Generate Static HTML
  ├── Complete standalone page
  ├── Embedded CSS/JS
  └── No external dependencies
  ↓
Store rendered_html
  ↓
Make Available at Public URL
  └── symposium.app/s/{slug}
```

## Layouts

### Tabbed Sidebar

```
┌──────────────┬────────────────────────┐
│ Navigation   │  Card Content          │
│              │                        │
│ > Category A │  # Card Title          │
│   - Card 1   │                        │
│   - Card 2   │  Card content rendered │
│              │  with full markdown    │
│ > Category B │                        │
│   - Card 3   │                        │
│   - Card 4   │                        │
└──────────────┴────────────────────────┘
```

### Grid Layout

```
┌──────────────────────────────────────┐
│  ┌────────┐  ┌────────┐  ┌────────┐ │
│  │ Card 1 │  │ Card 2 │  │ Card 3 │ │
│  └────────┘  └────────┘  └────────┘ │
│  ┌────────┐  ┌────────┐  ┌────────┐ │
│  │ Card 4 │  │ Card 5 │  │ Card 6 │ │
│  └────────┘  └────────┘  └────────┘ │
└──────────────────────────────────────┘
```

### Timeline Layout

```
┌──────────────────────────────────────┐
│ October 2024                         │
│ ├─ Card A (Oct 30)                   │
│ ├─ Card B (Oct 28)                   │
│ └─ Card C (Oct 25)                   │
│                                      │
│ September 2024                       │
│ ├─ Card D (Sep 15)                   │
│ └─ Card E (Sep 10)                   │
└──────────────────────────────────────┘
```

## Auto-Regeneration

```
Card Changes Detected
  ↓
Calculate New cards_hash
  ↓
Compare with Stored cards_hash
  ↓
If Different:
  ├── Set needs_regeneration = true
  ├── Trigger async regeneration
  ├── Update rendered_html
  ├── Update cards_hash
  └── Set last_regenerated_at
  ↓
Serve Updated HTML
```

### Caching Strategy

```
User Requests Showcase URL
  ↓
Check needs_regeneration
  ↓
If false:
  └── Serve cached rendered_html (fast)
  ↓
If true:
  ├── Serve cached HTML (still fast)
  └── Regenerate in background
      └── Next request gets updated version
```

## Theme Customization

```json
{
  "primary_color": "#007bff",
  "secondary_color": "#6c757d",
  "background": "#ffffff",
  "text_color": "#212529",
  "font_family": "Inter, sans-serif",
  "code_theme": "github-dark",
  "show_timestamps": true,
  "show_tags": true,
  "show_schema_icons": true,
  "custom_css": ".card { border-radius: 8px; }"
}
```

## Security

### Public Access

```
Showcases are intentionally public:
  - No authentication required
  - Anyone with URL can view
  - Search engines can index
  - Appropriate for public knowledge sharing
```

### Privacy Considerations

```
Before Publishing:
  ✓ Review all cards in view
  ✓ Ensure no sensitive data
  ✓ Check data fields visible
  ✓ Verify appropriate tags
  ✓ Test with public URL
```

### Content Control

```
To Unpublish:
  - Set is_public = false
  - Remove public_url_slug
  - HTML still stored (can re-publish)
  - URL becomes 404

To Update Content:
  - Modify view filters
  - Edit/delete cards
  - Showcase auto-regenerates
```

## Use Cases

1. **Portfolio**: Showcase projects and work
2. **Documentation**: Public knowledge base
3. **Blog**: Share articles and thoughts
4. **Research**: Publish research findings
5. **Team Updates**: Public-facing status pages

## Best Practices

- **Curate Carefully**: Only include polished content
- **Clear Structure**: Use sections and categories
- **Readable URLs**: Choose meaningful slug
- **Test Responsively**: Preview on mobile/tablet
- **Monitor Changes**: Review auto-regenerations
- **SEO Friendly**: Include descriptions and metadata

---

**Next**: [Policies](12-policies.md)
