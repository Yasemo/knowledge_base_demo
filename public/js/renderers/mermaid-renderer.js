/**
 * Mermaid Renderer Plugin
 * 
 * Renders Mermaid diagrams (flowcharts, sequence diagrams, class diagrams, etc.)
 * Requires: mermaid.js library
 */

export const mermaidRenderer = {
  // Languages this plugin handles
  languages: ['mermaid', 'mmd'],

  /**
   * Render a Mermaid diagram
   * @param {string} code - Mermaid diagram code
   * @param {string} language - Language identifier
   * @param {Object} options - Rendering options
   * @returns {Promise<string>} Rendered HTML
   */
  async render(code, language, options = {}) {
    // Generate a unique ID for this diagram
    const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
    
    // Return a container with the mermaid code
    // The actual rendering will happen in the initialize() method
    return `
      <div class="mermaid-container">
        <div class="mermaid" id="${id}">
${code}
        </div>
      </div>
    `;
  },

  /**
   * Initialize Mermaid after content is inserted into DOM
   * @param {HTMLElement} container - Container element
   */
  async initialize(container) {
    if (typeof mermaid === 'undefined') {
      console.error('Mermaid.js is not loaded');
      return;
    }

    // Configure Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: false, // Changed to false for better zoom/pan
        htmlLabels: true,
        curve: 'basis'
      },
      sequence: {
        useMaxWidth: false // Changed to false for better zoom/pan
      },
      gantt: {
        useMaxWidth: false // Changed to false for better zoom/pan
      }
    });

    // Find all mermaid elements in the container and render them
    const mermaidElements = container.querySelectorAll('.mermaid');
    
    for (const element of mermaidElements) {
      // Skip if already rendered
      if (element.getAttribute('data-processed') === 'true') {
        continue;
      }
      
      try {
        const id = element.id;
        const code = element.textContent.trim();
        
        // Render the diagram
        const { svg } = await mermaid.render(id + '-svg', code);
        
        // Replace the element content with the rendered SVG
        element.innerHTML = svg;
        element.setAttribute('data-processed', 'true');
        
        // Enable zoom and pan if svg-pan-zoom is available
        if (typeof svgPanZoom !== 'undefined') {
          const svgElement = element.querySelector('svg');
          if (svgElement) {
            // Add controls container
            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'mermaid-controls';
            controlsContainer.innerHTML = `
              <button class="mermaid-control-btn" data-action="zoom-in" title="Zoom In">+</button>
              <button class="mermaid-control-btn" data-action="zoom-out" title="Zoom Out">−</button>
              <button class="mermaid-control-btn" data-action="reset" title="Reset">⟲</button>
            `;
            element.parentElement.insertBefore(controlsContainer, element);
            
            // Initialize pan-zoom
            const panZoomInstance = svgPanZoom(svgElement, {
              zoomEnabled: true,
              controlIconsEnabled: false,
              fit: true,
              center: true,
              minZoom: 0.5,
              maxZoom: 10,
              zoomScaleSensitivity: 0.3,
              dblClickZoomEnabled: true,
              mouseWheelZoomEnabled: true,
              preventMouseEventsDefault: true
            });
            
            // Store instance on element for later access
            element._panZoomInstance = panZoomInstance;
            
            // Add control button handlers
            const controls = controlsContainer.querySelectorAll('.mermaid-control-btn');
            controls.forEach(btn => {
              btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.getAttribute('data-action');
                
                if (action === 'zoom-in') {
                  panZoomInstance.zoomIn();
                } else if (action === 'zoom-out') {
                  panZoomInstance.zoomOut();
                } else if (action === 'reset') {
                  panZoomInstance.resetZoom();
                  panZoomInstance.center();
                }
              });
            });
          }
        }
      } catch (error) {
        console.error('Error rendering Mermaid diagram:', error);
        
        // Show error message
        element.innerHTML = `
          <div style="padding: 16px; background: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c33;">
            <strong>Mermaid Rendering Error:</strong>
            <pre style="margin-top: 8px; font-size: 12px;">${error.message}</pre>
          </div>
        `;
        element.setAttribute('data-processed', 'true');
      }
    }
  }
};
