// API Base URL
const API_BASE = '/api';

// API Helper Functions
export async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Schemas API
export const schemasAPI = {
  getAll: () => fetchAPI('/schemas'),
  getById: (id) => fetchAPI(`/schemas/${id}`),
  create: (data) => fetchAPI('/schemas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchAPI(`/schemas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchAPI(`/schemas/${id}`, { method: 'DELETE' }),
};

// Cards API
export const cardsAPI = {
  getAll: (tagIds) => {
    const query = tagIds && tagIds.length > 0 ? `?tags=${tagIds.join(',')}` : '';
    return fetchAPI(`/cards${query}`);
  },
  getById: (id) => fetchAPI(`/cards/${id}`),
  create: (data) => fetchAPI('/cards', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchAPI(`/cards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchAPI(`/cards/${id}`, { method: 'DELETE' }),
};

// Tags API
export const tagsAPI = {
  getAll: () => fetchAPI('/tags'),
  getById: (id) => fetchAPI(`/tags/${id}`),
  create: (data) => fetchAPI('/tags', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchAPI(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchAPI(`/tags/${id}`, { method: 'DELETE' }),
};

// Views API
export const viewsAPI = {
  getAll: () => fetchAPI('/views'),
  getById: (id) => fetchAPI(`/views/${id}`),
  create: (data) => fetchAPI('/views', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchAPI(`/views/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchAPI(`/views/${id}`, { method: 'DELETE' }),
};

// Format date for display
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Render markdown using marked.js
export function renderMarkdown(content) {
  if (!content) return '';
  
  // Configure marked
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true,
    mangle: false,
  });
  
  return marked.parse(content);
}

// Extract excerpt from markdown content
export function extractExcerpt(content, maxLength = 150) {
  if (!content) return '';
  
  // Remove markdown syntax for excerpt
  let text = content
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
    .replace(/`(.+?)`/g, '$1') // Remove inline code
    .replace(/```[\s\S]+?```/g, '') // Remove code blocks
    .trim();
  
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '...';
  }
  
  return text;
}

// Estimate token count using word-based method
// Formula: 1 token ≈ 0.75 words (or ~4 characters)
// Provides ~5-15% accuracy without external dependencies
export function estimateTokenCount(text) {
  if (!text || typeof text !== 'string') return 0;
  
  // Count words by splitting on whitespace
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  
  // Convert words to estimated tokens: tokens = words / 0.75
  const estimatedTokens = Math.ceil(wordCount / 0.75);
  
  return estimatedTokens;
}

// Escape value for CSV format
export function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  
  const str = String(value);
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  
  return str;
}

// Export cards to CSV file
export function exportCardsToCSV(cards, filename, includeContent = false) {
  if (!cards || cards.length === 0) {
    showError('No cards to export');
    return;
  }
  
  // Get all unique field names from all cards
  const allFields = new Set();
  cards.forEach(card => {
    Object.keys(card.data || {}).forEach(key => {
      // Skip title/name as we'll handle separately
      if (key !== 'title' && key !== 'name') {
        allFields.add(key);
      }
    });
  });
  
  const fieldArray = Array.from(allFields).sort();
  
  // Build CSV header
  const headers = [
    'Schema',
    'Title',
    'Created Date',
    'Updated Date',
    'Token Count',
    'Tags',
    ...fieldArray
  ];
  
  if (includeContent) {
    headers.push('Content');
  }
  
  // Build CSV rows
  const rows = cards.map(card => {
    const title = card.data?.title || card.data?.name || 'Untitled';
    const tags = card.tags ? card.tags.map(t => t.name).join('; ') : '';
    const tokenCount = estimateTokenCount(card.content || '');
    
    const row = [
      escapeCSV(card.schema_name),
      escapeCSV(title),
      escapeCSV(formatDate(card.created_at)),
      escapeCSV(formatDate(card.updated_at || card.created_at)),
      escapeCSV(tokenCount),
      escapeCSV(tags)
    ];
    
    // Add dynamic fields
    fieldArray.forEach(field => {
      const value = card.data?.[field];
      if (Array.isArray(value)) {
        row.push(escapeCSV(value.join('; ')));
      } else {
        row.push(escapeCSV(value));
      }
    });
    
    // Add content if requested
    if (includeContent) {
      row.push(escapeCSV(card.content || ''));
    }
    
    return row;
  });
  
  // Combine header and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showSuccess(`Exported ${cards.length} cards to ${filename}`);
}

// Show export options modal
export function showExportModal(cards, baseFilename, onExport) {
  const content = `
    <div style="padding: 16px;">
      <p style="font-family: var(--font-sans); font-size: 14px; margin-bottom: 16px;">
        Exporting <strong>${cards.length}</strong> card${cards.length === 1 ? '' : 's'}
      </p>
      
      <label style="display: flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-size: 14px; cursor: pointer;">
        <input type="checkbox" id="includeContentCheckbox" style="cursor: pointer;">
        Include full content field (may create large file)
      </label>
    </div>
  `;
  
  const footer = `
    <button type="button" class="text-btn secondary" id="cancelExportBtn">Cancel</button>
    <button type="button" class="text-btn primary" id="confirmExportBtn">Export CSV</button>
  `;
  
  const modal = createModal(content, 'Export to CSV', footer);
  
  // Event listeners
  document.getElementById('cancelExportBtn').addEventListener('click', () => {
    closeModal(modal);
  });
  
  document.getElementById('confirmExportBtn').addEventListener('click', () => {
    const includeContent = document.getElementById('includeContentCheckbox').checked;
    closeModal(modal);
    
    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `${baseFilename}-${date}.csv`;
    
    exportCardsToCSV(cards, filename, includeContent);
    
    if (onExport) onExport();
  });
}

// Create modal overlay
export function createModal(content, title, footer = null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button class="modal-close" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal(overlay);
    }
  });
  
  // Close on close button click
  const closeBtn = overlay.querySelector('.modal-close');
  closeBtn.addEventListener('click', () => closeModal(overlay));
  
  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal(overlay);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  document.getElementById('modalContainer').appendChild(overlay);
  
  return overlay;
}

// Close modal
export function closeModal(modal) {
  modal.remove();
}

// Show error message
export function showError(message) {
  alert(`Error: ${message}`);
}

// Show success message
export function showSuccess(message) {
  console.log('Success:', message);
}

// Generate random color for tags
export function generateRandomColor() {
  const colors = [
    '#e91e63', '#9c27b0', '#3f51b5', '#2196f3', 
    '#00bcd4', '#009688', '#4caf50', '#8bc34a',
    '#ff9800', '#ff5722', '#795548', '#607d8b'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Field type options for schema builder
export const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'select', label: 'Select (Single)' },
  { value: 'multi_select', label: 'Multi-Select' },
  { value: 'boolean', label: 'Boolean (Checkbox)' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
];

// Collect all unique fields from schemas
export function collectAllFields(schemas) {
  const fieldsMap = new Map();
  
  schemas.forEach(schema => {
    const fields = schema.field_definitions?.fields || [];
    fields.forEach(field => {
      // Skip markdown/content fields as they're not good for filtering
      if (field.type === 'markdown' || field.is_primary_content) {
        return;
      }
      
      const key = field.name;
      if (!fieldsMap.has(key)) {
        fieldsMap.set(key, {
          name: field.name,
          label: field.label,
          type: field.type,
          options: field.options || null,
          schemas: [schema.name]
        });
      } else {
        // Field exists in multiple schemas
        const existing = fieldsMap.get(key);
        if (!existing.schemas.includes(schema.name)) {
          existing.schemas.push(schema.name);
        }
        // Merge options if it's a select field
        if (field.options && existing.options) {
          const existingValues = new Set(existing.options.map(o => o.value));
          field.options.forEach(opt => {
            if (!existingValues.has(opt.value)) {
              existing.options.push(opt);
            }
          });
        }
      }
    });
  });
  
  return Array.from(fieldsMap.values());
}

// Match field filter
export function matchesFieldFilter(cardValue, operator, filterValue) {
  if (cardValue === undefined || cardValue === null) {
    return operator === 'is_empty';
  }
  
  switch (operator) {
    case 'equals':
      return String(cardValue).toLowerCase() === String(filterValue).toLowerCase();
    case 'not_equals':
      return String(cardValue).toLowerCase() !== String(filterValue).toLowerCase();
    case 'contains':
      return String(cardValue).toLowerCase().includes(String(filterValue).toLowerCase());
    case 'not_contains':
      return !String(cardValue).toLowerCase().includes(String(filterValue).toLowerCase());
    case 'is_empty':
      return !cardValue || cardValue === '';
    case 'is_not_empty':
      return cardValue && cardValue !== '';
    default:
      return false;
  }
}
