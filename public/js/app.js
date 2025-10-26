import { schemasAPI, cardsAPI, tagsAPI, viewsAPI, showError, matchesFieldFilter, showExportModal } from './utils.js';
import { initSchemaBuilder, openSchemaModal } from './schema-builder.js';
import { initCardCreator, openCardCreatorModal } from './card-creator.js';
import { initCardViewer, renderCards, showCardDetail } from './card-viewer.js';
import { initTagManager, renderTagFilters, openTagModal } from './tag-manager.js';
import { initViewManager, renderViews, openViewModal } from './view-manager.js';
import { initActiveContext, openActiveContextModal } from './active-context.js';
import { initShowcaseManager, openShowcaseManagerModal } from './showcase-manager.js';

// Application State
const state = {
  schemas: [],
  cards: [],
  tags: [],
  views: [],
  selectedTags: [],
  selectedSchema: null, // Filter by schema
  activeView: null, // Active saved view
  currentView: 'grid', // grid, list, table
};

// Initialize Application
async function init() {
  try {
    // Load initial data
    await loadData();
    
    // Initialize modules
    initSchemaBuilder();
    initCardCreator();
    initCardViewer();
    initTagManager();
    initViewManager();
    initActiveContext();
    initShowcaseManager();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initial render
    render();
    
    console.log('✅ Application initialized');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    showError('Failed to load application. Please refresh the page.');
  }
}

// Load data from API
async function loadData() {
  try {
    [state.schemas, state.cards, state.tags, state.views] = await Promise.all([
      schemasAPI.getAll(),
      cardsAPI.getAll(),
      tagsAPI.getAll(),
      viewsAPI.getAll(),
    ]);
  } catch (error) {
    console.error('Failed to load data:', error);
    throw error;
  }
}

// Reload cards with current filters
async function reloadCards() {
  try {
    let cards = await cardsAPI.getAll(state.selectedTags);
    
    // Filter by schema if one is selected
    if (state.selectedSchema) {
      cards = cards.filter(card => card.schema_id === state.selectedSchema);
    }
    
    // Apply field filters from active view
    if (state.activeView) {
      const view = state.views.find(v => v.id === state.activeView);
      if (view && view.field_filters && view.field_filters.length > 0) {
        cards = cards.filter(card => {
          // Card must match ALL field filters (AND logic)
          return view.field_filters.every(filter => {
            const cardValue = card.data[filter.field_name];
            return matchesFieldFilter(cardValue, filter.operator, filter.value);
          });
        });
      }
    }
    
    state.cards = cards;
    renderCards(state.cards, state.currentView);
    updateResultsCount();
  } catch (error) {
    console.error('Failed to reload cards:', error);
    showError('Failed to load cards');
  }
}

// Apply view filters
async function applyView(viewId) {
  if (!viewId) {
    // "All Cards" view - clear all filters
    state.activeView = null;
    state.selectedSchema = null;
    state.selectedTags = [];
  } else {
    // Find and apply the view
    const view = state.views.find(v => v.id === viewId);
    if (view) {
      state.activeView = viewId;
      state.selectedSchema = view.schema_id || null;
      state.selectedTags = view.tag_ids || [];
    }
  }
  
  // Reload cards with new filters
  await reloadCards();
  
  // Update UI
  render();
}

// Set up event listeners
function setupEventListeners() {
  // New schema button
  document.getElementById('newSchemaBtn').addEventListener('click', () => {
    openSchemaModal(null, async () => {
      await loadData();
      render();
    });
  });
  
  // New card button
  document.getElementById('newCardBtn').addEventListener('click', () => {
    if (state.schemas.length === 0) {
      showError('Please create a schema first before creating cards');
      return;
    }
    openCardCreatorModal(state.schemas, state.tags, null, async () => {
      await reloadCards();
    });
  });
  
  // New tag button
  document.getElementById('newTagBtn').addEventListener('click', () => {
    openTagModal(null, async () => {
      state.tags = await tagsAPI.getAll();
      renderTagFilters(state.tags, state.selectedTags, handleTagFilter);
    });
  });
  
  // New view button
  document.getElementById('newViewBtn').addEventListener('click', () => {
    openViewModal(null, state.schemas, state.tags, async () => {
      state.views = await viewsAPI.getAll();
      render();
    }, state.cards);
  });
  
  // Showcases button
  document.getElementById('showcasesBtn').addEventListener('click', () => {
    openShowcaseManagerModal();
  });
  
  // Active Context button
  document.getElementById('activeContextBtn').addEventListener('click', async () => {
    // Get all cards (without current filters)
    const allCards = await cardsAPI.getAll();
    openActiveContextModal(state.tags, state.views, allCards);
  });
  
  // Clear filters button
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    state.selectedTags = [];
    state.activeView = null;
    reloadCards();
    render();
  });
  
  // View toggle buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.target.dataset.view;
      setView(view);
    });
  });
  
  // Export table button
  document.getElementById('exportTableBtn').addEventListener('click', () => {
    if (state.cards.length === 0) {
      showError('No cards to export');
      return;
    }
    
    // Generate filename based on active filters
    let filename = 'knowledge-base';
    
    if (state.activeView) {
      const view = state.views.find(v => v.id === state.activeView);
      if (view) {
        filename = view.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      }
    } else if (state.selectedSchema) {
      const schema = state.schemas.find(s => s.id === state.selectedSchema);
      if (schema) {
        filename = schema.name.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-cards';
      }
    } else if (state.selectedTags.length > 0) {
      const tagNames = state.selectedTags
        .map(tagId => state.tags.find(t => t.id === tagId)?.name)
        .filter(Boolean)
        .join('-');
      filename = tagNames.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-cards';
    }
    
    showExportModal(state.cards, filename);
  });
}

// Handle tag filter selection
function handleTagFilter(tagId) {
  const index = state.selectedTags.indexOf(tagId);
  
  if (index > -1) {
    // Remove tag from filters
    state.selectedTags.splice(index, 1);
  } else {
    // Add tag to filters
    state.selectedTags.push(tagId);
  }
  
  // Clear active view when manually changing filters
  state.activeView = null;
  
  // Update UI
  reloadCards();
  render();
}

// Set view mode
function setView(view) {
  state.currentView = view;
  
  // Update active button
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  
  // Show export button only in table view
  const exportBtn = document.getElementById('exportTableBtn');
  exportBtn.style.display = view === 'table' ? 'block' : 'none';
  
  // Re-render cards with new view
  renderCards(state.cards, state.currentView);
}

// Update results count
function updateResultsCount() {
  const count = state.cards.length;
  const text = count === 1 ? '1 card' : `${count} cards`;
  document.getElementById('resultsCount').textContent = text;
}

// Render schemas as horizontal chips in toolbar
function renderSchemasList() {
  const container = document.getElementById('schemasList');
  
  if (state.schemas.length === 0) {
    container.innerHTML = '<span style="font-size: 12px; color: var(--nyt-gray);">No schemas yet</span>';
    return;
  }
  
  container.innerHTML = state.schemas.map(schema => {
    const isActive = state.selectedSchema === schema.id;
    return `
      <div class="schema-chip ${isActive ? 'active' : ''}" data-schema-id="${schema.id}">
        <span>${schema.name}</span>
        <div class="schema-chip-actions">
          <button class="schema-chip-btn" data-action="edit" data-schema-id="${schema.id}" title="Edit">✎</button>
          <button class="schema-chip-btn" data-action="delete" data-schema-id="${schema.id}" title="Delete">✕</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Add event listeners for action buttons
  container.querySelectorAll('.schema-chip-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const schemaId = btn.dataset.schemaId;
      
      if (action === 'edit') {
        const schema = state.schemas.find(s => s.id === schemaId);
        openSchemaModal(schema, async () => {
          await loadData();
          render();
        });
      } else if (action === 'delete') {
        if (confirm('Are you sure you want to delete this schema? All cards using this schema will also be deleted.')) {
          try {
            await schemasAPI.delete(schemaId);
            await loadData();
            render();
          } catch (error) {
            showError('Failed to delete schema');
          }
        }
      }
    });
  });
  
  // Add event listeners for schema chip filtering
  container.querySelectorAll('.schema-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      // Don't trigger if clicking action buttons
      if (e.target.closest('.schema-chip-btn')) return;
      
      const schemaId = chip.dataset.schemaId;
      
      // Clear active view when manually changing filters
      state.activeView = null;
      
      // Toggle schema filter
      if (state.selectedSchema === schemaId) {
        state.selectedSchema = null;
      } else {
        state.selectedSchema = schemaId;
      }
      
      reloadCards();
      render();
    });
  });
}

// Main render function
function render() {
  renderViews(state.views, state.schemas, state.tags, state.activeView, applyView, state.cards);
  renderSchemasList();
  renderTagFilters(state.tags, state.selectedTags, handleTagFilter);
  renderCards(state.cards, state.currentView);
  updateResultsCount();
  
  // Show/hide clear filters button
  const hasFilters = state.selectedTags.length > 0 || state.selectedSchema || state.activeView;
  document.getElementById('clearFiltersBtn').style.display = hasFilters ? 'block' : 'none';
}

// Export state and functions for other modules
window.appState = state;
window.reloadCards = reloadCards;
window.loadData = loadData;
window.render = render;

// Start the application
init();
