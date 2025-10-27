/**
 * Iframe Renderer Plugin
 * 
 * Renders external content in secure sandboxed iframes
 * Security: Fixed sandbox attributes (non-overridable by users)
 */

export const iframeRenderer = {
  // Languages this plugin handles
  languages: ['iframe'],

  // Fixed security configuration (cannot be overridden)
  SECURITY_CONFIG: {
    sandbox: 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation',
    referrerpolicy: 'strict-origin-when-cross-origin',
    defaultHeight: '400px',
    defaultWidth: '100%',
    aspectRatios: {
      '16:9': 56.25,
      '4:3': 75,
      '21:9': 42.85,
      '1:1': 100,
      '9:16': 177.78 // vertical video
    }
  },

  /**
   * Render an iframe
   * @param {string} code - URL or JSON configuration
   * @param {string} language - Language identifier
   * @param {Object} options - Rendering options (may include aspect ratio)
   * @returns {Promise<string>} Rendered HTML
   */
  async render(code, language, options = {}) {
    const id = 'iframe-' + Math.random().toString(36).substr(2, 9);
    
    console.log('[IframeRenderer] Starting render:', { code, language, options });
    
    // Parse configuration
    let config;
    try {
      // Try to parse as JSON first
      config = JSON.parse(code.trim());
      if (typeof config === 'string') {
        // If JSON contains just a string, treat it as URL
        config = { url: config };
      }
      console.log('[IframeRenderer] Parsed as JSON:', config);
    } catch (e) {
      // If not JSON, treat as plain URL
      config = { url: code.trim() };
      console.log('[IframeRenderer] Treating as plain URL:', config);
    }

    // Extract configuration
    const url = config.url || '';
    const height = config.height || this.SECURITY_CONFIG.defaultHeight;
    const width = config.width || this.SECURITY_CONFIG.defaultWidth;
    const title = config.title || 'External Content';
    const aspectRatio = options.subtype || config.aspectRatio || null;

    console.log('[IframeRenderer] Extracted config:', {
      url,
      height,
      width,
      title,
      aspectRatio,
      sandbox: this.SECURITY_CONFIG.sandbox
    });

    // Validate URL
    if (!this.isValidUrl(url)) {
      console.error('[IframeRenderer] Invalid URL:', url);
      return `
        <div class="iframe-container iframe-error">
          <div class="iframe-error-message">
            <strong>⚠️ Invalid URL</strong>
            <p>Only HTTPS URLs are allowed (or http://localhost for development)</p>
            <code>${this.escapeHtml(url)}</code>
          </div>
        </div>
      `;
    }

    // Determine container class based on aspect ratio
    const containerClass = aspectRatio 
      ? `iframe-container iframe-aspect-ratio`
      : `iframe-container iframe-fixed-height`;
    
    const aspectRatioStyle = aspectRatio && this.SECURITY_CONFIG.aspectRatios[aspectRatio]
      ? `padding-bottom: ${this.SECURITY_CONFIG.aspectRatios[aspectRatio]}%;`
      : '';

    // Build iframe HTML with fixed security attributes
    return `
      <div class="${containerClass}" data-aspect-ratio="${aspectRatio || 'none'}" ${aspectRatio ? `style="${aspectRatioStyle}"` : ''}>
        <div class="iframe-security-badge" title="This content is sandboxed for security">
          🔒 External Content
        </div>
        <div class="iframe-loading">Loading...</div>
        <iframe
          id="${id}"
          src="${this.escapeHtml(url)}"
          sandbox="${this.SECURITY_CONFIG.sandbox}"
          referrerpolicy="${this.SECURITY_CONFIG.referrerpolicy}"
          loading="lazy"
          title="${this.escapeHtml(title)}"
          class="embedded-iframe"
          ${!aspectRatio ? `style="height: ${height}; width: ${width};"` : ''}
          data-iframe-id="${id}">
        </iframe>
      </div>
    `;
  },

  /**
   * Validate URL for security
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid
   */
  isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;

    try {
      const parsed = new URL(url);
      
      // Allow HTTPS or localhost HTTP
      if (parsed.protocol === 'https:') return true;
      if (parsed.protocol === 'http:' && 
          (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
        return true;
      }
      
      return false;
    } catch (e) {
      return false;
    }
  },

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Initialize iframes after content is inserted into DOM
   * @param {HTMLElement} container - Container element
   */
  async initialize(container) {
    const iframes = container.querySelectorAll('.embedded-iframe');
    
    console.log('[IframeRenderer] Initialize called, found', iframes.length, 'iframes');
    
    for (const iframe of iframes) {
      console.log('[IframeRenderer] Processing iframe:', {
        id: iframe.id,
        src: iframe.src,
        sandbox: iframe.sandbox,
        initialized: iframe.getAttribute('data-initialized')
      });
      
      // Skip if already initialized
      if (iframe.getAttribute('data-initialized') === 'true') {
        console.log('[IframeRenderer] Iframe already initialized, skipping');
        continue;
      }

      const iframeContainer = iframe.closest('.iframe-container');
      const loadingIndicator = iframeContainer?.querySelector('.iframe-loading');

      // Handle iframe load event
      iframe.addEventListener('load', () => {
        console.log('[IframeRenderer] Iframe loaded successfully:', iframe.src);
        if (loadingIndicator) {
          loadingIndicator.style.display = 'none';
        }
        iframe.style.opacity = '1';
        iframe.setAttribute('data-initialized', 'true');
      });

      // Handle iframe error event
      iframe.addEventListener('error', (e) => {
        console.error('[IframeRenderer] Iframe error event:', {
          src: iframe.src,
          error: e,
          message: e.message
        });
        if (loadingIndicator) {
          loadingIndicator.innerHTML = '⚠️ Failed to load external content';
          loadingIndicator.style.color = '#c33';
        }
        iframe.setAttribute('data-initialized', 'true');
      });

      // Set a timeout for loading
      setTimeout(() => {
        if (iframe.getAttribute('data-initialized') !== 'true') {
          console.warn('[IframeRenderer] Iframe load timeout after 5 seconds:', iframe.src);
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          }
          iframe.style.opacity = '1';
          iframe.setAttribute('data-initialized', 'true');
        }
      }, 5000); // 5 second timeout
    }
  }
};
