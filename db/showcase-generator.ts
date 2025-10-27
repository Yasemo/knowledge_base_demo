import { getShowcaseWithCards } from "./queries.ts";

interface Card {
  id: string;
  data: any;
  content: string;
  schema_name: string;
  tags: any[];
}

interface Showcase {
  id: string;
  name: string;
  description: string;
  settings: any;
  cards: Card[];
}

export async function generateShowcaseHTML(showcaseId: string, serverUrl: string): Promise<string> {
  const showcase = await getShowcaseWithCards(showcaseId);
  
  if (!showcase) {
    throw new Error("Showcase not found");
  }

  const settings = showcase.settings || { includeInfoOverlay: true };
  const cards = showcase.cards || [];

  // Pre-render all card content (server-side markdown rendering)
  const renderedCards = await Promise.all(
    cards.map(async (card: Card) => {
      // Simple markdown rendering - in production you'd use marked.js server-side
      const renderedContent = await renderMarkdownContent(card.content);
      return {
        ...card,
        renderedContent,
        title: getCardTitle(card)
      };
    })
  );

  // Generate the complete HTML
  return generateHTML(showcase, renderedCards, settings, serverUrl);
}

function getCardTitle(card: Card): string {
  const data = card.data || {};
  return data.title || data.name || data.subject || 'Untitled';
}

async function renderMarkdownContent(content: string): Promise<string> {
  // Pass through raw markdown for client-side rendering with marked.js
  // Don't escape HTML here - marked.js needs raw markdown to parse correctly
  return content;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function generateHTML(showcase: any, cards: any[], settings: any, serverUrl: string): string {
  const includeInfoOverlay = settings.includeInfoOverlay !== false;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(showcase.name)}</title>
  <style>
${getInlineCSS()}
  </style>
</head>
<body>
  <div class="showcase-container">
    <!-- Left Sidebar -->
    <aside class="showcase-sidebar">
      <h1 class="showcase-title">${escapeHtml(showcase.name)}</h1>
      ${showcase.description ? `<p class="showcase-description">${escapeHtml(showcase.description)}</p>` : ''}
      <nav class="showcase-tabs">
        ${cards.map((card, index) => `
        <button class="tab-btn ${index === 0 ? 'active' : ''}" data-card-index="${index}">
          ${escapeHtml(card.title)}
        </button>
        `).join('')}
      </nav>
    </aside>

    <!-- Main Content Area -->
    <main class="showcase-content">
      ${includeInfoOverlay ? '<button class="info-toggle" aria-label="Toggle info">ℹ️</button>' : ''}
      ${cards.map((card, index) => `
      <article class="card-content ${index !== 0 ? 'hidden' : ''}" data-card-index="${index}">
        <div class="card-content-inner" id="content-${index}"></div>
      </article>
      `).join('')}
    </main>

    <!-- Info Overlay -->
    ${includeInfoOverlay ? `
    <aside class="info-overlay">
      <button class="close-overlay">✕</button>
      <div class="info-content" id="infoContent">
        <!-- Populated by JavaScript -->
      </div>
    </aside>
    ` : ''}
  </div>

  <!-- Library dependencies from your server -->
  <script src="${serverUrl}/js/vendor/marked.min.js"></script>
  <script src="${serverUrl}/js/vendor/mermaid.min.js"></script>
  <script src="${serverUrl}/js/vendor/chart.min.js"></script>
  <script src="${serverUrl}/js/vendor/svg-pan-zoom.min.js"></script>
  
  <!-- Content renderer module -->
  <script type="module">
    import { renderMarkdown, initializeRenderedContent } from '${serverUrl}/js/utils.js';
    
    const CARDS_DATA = ${JSON.stringify(cards)};
    const SETTINGS = ${JSON.stringify(settings)};
    const SERVER_URL = ${JSON.stringify(serverUrl)};
    
    window.CARDS_DATA = CARDS_DATA;
    window.SETTINGS = SETTINGS;
    window.SERVER_URL = SERVER_URL;
    window.renderMarkdown = renderMarkdown;
    window.initializeRenderedContent = initializeRenderedContent;
    
${getInlineJavaScript()}
  </script>
</body>
</html>`;
}

function getInlineCSS(): string {
  return `
    :root {
      --nyt-font-serif: 'Georgia', 'Times New Roman', serif;
      --nyt-font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      --nyt-black: #121212;
      --nyt-gray: #666;
      --nyt-light-gray: #e5e5e5;
      --nyt-bg: #ffffff;
      --nyt-border: #d4d4d4;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--nyt-font-sans);
      color: var(--nyt-black);
      background: var(--nyt-bg);
      line-height: 1.6;
    }

    .showcase-container {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* Sidebar */
    .showcase-sidebar {
      width: 300px;
      background: #f8f8f8;
      border-right: 1px solid var(--nyt-border);
      overflow-y: auto;
      flex-shrink: 0;
      padding: 2rem;
    }

    .showcase-title {
      font-family: var(--nyt-font-serif);
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      line-height: 1.2;
    }

    .showcase-description {
      color: var(--nyt-gray);
      font-size: 0.875rem;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .showcase-tabs {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .tab-btn {
      background: transparent;
      border: none;
      padding: 0.75rem 1rem;
      text-align: left;
      cursor: pointer;
      font-family: var(--nyt-font-sans);
      font-size: 0.9rem;
      color: var(--nyt-black);
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .tab-btn.active {
      background: var(--nyt-black);
      color: white;
      font-weight: 600;
    }

    /* Main Content */
    .showcase-content {
      flex: 1;
      overflow-y: auto;
      padding: 3rem;
      position: relative;
    }

    .info-toggle {
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: var(--nyt-black);
      color: white;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;
      z-index: 100;
    }

    .info-toggle:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .card-content {
      max-width: 800px;
      margin: 0 auto;
    }

    .card-content.hidden {
      display: none;
    }

    .card-content-inner {
      font-family: var(--nyt-font-serif);
      font-size: 1.125rem;
      line-height: 1.8;
    }

    /* Info Overlay */
    .info-overlay {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      height: 100vh;
      background: white;
      border-left: 1px solid var(--nyt-border);
      box-shadow: -2px 0 16px rgba(0, 0, 0, 0.1);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      overflow-y: auto;
      z-index: 1000;
      padding: 2rem;
    }

    .info-overlay.visible {
      transform: translateX(0);
    }

    .close-overlay {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: transparent;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--nyt-gray);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .close-overlay:hover {
      background: rgba(0, 0, 0, 0.05);
      color: var(--nyt-black);
    }

    .info-content {
      margin-top: 3rem;
    }

    .info-field {
      margin-bottom: 1.5rem;
    }

    .info-field-label {
      font-family: var(--nyt-font-sans);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--nyt-gray);
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .info-field-value {
      font-family: var(--nyt-font-sans);
      font-size: 0.95rem;
      color: var(--nyt-black);
    }

    .info-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .info-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.75rem;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 12px;
      font-size: 0.85rem;
    }

    .tag-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    /* Markdown Styling */
    .card-content-inner h1,
    .card-content-inner h2,
    .card-content-inner h3 {
      font-family: var(--nyt-font-serif);
      font-weight: 700;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      line-height: 1.3;
    }

    .card-content-inner h1 { font-size: 2rem; }
    .card-content-inner h2 { font-size: 1.5rem; }
    .card-content-inner h3 { font-size: 1.25rem; }

    .card-content-inner p {
      margin-bottom: 1.25rem;
    }

    .card-content-inner code {
      background: #f5f5f5;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: 0.9em;
      font-family: 'Monaco', 'Courier New', monospace;
    }

    .card-content-inner pre {
      background: #f5f5f5;
      padding: 1.5rem;
      border-radius: 6px;
      overflow-x: auto;
      margin: 1.5rem 0;
    }

    .card-content-inner pre code {
      background: none;
      padding: 0;
    }

    .card-content-inner ul,
    .card-content-inner ol {
      margin-bottom: 1.25rem;
      padding-left: 2rem;
    }

    .card-content-inner li {
      margin-bottom: 0.5rem;
    }

    .card-content-inner blockquote {
      border-left: 4px solid var(--nyt-border);
      padding-left: 1.5rem;
      margin: 1.5rem 0;
      color: var(--nyt-gray);
      font-style: italic;
    }

    .card-content-inner a {
      color: #326891;
      text-decoration: none;
      border-bottom: 1px solid #326891;
    }

    .card-content-inner a:hover {
      border-bottom-width: 2px;
    }

    /* Mermaid diagrams */
    .card-content-inner .mermaid-container {
      margin: 1.5rem 0;
      overflow: hidden;
      background: #f9f9f9;
      border: 1px solid var(--nyt-border);
      border-radius: 8px;
      padding: 1rem;
    }

    /* Tables */
    .card-content-inner table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      font-size: 0.95rem;
    }

    .card-content-inner table th,
    .card-content-inner table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--nyt-border);
    }

    .card-content-inner table th {
      background: #f8f8f8;
      font-weight: 600;
      font-family: var(--nyt-font-sans);
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.5px;
      color: var(--nyt-gray);
    }

    .card-content-inner table tr:hover {
      background: #f9f9f9;
    }

    .card-content-inner table tr:last-child td {
      border-bottom: none;
    }

    /* Chart containers */
    .card-content-inner .chart-container {
      margin: 1.5rem 0;
      padding: 1rem;
      background: #f9f9f9;
      border: 1px solid var(--nyt-border);
      border-radius: 8px;
    }

    /* Iframe containers */
    .card-content-inner .iframe-container {
      margin: 1.5rem 0;
      position: relative;
      overflow: hidden;
      border-radius: 8px;
      border: 1px solid var(--nyt-border);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .showcase-sidebar {
        position: fixed;
        left: -300px;
        top: 0;
        height: 100vh;
        z-index: 1001;
        transition: left 0.3s ease;
      }

      .showcase-sidebar.visible {
        left: 0;
      }

      .showcase-content {
        padding: 2rem 1.5rem;
        padding-top: 5rem;
      }

      .info-overlay {
        width: 100%;
      }

      .info-toggle {
        top: 1rem;
        right: 1rem;
      }
    }
  `;
}

function getInlineJavaScript(): string {
  return `
    // Initialize
    console.log('🎬 Showcase initializing...');
    console.log('📦 CARDS_DATA:', CARDS_DATA);
    console.log('📦 Total cards:', CARDS_DATA ? CARDS_DATA.length : 0);
    
    let currentCardIndex = 0;
    const infoOverlay = document.querySelector('.info-overlay');
    const infoToggle = document.querySelector('.info-toggle');
    const closeOverlayBtn = document.querySelector('.close-overlay');
    const tabs = document.querySelectorAll('.tab-btn');
    
    console.log('🔘 Found tabs:', tabs.length);

    // Initialize Mermaid
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({ 
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose'
      });
      console.log('✅ Mermaid initialized');
    }

    // Render initial card content
    async function renderCardContent(index) {
      console.log('🎨 renderCardContent called for index:', index);
      const card = CARDS_DATA[index];
      console.log('📄 Card data:', card);
      
      const contentEl = document.getElementById('content-' + index);
      console.log('📍 Content element:', contentEl);
      
      if (contentEl && !contentEl.dataset.rendered) {
        console.log('🔄 Rendering content for index:', index);
        try {
          console.log('📝 Raw content length:', card.content ? card.content.length : 0);
          
          // Use renderMarkdown from utils.js for full rendering support
          if (typeof window.renderMarkdown !== 'undefined') {
            console.log('✅ Using renderMarkdown for full rendering support');
            const html = await window.renderMarkdown(card.content);
            contentEl.innerHTML = html;
            
            // Initialize after inserting HTML
            if (typeof window.initializeRenderedContent !== 'undefined') {
              await window.initializeRenderedContent(contentEl);
            }
          } else if (typeof marked !== 'undefined') {
            console.log('⚠️ renderContent not available, falling back to marked.js');
            marked.setOptions({
              breaks: true,
              gfm: true
            });
            const parsed = marked.parse(card.content);
            contentEl.innerHTML = parsed;
          } else {
            console.log('⚠️ No rendering available, using plain text');
            contentEl.textContent = card.content;
          }
          
          console.log('✅ Content rendered successfully for index:', index);
          contentEl.dataset.rendered = 'true';
        } catch (error) {
          console.error('❌ Error rendering card content:', error);
        }
      } else if (contentEl && contentEl.dataset.rendered) {
        console.log('ℹ️ Content already rendered for index:', index);
      } else {
        console.error('❌ Content element not found for index:', index);
      }
    }

    // Tab switching
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        console.log('🖱️ Tab clicked! Index:', index);
        
        // Update tabs
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        console.log('✅ Tab made active');
        
        // Update content
        const allContent = document.querySelectorAll('.card-content');
        console.log('📦 All content elements:', allContent.length);
        allContent.forEach(c => c.classList.add('hidden'));
        
        const targetContent = document.querySelector('.card-content[data-card-index="' + index + '"]');
        console.log('🎯 Target content element:', targetContent);
        
        if (targetContent) {
          targetContent.classList.remove('hidden');
          console.log('✅ Target content made visible');
        } else {
          console.error('❌ Target content not found for index:', index);
        }
        
        currentCardIndex = index;
        renderCardContent(index);
        updateInfoPanel(index);
      });
    });

    // Info overlay toggle
    if (infoToggle) {
      infoToggle.addEventListener('click', () => {
        if (infoOverlay) {
          infoOverlay.classList.toggle('visible');
        }
      });
    }

    if (closeOverlayBtn) {
      closeOverlayBtn.addEventListener('click', () => {
        if (infoOverlay) {
          infoOverlay.classList.remove('visible');
        }
      });
    }

    // Update info panel
    function updateInfoPanel(index) {
      if (!infoOverlay) return;
      
      const card = CARDS_DATA[index];
      const infoContent = document.getElementById('infoContent');
      
      if (!infoContent) return;
      
      let html = '<h2 style="font-family: var(--nyt-font-serif); font-size: 1.5rem; margin-bottom: 1.5rem;">Card Information</h2>';
      
      // Schema
      html += '<div class="info-field">';
      html += '<div class="info-field-label">Schema</div>';
      html += '<div class="info-field-value">' + escapeHtml(card.schema_name) + '</div>';
      html += '</div>';
      
      // Data fields
      for (const [key, value] of Object.entries(card.data || {})) {
        if (key === 'title' || key === 'name') continue;
        html += '<div class="info-field">';
        html += '<div class="info-field-label">' + escapeHtml(key.replace(/_/g, ' ')) + '</div>';
        html += '<div class="info-field-value">' + formatValue(value) + '</div>';
        html += '</div>';
      }
      
      // Tags
      if (card.tags && card.tags.length > 0) {
        html += '<div class="info-field">';
        html += '<div class="info-field-label">Tags</div>';
        html += '<div class="info-tags">';
        card.tags.forEach(tag => {
          html += '<span class="info-tag">';
          html += '<span class="tag-dot" style="background: ' + tag.color + ';"></span>';
          html += escapeHtml(tag.name);
          html += '</span>';
        });
        html += '</div>';
        html += '</div>';
      }
      
      infoContent.innerHTML = html;
    }

    function formatValue(value) {
      if (value === null || value === undefined) return '';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (Array.isArray(value)) return escapeHtml(value.join(', '));
      if (typeof value === 'object') return escapeHtml(JSON.stringify(value));
      return escapeHtml(String(value));
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Initial render
    console.log('🚀 Starting initial render for card 0');
    renderCardContent(0);
    updateInfoPanel(0);
    console.log('✅ Showcase initialization complete');
  `;
}
