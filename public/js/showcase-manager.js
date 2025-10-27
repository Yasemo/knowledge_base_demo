import { createModal, closeModal, showError, showSuccess } from './utils.js';

let showcases = [];
let allCards = [];

export async function initShowcaseManager() {
  console.log('Showcase manager initialized');
}

export async function openShowcaseManagerModal() {
  // Load showcases and cards
  await loadShowcases();
  await loadCards();
  
  const content = `
    <div class="showcase-manager">
      <div class="showcase-list-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h2 style="margin: 0;">My Showcases</h2>
          <button class="text-btn primary" id="createShowcaseBtn">+ New Showcase</button>
        </div>
        
        <div id="showcasesList" class="showcases-list">
          ${showcases.length === 0 ? '<p style="color: var(--nyt-gray); text-align: center; padding: 2rem;">No showcases yet. Create your first showcase!</p>' : ''}
        </div>
      </div>
    </div>
  `;
  
  const modal = createModal(content, 'Showcases', '');
//   modal.style.maxWidth = '900px';
  
  // Render showcase list
  renderShowcasesList();
  
  // Event listeners
  document.getElementById('createShowcaseBtn').addEventListener('click', () => {
    closeModal(modal);
    openShowcaseEditorModal();
  });
}

function renderShowcasesList() {
  const container = document.getElementById('showcasesList');
  if (!container) return;
  
  if (showcases.length === 0) {
    container.innerHTML = '<p style="color: var(--nyt-gray); text-align: center; padding: 2rem;">No showcases yet. Create your first showcase!</p>';
    return;
  }
  
  container.innerHTML = showcases.map(showcase => `
    <div class="showcase-item" data-showcase-id="${showcase.id}">
      <div class="showcase-item-header">
        <h3 class="showcase-item-title">${escapeHtml(showcase.name)}</h3>
        <div class="showcase-item-actions">
          <button class="text-btn small secondary" onclick="window.showcaseManager.editShowcase('${showcase.id}')">Edit</button>
          <button class="text-btn small secondary" onclick="window.showcaseManager.viewShowcase('${showcase.id}')">View</button>
          <button class="text-btn small secondary" onclick="window.showcaseManager.copyShareLink('${showcase.id}')">📋 Share</button>
          <button class="text-btn small secondary" onclick="window.showcaseManager.deleteShowcase('${showcase.id}')">🗑️</button>
        </div>
      </div>
      ${showcase.description ? `<p class="showcase-item-description">${escapeHtml(showcase.description)}</p>` : ''}
      <div class="showcase-item-meta">
        <span>Created: ${new Date(showcase.created_at).toLocaleDateString()}</span>
        ${showcase.last_rendered_at ? `<span>Last updated: ${new Date(showcase.last_rendered_at).toLocaleDateString()}</span>` : ''}
      </div>
      <div class="showcase-share-url">
        <input type="text" readonly value="${window.location.origin}/public/showcase/${showcase.id}" class="share-url-input" id="share-url-${showcase.id}">
      </div>
    </div>
  `).join('');
}

// Module-level variable to track selected cards during editing
let currentSelectedCardIds = [];

export async function openShowcaseEditorModal(showcaseId = null) {
  const isEdit = showcaseId !== null;
  let showcase = null;
  
  if (isEdit) {
    const showcaseWithCards = await fetchShowcaseWithCards(showcaseId);
    if (!showcaseWithCards) {
      showError('Showcase not found');
      return;
    }
    showcase = showcaseWithCards;
    // Initialize selected cards from the showcase
    currentSelectedCardIds = showcaseWithCards.cards ? showcaseWithCards.cards.map(c => c.id) : [];
  } else {
    // Reset for new showcase
    currentSelectedCardIds = [];
  }
  
  const content = `
    <div class="showcase-editor">
      <div class="form-group">
        <label>Showcase Name *</label>
        <input type="text" id="showcaseName" class="form-input" placeholder="e.g., My Knowledge Collection" value="${isEdit ? escapeHtml(showcase.name) : ''}" required>
      </div>
      
      <div class="form-group">
        <label>Description</label>
        <textarea id="showcaseDescription" class="form-input" placeholder="Optional description" rows="2">${isEdit ? escapeHtml(showcase.description || '') : ''}</textarea>
      </div>
      
      <div class="form-group">
        <label>Settings</label>
        <div class="checkbox-group">
          <input type="checkbox" id="includeInfoOverlay" ${isEdit ? (showcase.settings?.includeInfoOverlay !== false ? 'checked' : '') : 'checked'}>
          <label for="includeInfoOverlay">Include info overlay (allows viewers to see card metadata)</label>
        </div>
      </div>
      
      <div class="form-group">
        <label>Select Cards *</label>
        <p style="font-size: 0.875rem; color: var(--nyt-gray); margin-bottom: 0.75rem;">
          Click cards to add them to your showcase. Drag to reorder.
        </p>
        
        <div class="card-selection-container">
          <div class="available-cards" id="availableCards">
            <h4 style="margin-bottom: 1rem;">Available Cards</h4>
            <div id="availableCardsList" class="cards-selection-list"></div>
          </div>
          
          <div class="selected-cards" id="selectedCards">
            <h4 style="margin-bottom: 1rem;" id="selectedCardsHeader">Selected Cards (<span id="selectedCount">0</span>)</h4>
            <div id="selectedCardsList" class="cards-selection-list sortable"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const footer = `
    <button type="button" class="text-btn secondary" id="cancelBtn">Cancel</button>
    <button type="button" class="text-btn primary" id="saveShowcaseBtn">${isEdit ? 'Update' : 'Create'} Showcase</button>
  `;
  
  const modal = createModal(content, isEdit ? 'Edit Showcase' : 'Create Showcase', footer);
  modal.style.maxWidth = '1200px';
  
  // Render card lists
  renderCardSelection();
  
  // Initialize drag and drop
  initializeDragAndDrop();
  
  // Event listeners
  document.getElementById('cancelBtn').addEventListener('click', () => {
    closeModal(modal);
  });
  
  document.getElementById('saveShowcaseBtn').addEventListener('click', async () => {
    await saveShowcase(showcaseId, modal);
  });
}

function renderCardSelection() {
  const availableContainer = document.getElementById('availableCardsList');
  const selectedContainer = document.getElementById('selectedCardsList');
  const countEl = document.getElementById('selectedCount');
  
  if (!availableContainer || !selectedContainer) return;
  
  // Update count
  if (countEl) {
    countEl.textContent = currentSelectedCardIds.length;
  }
  
  // Filter cards - preserve order of selected cards
  const selectedCards = currentSelectedCardIds
    .map(id => allCards.find(card => card.id === id))
    .filter(Boolean);
  const availableCards = allCards.filter(card => !currentSelectedCardIds.includes(card.id));
  
  // Render available cards
  availableContainer.innerHTML = availableCards.length === 0 
    ? '<p style="color: var(--nyt-gray); text-align: center; padding: 2rem;">All cards selected</p>'
    : availableCards.map(card => renderCardItem(card, false)).join('');
  
  // Render selected cards (in order)
  selectedContainer.innerHTML = selectedCards.length === 0
    ? '<p style="color: var(--nyt-gray); text-align: center; padding: 2rem;">No cards selected</p>'
    : selectedCards.map(card => renderCardItem(card, true)).join('');
  
  // Add click handlers for available cards
  availableContainer.querySelectorAll('.card-selection-item').forEach(item => {
    item.addEventListener('click', () => {
      const cardId = item.dataset.cardId;
      currentSelectedCardIds.push(cardId);
      renderCardSelection();
    });
  });
  
  // Add click handlers for selected cards (to remove)
  selectedContainer.querySelectorAll('.card-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardId = btn.closest('.card-selection-item').dataset.cardId;
      currentSelectedCardIds = currentSelectedCardIds.filter(id => id !== cardId);
      renderCardSelection();
    });
  });
}

function renderCardItem(card, isSelected) {
  const title = card.data?.title || card.data?.name || 'Untitled';
  return `
    <div class="card-selection-item" data-card-id="${card.id}" draggable="${isSelected}">
      <div class="card-selection-content">
        ${isSelected ? '<span class="drag-handle">⋮⋮</span>' : ''}
        <div>
          <div class="card-selection-title">${escapeHtml(title)}</div>
          <div class="card-selection-schema">${escapeHtml(card.schema_name)}</div>
        </div>
      </div>
      ${isSelected ? '<button class="card-remove-btn">✕</button>' : ''}
    </div>
  `;
}

function initializeDragAndDrop() {
  const selectedContainer = document.getElementById('selectedCardsList');
  let draggedElement = null;
  
  selectedContainer.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('card-selection-item')) {
      draggedElement = e.target;
      e.target.style.opacity = '0.5';
    }
  });
  
  selectedContainer.addEventListener('dragend', (e) => {
    if (e.target.classList.contains('card-selection-item')) {
      e.target.style.opacity = '';
      draggedElement = null;
    }
  });
  
  selectedContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(selectedContainer, e.clientY);
    if (afterElement == null) {
      selectedContainer.appendChild(draggedElement);
    } else {
      selectedContainer.insertBefore(draggedElement, afterElement);
    }
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.card-selection-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function saveShowcase(showcaseId, modal) {
  const name = document.getElementById('showcaseName').value.trim();
  const description = document.getElementById('showcaseDescription').value.trim();
  const includeInfoOverlay = document.getElementById('includeInfoOverlay').checked;
  
  // Use the module-level selected card IDs (maintains order from drag-and-drop)
  const selectedContainer = document.getElementById('selectedCardsList');
  const cardElements = selectedContainer.querySelectorAll('.card-selection-item');
  const cardIds = Array.from(cardElements).map(el => el.dataset.cardId);
  
  if (!name) {
    showError('Please enter a showcase name');
    return;
  }
  
  if (cardIds.length === 0) {
    showError('Please select at least one card');
    return;
  }
  
  const data = {
    name,
    description: description || undefined,
    card_ids: cardIds,
    settings: { includeInfoOverlay }
  };
  
  try {
    const url = showcaseId 
      ? `/api/showcases/${showcaseId}`
      : '/api/showcases';
    
    const method = showcaseId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save showcase');
    }
    
    showSuccess(`Showcase ${showcaseId ? 'updated' : 'created'} successfully!`);
    closeModal(modal);
    
    // Reload showcases and open manager
    await loadShowcases();
    openShowcaseManagerModal();
  } catch (error) {
    console.error('Error saving showcase:', error);
    showError('Failed to save showcase');
  }
}

async function loadShowcases() {
  try {
    const response = await fetch('/api/showcases');
    showcases = await response.json();
  } catch (error) {
    console.error('Error loading showcases:', error);
    showcases = [];
  }
}

async function loadCards() {
  try {
    const response = await fetch('/api/cards');
    allCards = await response.json();
  } catch (error) {
    console.error('Error loading cards:', error);
    allCards = [];
  }
}

async function fetchShowcase(id) {
  try {
    const response = await fetch(`/api/showcases/${id}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching showcase:', error);
    return null;
  }
}

async function fetchShowcaseWithCards(id) {
  try {
    const response = await fetch(`/api/showcases/${id}/with-cards`);
    if (!response.ok) {
      throw new Error('Failed to fetch showcase');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching showcase with cards:', error);
    return null;
  }
}

export async function editShowcase(id) {
  openShowcaseEditorModal(id);
}

export async function viewShowcase(id) {
  window.open(`/public/showcase/${id}`, '_blank');
}

export async function copyShareLink(id) {
  const url = `${window.location.origin}/public/showcase/${id}`;
  const input = document.getElementById(`share-url-${id}`);
  
  if (input) {
    input.select();
    document.execCommand('copy');
    showSuccess('Share link copied to clipboard!');
  } else {
    // Fallback
    navigator.clipboard.writeText(url).then(() => {
      showSuccess('Share link copied to clipboard!');
    }).catch(() => {
      showError('Failed to copy link');
    });
  }
}

export async function deleteShowcase(id) {
  if (!confirm('Are you sure you want to delete this showcase? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/showcases/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete showcase');
    }
    
    showSuccess('Showcase deleted successfully');
    await loadShowcases();
    renderShowcasesList();
  } catch (error) {
    console.error('Error deleting showcase:', error);
    showError('Failed to delete showcase');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Expose functions to window for onclick handlers
window.showcaseManager = {
  editShowcase,
  viewShowcase,
  copyShareLink,
  deleteShowcase
};
