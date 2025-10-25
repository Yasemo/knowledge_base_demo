/**
 * Extensible Content Renderer
 * 
 * This renderer uses a plugin-based architecture to handle different content types.
 * By default, everything is treated as markdown. Special code blocks (```mermaid, ```chart, etc.)
 * are extracted before markdown processing to avoid nesting issues.
 */

export class ContentRenderer {
  constructor() {
    this.plugins = new Map();
    this.initialized = false;
  }

  /**
   * Register a renderer plugin
   * @param {string} name - Plugin name
   * @param {Object} plugin - Plugin object with render/initialize methods
   */
  registerPlugin(name, plugin) {
    this.plugins.set(name, plugin);
    console.log(`Registered renderer plugin: ${name}`);
  }

  /**
   * Main render function
   * @param {string} content - Raw content to render
   * @returns {Promise<string>} Rendered HTML
   */
  async render(content) {
    if (!content) return '';

    // Step 1: Extract special code blocks before markdown processing
    const { processedContent, extractedBlocks } = this.extractSpecialBlocks(content);

    // Step 2: Process remaining content as markdown
    let html = this.renderMarkdown(processedContent);

    // Step 3: Replace placeholders with rendered special blocks
    for (const block of extractedBlocks) {
      const plugin = this.findPluginForLanguage(block.language);
      
      if (plugin) {
        try {
          const renderedBlock = await plugin.render(block.code, block.language, block.options);
          html = html.replace(block.placeholder, renderedBlock);
        } catch (error) {
          console.error(`Error rendering ${block.language} block:`, error);
          // Fallback to showing the code block
          html = html.replace(
            block.placeholder,
            `<pre><code class="language-${block.language}">${this.escapeHtml(block.code)}</code></pre>`
          );
        }
      } else {
        // No plugin found, render as code block
        html = html.replace(
          block.placeholder,
          `<pre><code class="language-${block.language}">${this.escapeHtml(block.code)}</code></pre>`
        );
      }
    }

    return html;
  }

  /**
   * Initialize all plugins after content is inserted into DOM
   * @param {HTMLElement} container - Container element with rendered content
   */
  async initialize(container) {
    for (const [name, plugin] of this.plugins) {
      if (plugin.initialize) {
        try {
          await plugin.initialize(container);
        } catch (error) {
          console.error(`Error initializing ${name} plugin:`, error);
        }
      }
    }
    this.initialized = true;
  }

  /**
   * Extract special code blocks and replace with placeholders
   * @param {string} content - Raw content
   * @returns {Object} { processedContent, extractedBlocks }
   */
  extractSpecialBlocks(content) {
    const extractedBlocks = [];
    let blockIndex = 0;
    
    // Regex to match code blocks: ```language\ncode\n```
    // Changed (?::\w+)? to (?::\w+)* to allow multiple colon segments (e.g., iframe:16:9)
    const codeBlockRegex = /```(\w+(?::\w+)*)\s*\n([\s\S]*?)```/g;
    
    const processedContent = content.replace(codeBlockRegex, (match, language, code) => {
      // Check if any plugin can handle this language
      const plugin = this.findPluginForLanguage(language);
      
      if (plugin) {
        // This is a special block, extract it
        const placeholder = `{{SPECIAL_BLOCK_${blockIndex}}}`;
        
        // Parse language and options (e.g., "chart:bar" -> language="chart", options={type:"bar"})
        const [baseLang, ...opts] = language.split(':');
        const options = opts.length > 0 ? { subtype: opts.join(':') } : {};
        
        extractedBlocks.push({
          placeholder,
          language: baseLang,
          code: code.trim(),
          options,
          originalLanguage: language
        });
        
        blockIndex++;
        return placeholder;
      }
      
      // Not a special block, leave it for markdown processing
      return match;
    });

    return { processedContent, extractedBlocks };
  }

  /**
   * Find a plugin that can handle the given language
   * @param {string} language - Code block language
   * @returns {Object|null} Plugin object or null
   */
  findPluginForLanguage(language) {
    const baseLang = language.split(':')[0];
    
    for (const [name, plugin] of this.plugins) {
      if (plugin.languages && plugin.languages.includes(baseLang)) {
        return plugin;
      }
    }
    
    return null;
  }

  /**
   * Render markdown content
   * @param {string} content - Markdown content
   * @returns {string} HTML
   */
  renderMarkdown(content) {
    if (typeof marked === 'undefined') {
      console.error('marked.js is not loaded');
      return content;
    }

    // Configure marked
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      mangle: false,
      tables: true,
    });

    return marked.parse(content);
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Generate a unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9);
  }
}

// Create and export a singleton instance
export const contentRenderer = new ContentRenderer();
