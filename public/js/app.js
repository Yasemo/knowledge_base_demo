import { schemasAPI, cardsAPI, tagsAPI, showError } from './utils.js';
import { initSchemaBuilder, openSchemaModal } from './schema-builder.js';
import { initCardCreator, openCardCreatorModal } from './card-creator.js';
import { initCardViewer, renderCards, showCardDetail } from './card-viewer.js';
import { initTagManager, renderTagFilters, openTagModal } from './tag-manager.js';

// Application State
const state = {
  schemas: [],
  cards: [],
  tags: [],
  selectedTags: [],
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
    [state.schemas, state.cards, state.tags] = await Promise.all([
      schemasAPI.getAll(),
      cardsAPI.getAll(),
      tagsAPI.getAll(),
    ]);
  } catch (error) {
    console.error('Failed to load data:', error);
    throw error;
  }
}

// Reload cards with current filters
async function reloadCards() {
  try {
    state.cards = await cardsAPI.getAll(state.selectedTags);
    renderCards(state.cards, state.currentView);
    updateResultsCount();
  } catch (error) {
    console.error('Failed to reload cards:', error);
    showError('Failed to load cards');
  }
}

// Set up event listeners
function setupEventListeners() {
  // Menu button (toggle sidebar on mobile)
  document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('hidden');
  });
  
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
  
  // Clear filters button
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    state.selectedTags = [];
    reloadCards();
    renderTagFilters(state.tags, state.selectedTags, handleTagFilter);
    document.getElementById('clearFiltersBtn').style.display = 'none';
  });
  
  // View toggle buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.target.dataset.view;
      setView(view);
    });
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
  
  // Update UI
  reloadCards();
  renderTagFilters(state.tags, state.selectedTags, handleTagFilter);
  
  // Show/hide clear filters button
  document.getElementById('clearFiltersBtn').style.display = 
    state.selectedTags.length > 0 ? 'block' : 'none';
}

// Set view mode
function setView(view) {
  state.currentView = view;
  
  // Update active button
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  
  // Re-render cards
  renderCards(state.cards, state.currentView);
}

// Update results count
function updateResultsCount() {
  const count = state.cards.length;
  const text = count === 1 ? '1 card' : `${count} cards`;
  document.getElementById('resultsCount').textContent = text;
}

// Render schemas list in sidebar
function renderSchemasList() {
  const container = document.getElementById('schemasList');
  
  if (state.schemas.length === 0) {
    container.innerHTML = '<p style="font-size: 12px; color: var(--nyt-gray);">No schemas yet</p>';
    return;
  }
  
  container.innerHTML = state.schemas.map(schema => `
    <div class="schema-item" data-schema-id="${schema.id}">
      <span class="schema-name">${schema.name}</span>
      <div class="schema-actions">
        <button class="schema-action-btn" data-action="edit" data-schema-id="${schema.id}" title="Edit">✎</button>
        <button class="schema-action-btn" data-action="delete" data-schema-id="${schema.id}" title="Delete">✕</button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners
  container.querySelectorAll('.schema-action-btn').forEach(btn => {
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
}

// Main render function
function render() {
  renderSchemasList();
  renderTagFilters(state.tags, state.selectedTags, handleTagFilter);
  renderCards(state.cards, state.currentView);
  updateResultsCount();
}

// Export state and functions for other modules
window.appState = state;
window.reloadCards = reloadCards;
window.loadData = loadData;
window.render = render;

// Start the application
init();
