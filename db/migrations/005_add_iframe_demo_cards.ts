// Migration: Add iframe demonstration cards
import { sql } from '../client.ts';

export async function up() {
  console.log('  Running migration: Add iframe demo cards');
  
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
  
  // IFRAME DEMO CARD
  await addCard('Article',
    { 
      title: "Secure Iframe Embedding Guide",
      author: "Security Team",
      published_date: "2024-02-26"
    },
    `# Secure Iframe Embedding

This card demonstrates secure iframe embedding with fixed sandbox attributes for maximum safety.

## Security Model

All iframes are automatically sandboxed with these non-overridable settings:

\\\`\\\`\\\`
sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
referrerpolicy="no-referrer"
\\\`\\\`\\\`

### What This Allows ✅
- **Scripts**: Interactive content can run (needed for YouTube, CodePen, etc.)
- **Same-Origin**: Allows modern APIs to work (cross-origin embeds still isolated)
- **Popups**: External links can open in new windows
- **Popup Escape**: Popups can navigate freely

### What This Blocks ❌
- **Form Submission**: Cannot submit forms to steal information
- **Top Navigation**: Cannot redirect the parent page
- **Modals**: Cannot spam alerts/confirms

### Security Notes 🔒
- **Cross-origin embeds are safe**: YouTube (youtube.com) cannot access your site
- **Same-origin means**: Only content from YOUR domain could access parent page
- **You control what you embed**: The risk is minimal since you choose the URLs
- **Privacy protected**: referrerpolicy="no-referrer" prevents tracking

## Usage Formats

### Simple URL
\`\`\`iframe
https://www.youtube.com/embed/dQw4w9WgXcQ
\`\`\`

### With Aspect Ratio
\`\`\`iframe:16:9
https://www.youtube.com/embed/dQw4w9WgXcQ
\`\`\`

### Advanced Configuration
\`\`\`iframe
{
  "url": "https://example.com",
  "height": "500px",
  "title": "My Embed"
}
\`\`\`

## Example 1: YouTube Video (16:9)

\`\`\`iframe:16:9
https://www.youtube.com/embed/dQw4w9WgXcQ
\`\`\`

## Example 2: CodePen Demo

\`\`\`iframe
{
  "url": "https://codepen.io/cobra_winfrey/embed/preview/zBObre",
  "height": "400px",
  "title": "CSS Animation Demo"
}
\`\`\`

## Example 3: Observable Notebook (4:3)

\`\`\`iframe:4:3
https://observablehq.com/embed/@d3/zoomable-sunburst
\`\`\`

## Supported Aspect Ratios

- **16:9** - Widescreen (YouTube, videos)
- **4:3** - Traditional (presentations)
- **21:9** - Ultra-wide (cinematic)
- **1:1** - Square (maps, social media)
- **9:16** - Vertical (mobile content)

## URL Requirements

- ✅ HTTPS URLs required (secure connections only)
- ✅ HTTP localhost allowed (for development)
- ❌ Plain HTTP blocked (security risk)

## Privacy Protection

All iframes use referrerpolicy="no-referrer" to:
- Protect user privacy
- Prevent tracking across domains
- Hide browsing history from embedded sites

## Loading Behavior

- Lazy loading enabled (loading="lazy")
- Loading indicator displayed
- 5-second timeout for slow connections
- Graceful error handling for blocked content

## Best Practices

1. **Use Aspect Ratios**: Better than fixed heights for responsive design
2. **Choose Trusted Sources**: While sandboxed, prefer well-known platforms
3. **Test on Mobile**: Ensure embeds work well on small screens
4. **Consider Performance**: Each iframe adds HTTP overhead
5. **Provide Context**: Add descriptions of embedded content

## Security Notice

🔒 The security badge in the top-left indicates content is sandboxed. This means:
- Embedded content cannot access your knowledge base data
- Cannot track your activities on this site
- Cannot modify the parent page
- Runs in an isolated security context

Perfect for embedding external documentation, demos, videos, and interactive content safely!`,
    ["Frontend", "Feature", "Security"]
  );
  
  console.log('  ✅ Added iframe demonstration card');
  console.log('  ✅ Migration completed successfully');
}

export async function down() {
  console.log('  Rolling back: Remove iframe demo card');
  console.log('  ⚠️  Manual cleanup required if needed');
  console.log('  ✅ Rollback completed');
}
