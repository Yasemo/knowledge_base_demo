/**
 * Chart Renderer Plugin
 * 
 * Renders charts using Chart.js
 * Supports both JSON configuration and simple DSV (delimiter-separated values) format
 * Requires: chart.js library
 */

export const chartRenderer = {
  // Languages this plugin handles
  languages: ['chart'],

  /**
   * Render a chart
   * @param {string} code - Chart data (JSON or DSV)
   * @param {string} language - Language identifier
   * @param {Object} options - Rendering options (may include subtype like "bar", "line", "pie")
   * @returns {Promise<string>} Rendered HTML
   */
  async render(code, language, options = {}) {
    const id = 'chart-' + Math.random().toString(36).substr(2, 9);
    
    // Parse the chart configuration
    let chartConfig;
    try {
      // Try to parse as JSON first
      chartConfig = JSON.parse(code.trim());
    } catch (e) {
      // If JSON parsing fails, try to parse as DSV
      chartConfig = this.parseDSV(code.trim(), options.subtype || 'line');
    }
    
    // Store the configuration in a data attribute for later initialization
    const configJson = JSON.stringify(chartConfig);
    
    return `
      <div class="chart-container" style="position: relative; width: 100%; max-width: 600px; margin: 20px auto;">
        <canvas id="${id}" data-chart-config="${this.escapeHtml(configJson)}"></canvas>
      </div>
    `;
  },

  /**
   * Parse DSV (Delimiter-Separated Values) format
   * Example:
   *   Month,Sales,Costs
   *   Jan,100,80
   *   Feb,120,85
   * 
   * @param {string} data - DSV data
   * @param {string} chartType - Chart type (bar, line, pie, etc.)
   * @returns {Object} Chart.js configuration
   */
  parseDSV(data, chartType = 'line') {
    const lines = data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length < 2) {
      throw new Error('DSV data must have at least a header row and one data row');
    }
    
    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());
    const labelColumn = headers[0];
    const dataColumns = headers.slice(1);
    
    // Parse data rows
    const labels = [];
    const datasets = dataColumns.map(col => ({
      label: col,
      data: [],
      backgroundColor: [],
      borderColor: [],
      borderWidth: 2,
      tension: 0.4
    }));
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      labels.push(values[0]);
      
      for (let j = 0; j < dataColumns.length; j++) {
        const value = parseFloat(values[j + 1]);
        datasets[j].data.push(isNaN(value) ? 0 : value);
      }
    }
    
    // Assign colors to datasets
    const colors = [
      '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', 
      '#ff6b6b', '#9c27b0', '#3f51b5', '#ff9800'
    ];
    
    datasets.forEach((dataset, index) => {
      const color = colors[index % colors.length];
      dataset.backgroundColor = this.addAlpha(color, 0.2);
      dataset.borderColor = color;
      
      // For pie/doughnut charts, use different colors for each data point
      if (chartType === 'pie' || chartType === 'doughnut') {
        dataset.backgroundColor = dataset.data.map((_, i) => 
          this.addAlpha(colors[i % colors.length], 0.8)
        );
        dataset.borderColor = dataset.data.map((_, i) => colors[i % colors.length]);
      }
    });
    
    return {
      type: chartType,
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            enabled: true
          }
        },
        scales: chartType !== 'pie' && chartType !== 'doughnut' ? {
          y: {
            beginAtZero: true
          }
        } : undefined
      }
    };
  },

  /**
   * Add alpha channel to hex color
   * @param {string} hex - Hex color (e.g., "#4ecdc4")
   * @param {number} alpha - Alpha value (0-1)
   * @returns {string} RGBA color
   */
  addAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  /**
   * Escape HTML for data attributes
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Initialize Chart.js after content is inserted into DOM
   * @param {HTMLElement} container - Container element
   */
  async initialize(container) {
    if (typeof Chart === 'undefined') {
      console.error('Chart.js is not loaded');
      return;
    }

    // Find all chart canvases in the container
    const chartCanvases = container.querySelectorAll('canvas[data-chart-config]');
    
    for (const canvas of chartCanvases) {
      // Skip if already rendered
      if (canvas.getAttribute('data-chart-rendered') === 'true') {
        continue;
      }
      
      try {
        const configJson = canvas.getAttribute('data-chart-config');
        const config = JSON.parse(configJson);
        
        // Create the chart
        new Chart(canvas, config);
        
        canvas.setAttribute('data-chart-rendered', 'true');
      } catch (error) {
        console.error('Error rendering chart:', error);
        
        // Show error message
        const container = canvas.parentElement;
        container.innerHTML = `
          <div style="padding: 16px; background: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c33;">
            <strong>Chart Rendering Error:</strong>
            <pre style="margin-top: 8px; font-size: 12px;">${error.message}</pre>
          </div>
        `;
      }
    }
  }
};
