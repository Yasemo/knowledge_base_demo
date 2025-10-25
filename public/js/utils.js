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
