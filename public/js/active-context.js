import { createModal, closeModal, cardsAPI, estimateTokenCount } from './utils.js';
import { showCardDetail } from './card-viewer.js';

let currentModal = null;

export function initActiveContext() {
  console.log('Active Context initialized');
}

export function openActiveContextModal(tags, views, cards) {
  const content = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <!-- Selection Area -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <!-- Tags Selection -->
        <div>
          <label class="form-label" style="margin-bottom: 12px;">Select Tags</label>
          <div id="activeContextTags" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
            ${tags.length === 0 ? '<p style="color: var(--nyt-gray); font-size: 14px;">No tags available</p>' : ''}
            ${tags.map(tag => `
              <label style="display: flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-size: 14px; cursor: pointer;">
                <input type="checkbox" class="tag-checkbox" value="${tag.id}" style="cursor: pointer;">
                <span class="tag-color-dot" style="background: ${tag.color}; width: 12px; height: 12px; border-radius: 50%;"></span>
                <span>${tag.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
        
        <!-- Views Selection -->
        <div>
          <label class="form-label" style="margin-bottom: 12px;">Select Views</label>
          <div id="activeContextViews" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
            ${views.length === 0 ? '<p style="color: var(--nyt-gray); font-size: 14px;">No views available</p>' : ''}
            ${views.map(view => `
              <label style="display: flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-size: 14px; cursor: pointer;">
                <input type="checkbox" class="view-checkbox" value="${view.id}" style="cursor: pointer;">
                <span>${view.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
      
      <!-- Active Context Counter -->
      <div style="background: var(--nyt-light-gray); border: 2px solid var(--nyt-border); padding: 16px; text-align: center;">
        <div style="font-family: var(--font-sans); font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--nyt-gray); margin-bottom: 4px;">
          🎯 Active Context
        </div>
        <div id="activeContextCount" style="font-family: var(--font-serif); font-size: 32px; font-weight: 700; color: var(--nyt-black);">
          0 cards
        </div>
      </div>
      
      <!-- Cards Grid -->
      <div>
        <label class="form-label" style="margin-bottom: 12px;">Selected Cards</label>
        <div id="activeContextGrid" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--nyt-border); padding: 16px; background: var(--nyt-white);">
          <div style="text-align: center; color: var(--nyt-gray); padding: 40px;">
            Select tags or views to see cards
          </div>
        </div>
      </div>
    </div>
  `;
  
  const footer = `
    <button type="button" class="text-btn secondary" id="clearSelectionBtn">Clear Selection</button>
    <button type="button" class="text-btn primary" id="closeActiveContextBtn">Close</button>
  `;
  
  currentModal = createModal(content, 'Active Context', footer);
  
  // Set up event listeners
  setupEventListeners(tags, views, cards);
}

function setupEventListeners(tags, views, allCards) {
  // Tag checkboxes
  document.querySelectorAll('.tag-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      updateActiveContext(tags, views, allCards);
    });
  });
  
  // View checkboxes
  document.querySelectorAll('.view-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      updateActiveContext(tags, views, allCards);
    });
  });
  
  // Clear selection button
  document.getElementById('clearSelectionBtn').addEventListener('click', () => {
    document.querySelectorAll('.tag-checkbox, .view-checkbox').forEach(cb => {
      cb.checked = false;
    });
    updateActiveContext(tags, views, allCards);
  });
  
  // Close button
  document.getElementById('closeActiveContextBtn').addEventListener('click', () => {
    closeModal(currentModal);
  });
}

function updateActiveContext(tags, views, allCards) {
  const selectedTagIds = Array.from(document.querySelectorAll('.tag-checkbox:checked')).map(cb => cb.value);
  const selectedViewIds = Array.from(document.querySelectorAll('.view-checkbox:checked')).map(cb => cb.value);
  
  // Calculate unique cards
  const uniqueCards = calculateUniqueCards(selectedTagIds, selectedViewIds, views, allCards);
  
  // Calculate total token count
  const totalTokens = uniqueCards.reduce((sum, card) => {
    return sum + estimateTokenCount(card.content || '');
  }, 0);
  
  // Update count display
  const count = uniqueCards.length;
  const cardText = count === 1 ? '1 card' : `${count} cards`;
  const tokenText = totalTokens.toLocaleString();
  document.getElementById('activeContextCount').textContent = `${cardText} • ${tokenText} tokens`;
  
  // Update grid
  renderActiveContextGrid(uniqueCards);
}

function calculateUniqueCards(selectedTagIds, selectedViewIds, views, allCards) {
  const cardIdSet = new Set();
  
  // Add cards by selected tags
  selectedTagIds.forEach(tagId => {
    allCards.forEach(card => {
      if (card.tags && card.tags.some(tag => tag.id === tagId)) {
        cardIdSet.add(card.id);
      }
    });
  });
  
  // Add cards by selected views
  selectedViewIds.forEach(viewId => {
    const view = views.find(v => v.id === viewId);
    if (view) {
      allCards.forEach(card => {
        let matches = true;
        
        // Check schema filter
        if (view.schema_id && card.schema_id !== view.schema_id) {
          matches = false;
        }
        
        // Check tag filters
        if (view.tag_ids && view.tag_ids.length > 0) {
          const cardTagIds = card.tags ? card.tags.map(t => t.id) : [];
          const hasAllTags = view.tag_ids.every(tagId => cardTagIds.includes(tagId));
          if (!hasAllTags) {
            matches = false;
          }
        }
        
        // Check field filters
        if (view.field_filters && view.field_filters.length > 0) {
          const passesFieldFilters = view.field_filters.every(filter => {
            const cardValue = card.data[filter.field_name];
            return matchesFieldFilter(cardValue, filter.operator, filter.value);
          });
          if (!passesFieldFilters) {
            matches = false;
          }
        }
        
        if (matches) {
          cardIdSet.add(card.id);
        }
      });
    }
  });
  
  // Convert Set to array of unique cards
  return Array.from(cardIdSet).map(id => allCards.find(c => c.id === id)).filter(c => c);
}

function matchesFieldFilter(cardValue, operator, filterValue) {
  if (cardValue === null || cardValue === undefined) return false;
  
  switch (operator) {
    case 'equals':
      return String(cardValue) === String(filterValue);
    case 'not_equals':
      return String(cardValue) !== String(filterValue);
    case 'contains':
      return String(cardValue).toLowerCase().includes(String(filterValue).toLowerCase());
    case 'greater_than':
      return Number(cardValue) > Number(filterValue);
    case 'less_than':
      return Number(cardValue) < Number(filterValue);
    default:
      return false;
  }
}

function renderActiveContextGrid(cards) {
  const container = document.getElementById('activeContextGrid');
  
  if (cards.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--nyt-gray); padding: 40px;">
        No cards match the selected criteria
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
      ${cards.map(card => {
        const title = card.data.title || card.data.name || 'Untitled';
        const tags = card.tags || [];
        
        return `
          <div class="active-context-card" data-card-id="${card.id}" style="border: 1px solid var(--nyt-border); padding: 12px; cursor: pointer; transition: all 0.2s ease; background: var(--nyt-white);">
            <div style="font-family: var(--font-sans); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--nyt-gray); margin-bottom: 4px;">
              ${card.schema_name}
            </div>
            <div style="font-family: var(--font-serif); font-size: 14px; font-weight: 700; margin-bottom: 8px; line-height: 1.3;">
              ${title}
            </div>
            ${tags.length > 0 ? `
              <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                ${tags.map(tag => `
                  <span style="display: inline-flex; align-items: center; gap: 2px; font-size: 9px; padding: 2px 4px; background: ${tag.color}20; border: 1px solid ${tag.color};">
                    ${tag.name}
                  </span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  // Add click handlers
  container.querySelectorAll('.active-context-card').forEach(cardEl => {
    cardEl.addEventListener('mouseenter', function() {
      this.style.borderColor = 'var(--nyt-border-dark)';
      this.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    });
    
    cardEl.addEventListener('mouseleave', function() {
      this.style.borderColor = 'var(--nyt-border)';
      this.style.boxShadow = 'none';
    });
    
    cardEl.addEventListener('click', () => {
      const cardId = cardEl.dataset.cardId;
      const card = cards.find(c => c.id === cardId);
      if (card) {
        showCardDetail(card);
      }
    });
  });
}
