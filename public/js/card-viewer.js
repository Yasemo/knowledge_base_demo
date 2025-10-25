import { formatDate, extractExcerpt, renderMarkdown, createModal, closeModal } from './utils.js';

export function initCardViewer() {
  console.log('Card viewer initialized');
}

export function renderCards(cards, viewMode = 'grid') {
  const container = document.getElementById('cardsContainer');
  
  if (!cards || cards.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-state-title">No Content Cards Yet</h3>
        <p class="empty-state-text">Create your first content card to get started</p>
      </div>
    `;
    return;
  }
  
  // Set container class based on view mode
  container.className = viewMode === 'grid' ? 'cards-grid' : 
                       viewMode === 'list' ? 'cards-list' : '';
  
  if (viewMode === 'table') {
    renderTableView(cards, container);
  } else {
    renderGridOrListView(cards, container, viewMode);
  }
}

function renderGridOrListView(cards, container, viewMode) {
  container.innerHTML = cards.map(card => {
    const excerpt = extractExcerpt(card.content);
    const tags = card.tags || [];
    
    return `
      <div class="content-card" data-card-id="${card.id}">
        <div class="card-header">
          <div class="card-metadata">
            <span class="card-schema-badge">${card.schema_name}</span>
            <span class="card-date">${formatDate(card.created_at)}</span>
          </div>
          <h3 class="card-title">${getCardTitle(card)}</h3>
          <p class="card-excerpt">${excerpt}</p>
        </div>
        ${tags.length > 0 ? `
          <div class="card-tags">
            ${tags.map(tag => `
              <span class="card-tag">
                <span class="tag-color-dot" style="background: ${tag.color};"></span>
                ${tag.name}
              </span>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  
  // Add click handlers to open card detail
  container.querySelectorAll('.content-card').forEach(cardEl => {
    cardEl.addEventListener('click', () => {
      const cardId = cardEl.dataset.cardId;
      const card = cards.find(c => c.id === cardId);
      if (card) {
        showCardDetail(card);
      }
    });
  });
}

function renderTableView(cards, container) {
  // Get all unique field names from cards
  const allFields = new Set();
  cards.forEach(card => {
    Object.keys(card.data || {}).forEach(key => allFields.add(key));
  });
  
  const fieldArray = Array.from(allFields);
  
  container.innerHTML = `
    <table class="cards-table">
      <thead>
        <tr>
          <th>Schema</th>
          <th>Title</th>
          ${fieldArray.map(field => `<th>${field}</th>`).join('')}
          <th>Tags</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${cards.map(card => {
          const tags = card.tags || [];
          return `
            <tr data-card-id="${card.id}" style="cursor: pointer;">
              <td>${card.schema_name}</td>
              <td style="font-weight: 600;">${getCardTitle(card)}</td>
              ${fieldArray.map(field => {
                const value = card.data[field];
                return `<td>${formatFieldValue(value)}</td>`;
              }).join('')}
              <td>
                ${tags.map(tag => `
                  <span style="display: inline-block; padding: 2px 6px; font-size: 10px; background: ${tag.color}20; border: 1px solid ${tag.color}; margin-right: 4px;">
                    ${tag.name}
                  </span>
                `).join('')}
              </td>
              <td>${formatDate(card.created_at)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  
  // Add click handlers
  container.querySelectorAll('tr[data-card-id]').forEach(row => {
    row.addEventListener('click', () => {
      const cardId = row.dataset.cardId;
      const card = cards.find(c => c.id === cardId);
      if (card) {
        showCardDetail(card);
      }
    });
  });
}

function getCardTitle(card) {
  // Try to find a title field in the data
  const data = card.data || {};
  return data.title || data.name || data.subject || 'Untitled';
}

function formatFieldValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function showCardDetail(card) {
  const tags = card.tags || [];
  const data = card.data || {};
  
  // Render markdown content
  const renderedContent = renderMarkdown(card.content);
  
  const content = `
    <div class="card-detail">
      <div class="card-detail-header">
        <div class="card-metadata">
          <span class="card-schema-badge">${card.schema_name}</span>
          <span class="card-date">${formatDate(card.created_at)}</span>
        </div>
        <h1 class="card-detail-title">${getCardTitle(card)}</h1>
        
        ${Object.keys(data).length > 0 ? `
          <div style="margin-bottom: 16px;">
            ${Object.entries(data).map(([key, value]) => {
              if (key === 'title' || key === 'name') return ''; // Skip title as it's in header
              return `
                <div style="margin-bottom: 8px;">
                  <strong style="font-family: var(--font-sans); font-size: 12px; text-transform: uppercase; color: var(--nyt-gray);">
                    ${key.replace(/_/g, ' ')}:
                  </strong>
                  <span style="margin-left: 8px;">
                    ${formatFieldValue(value)}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
        
        ${tags.length > 0 ? `
          <div class="card-tags">
            ${tags.map(tag => `
              <span class="card-tag">
                <span class="tag-color-dot" style="background: ${tag.color};"></span>
                ${tag.name}
              </span>
            `).join('')}
          </div>
        ` : ''}
      </div>
      
      <div class="card-detail-content">
        ${renderedContent}
      </div>
    </div>
  `;
  
  const footer = `
    <button type="button" class="text-btn secondary" id="editCardBtn">Edit</button>
    <button type="button" class="text-btn secondary" id="deleteCardBtn">Delete</button>
    <button type="button" class="text-btn primary" id="closeDetailBtn">Close</button>
  `;
  
  const modal = createModal(content, '', footer);
  
  // Event listeners
  document.getElementById('closeDetailBtn').addEventListener('click', () => {
    closeModal(modal);
  });
  
  document.getElementById('editCardBtn').addEventListener('click', () => {
    closeModal(modal);
    // Import and call card creator with edit mode
    import('./card-creator.js').then(module => {
      module.openCardCreatorModal(
        window.appState.schemas,
        window.appState.tags,
        card,
        async () => {
          await window.reloadCards();
        }
      );
    });
  });
  
  document.getElementById('deleteCardBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete this card?')) {
      try {
        const { cardsAPI } = await import('./utils.js');
        await cardsAPI.delete(card.id);
        closeModal(modal);
        await window.reloadCards();
      } catch (error) {
        const { showError } = await import('./utils.js');
        showError('Failed to delete card');
      }
    }
  });
}
