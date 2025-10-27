import { formatDate, extractExcerpt, renderMarkdown, initializeRenderedContent, createModal, closeModal, estimateTokenCount } from './utils.js';

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
                       viewMode === 'list' ? 'cards-list' :
                       viewMode === 'carousel' ? 'carousel-container' : '';
  
  if (viewMode === 'table') {
    renderTableView(cards, container);
  } else if (viewMode === 'carousel') {
    renderCarouselView(cards, container);
  } else {
    renderGridOrListView(cards, container, viewMode);
  }
}

function renderGridOrListView(cards, container, viewMode) {
  container.innerHTML = cards.map(card => {
    const excerpt = extractExcerpt(card.content);
    const tags = card.tags || [];
    const tokenCount = estimateTokenCount(card.content);
    
    return `
      <div class="content-card" data-card-id="${card.id}">
        <div class="card-header">
          <div class="card-metadata">
            <span class="card-schema-badge">${card.schema_name}</span>
            <span class="card-date">${formatDate(card.created_at)}</span>
            <span style="color: var(--nyt-gray);">🔢 ${tokenCount} tokens</span>
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
          <th>Actions</th>
          <th>Tags</th>
          <th>Schema</th>
          <th>Title</th>
          ${fieldArray.map(field => `<th>${field}</th>`).join('')}
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${cards.map(card => {
          const tags = card.tags || [];
          return `
            <tr data-card-id="${card.id}">
              <td class="non-editable">
                <button class="text-btn small secondary table-action-btn" data-action="view" data-card-id="${card.id}" title="View">👁️</button>
                <button class="text-btn small secondary table-action-btn" data-action="delete" data-card-id="${card.id}" title="Delete">🗑️</button>
              </td>
              <td class="non-editable">
                ${tags.map(tag => `
                  <span style="display: inline-block; padding: 2px 6px; font-size: 10px; background: ${tag.color}20; border: 1px solid ${tag.color}; margin-right: 4px;">
                    ${tag.name}
                  </span>
                `).join('')}
              </td>
              <td class="non-editable">${card.schema_name}</td>
              <td class="non-editable" style="font-weight: 600;">${getCardTitle(card)}</td>
              ${fieldArray.map(field => {
                const value = card.data[field];
                return `
                  <td class="editable-cell" 
                      data-card-id="${card.id}" 
                      data-field="${field}"
                      title="Click to edit">
                    <span class="cell-value">${formatFieldValue(value)}</span>
                  </td>
                `;
              }).join('')}
              <td class="non-editable">${formatDate(card.created_at)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  
  // Add inline editing for cells
  container.querySelectorAll('.editable-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardId = cell.dataset.cardId;
      const card = cards.find(c => c.id === cardId);
      makeEditable(cell, cards, card);
    });
  });
  
  // Add action button handlers
  container.querySelectorAll('.table-action-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const cardId = btn.dataset.cardId;
      const card = cards.find(c => c.id === cardId);
      
      if (action === 'view' && card) {
        showCardDetail(card);
      } else if (action === 'delete') {
        if (confirm('Are you sure you want to delete this card?')) {
          try {
            const { cardsAPI } = await import('./utils.js');
            await cardsAPI.delete(cardId);
            await window.reloadCards();
          } catch (error) {
            const { showError } = await import('./utils.js');
            showError('Failed to delete card');
          }
        }
      }
    });
  });
}

// Make a table cell editable
async function makeEditable(cell, cards, card) {
  // Check if already editing
  if (cell.classList.contains('editing')) return;
  
  const cardId = cell.dataset.cardId;
  const fieldName = cell.dataset.field;
  
  if (!card) return;
  
  // Get the schema to determine field type
  const schema = window.appState.schemas.find(s => s.id === card.schema_id);
  if (!schema) return;
  
  // Find the field definition in the schema
  const fieldDef = schema.field_definitions?.fields?.find(f => f.name === fieldName);
  
  const currentValue = card.data[fieldName] || '';
  const valueSpan = cell.querySelector('.cell-value');
  
  // Mark as editing
  cell.classList.add('editing');
  
  let inputElement;
  
  // Create appropriate input based on field type
  if (fieldDef && fieldDef.type === 'select') {
    // Create dropdown for select fields
    inputElement = document.createElement('select');
    inputElement.className = 'table-cell-input';
    
    // Add options
    if (fieldDef.options && Array.isArray(fieldDef.options)) {
      fieldDef.options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.label;
        if (option.value === currentValue) {
          optionEl.selected = true;
        }
        inputElement.appendChild(optionEl);
      });
    }
  } else if (fieldDef && fieldDef.type === 'date') {
    // Create date input
    inputElement = document.createElement('input');
    inputElement.type = 'date';
    inputElement.value = currentValue;
    inputElement.className = 'table-cell-input';
  } else if (fieldDef && fieldDef.type === 'number') {
    // Create number input
    inputElement = document.createElement('input');
    inputElement.type = 'number';
    inputElement.value = currentValue;
    inputElement.className = 'table-cell-input';
    
    if (fieldDef.validation_rules) {
      if (fieldDef.validation_rules.min !== undefined) {
        inputElement.min = fieldDef.validation_rules.min;
      }
      if (fieldDef.validation_rules.max !== undefined) {
        inputElement.max = fieldDef.validation_rules.max;
      }
      if (fieldDef.validation_rules.step !== undefined) {
        inputElement.step = fieldDef.validation_rules.step;
      }
    }
  } else if (fieldDef && fieldDef.type === 'boolean') {
    // Create checkbox
    inputElement = document.createElement('input');
    inputElement.type = 'checkbox';
    inputElement.checked = currentValue === true || currentValue === 'true';
    inputElement.className = 'table-cell-checkbox';
    inputElement.style.width = 'auto';
    inputElement.style.height = '20px';
  } else {
    // Default to text input
    inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.value = formatFieldValue(currentValue);
    inputElement.className = 'table-cell-input';
  }
  
  // Replace value with input
  valueSpan.style.display = 'none';
  cell.appendChild(inputElement);
  inputElement.focus();
  
  if (inputElement.select) {
    inputElement.select();
  }
  
  // Save function
  const save = async () => {
    let newValue;
    
    if (fieldDef && fieldDef.type === 'boolean') {
      newValue = inputElement.checked;
    } else if (fieldDef && fieldDef.type === 'number') {
      newValue = inputElement.value ? parseFloat(inputElement.value) : null;
    } else {
      newValue = inputElement.value;
    }
    
    try {
      // Update card data
      const updatedData = { ...card.data, [fieldName]: newValue };
      
      // Call API to update
      const { cardsAPI } = await import('./utils.js');
      await cardsAPI.update(cardId, {
        data: updatedData,
        content: card.content
      });
      
      // Update UI
      valueSpan.textContent = formatFieldValue(newValue);
      valueSpan.style.display = '';
      inputElement.remove();
      cell.classList.remove('editing');
      
      // Reload to get fresh data
      await window.reloadCards();
      
    } catch (error) {
      const { showError } = await import('./utils.js');
      showError('Failed to update field');
      
      // Revert UI
      valueSpan.style.display = '';
      inputElement.remove();
      cell.classList.remove('editing');
    }
  };
  
  // Cancel function
  const cancel = () => {
    valueSpan.style.display = '';
    inputElement.remove();
    cell.classList.remove('editing');
  };
  
  // Event handlers
  if (fieldDef && fieldDef.type === 'select') {
    // For select, save on change
    inputElement.addEventListener('change', save);
    inputElement.addEventListener('blur', save);
  } else if (fieldDef && fieldDef.type === 'boolean') {
    // For checkbox, save on change
    inputElement.addEventListener('change', save);
  } else {
    // For text/number/date, save on blur or Enter
    inputElement.addEventListener('blur', save);
    inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        save();
      } else if (e.key === 'Escape') {
        cancel();
      }
    });
  }
}

function renderCarouselView(cards, container) {
  let currentIndex = 0;
  let detailsExpanded = false;
  
  async function renderCurrentCard() {
    const card = cards[currentIndex];
    const tags = card.tags || [];
    const data = card.data || {};
    const renderedContent = await renderMarkdown(card.content);
    
    container.innerHTML = `
      <div class="carousel-view">
        <button class="carousel-nav carousel-nav-prev" id="carouselPrev" ${currentIndex === 0 ? 'disabled' : ''}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        
        <div class="carousel-card">
          <div class="carousel-header">
            <div class="card-metadata">
              <span class="card-schema-badge">${card.schema_name}</span>
              <span class="card-date">${formatDate(card.created_at)}</span>
            </div>
            <div class="carousel-counter">${currentIndex + 1} / ${cards.length}</div>
          </div>
          
          <h2 class="carousel-title">${getCardTitle(card)}</h2>
          
          <div style="display: flex; gap: 8px; margin-bottom: 16px;">
            <button class="carousel-details-toggle" id="detailsToggle" style="flex: 1;">
              <span>${detailsExpanded ? '▲' : '▼'}</span> ${detailsExpanded ? 'Hide' : 'Show'} Details
            </button>
            <button class="text-btn secondary" id="editCardBtn" style="padding: 8px 16px;">Edit</button>
            <button class="text-btn secondary" id="deleteCardBtn" style="padding: 8px 16px;">Delete</button>
          </div>
          
          <div class="carousel-details ${detailsExpanded ? 'expanded' : ''}" id="carouselDetails">
            ${Object.entries(data).map(([key, value]) => {
              if (key === 'title' || key === 'name') return '';
              return `
                <div class="detail-row">
                  <span class="detail-label">${key.replace(/_/g, ' ')}:</span>
                  <span class="detail-value">${formatFieldValue(value)}</span>
                </div>
              `;
            }).join('')}
            
            ${tags.length > 0 ? `
              <div class="detail-row">
                <span class="detail-label">Tags:</span>
                <div class="card-tags" style="display: inline-flex; gap: 4px; flex-wrap: wrap;">
                  ${tags.map(tag => `
                    <span class="card-tag">
                      <span class="tag-color-dot" style="background: ${tag.color};"></span>
                      ${tag.name}
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
          
          <div class="carousel-content">
            ${renderedContent}
          </div>
        </div>
        
        <button class="carousel-nav carousel-nav-next" id="carouselNext" ${currentIndex === cards.length - 1 ? 'disabled' : ''}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    `;
    
    // Add event listeners
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    const detailsToggle = document.getElementById('detailsToggle');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
          currentIndex--;
          renderCurrentCard();
        }
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentIndex < cards.length - 1) {
          currentIndex++;
          renderCurrentCard();
        }
      });
    }
    
    if (detailsToggle) {
      detailsToggle.addEventListener('click', () => {
        detailsExpanded = !detailsExpanded;
        renderCurrentCard();
      });
    }
    
    // Edit button
    const editBtn = document.getElementById('editCardBtn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
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
    }
    
    // Delete button
    const deleteBtn = document.getElementById('deleteCardBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this card?')) {
          try {
            const { cardsAPI } = await import('./utils.js');
            await cardsAPI.delete(card.id);
            await window.reloadCards();
          } catch (error) {
            const { showError } = await import('./utils.js');
            showError('Failed to delete card');
          }
        }
      });
    }
    
    // Keyboard navigation
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        currentIndex--;
        renderCurrentCard();
      } else if (e.key === 'ArrowRight' && currentIndex < cards.length - 1) {
        currentIndex++;
        renderCurrentCard();
      }
    };
    
    // Remove old listener and add new one
    document.removeEventListener('keydown', handleKeyPress);
    document.addEventListener('keydown', handleKeyPress);
    
    // Initialize rendered content (for Mermaid, Chart.js, etc.)
    const carouselCard = container.querySelector('.carousel-card');
    if (carouselCard) {
      await initializeRenderedContent(carouselCard);
    }
  }
  
  renderCurrentCard();
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

export async function showCardDetail(card) {
  const tags = card.tags || [];
  const data = card.data || {};
  
  // Render markdown content
  const renderedContent = await renderMarkdown(card.content);
  
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
  
  // Initialize rendered content (for Mermaid, Chart.js, etc.)
  const cardDetailContent = modal.querySelector('.card-detail-content');
  if (cardDetailContent) {
    await initializeRenderedContent(cardDetailContent);
  }
  
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
