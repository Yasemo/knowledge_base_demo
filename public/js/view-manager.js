import { viewsAPI, showError, showSuccess, createModal, closeModal, collectAllFields, showExportModal, matchesFieldFilter } from './utils.js';

export function initViewManager() {
  console.log('View manager initialized');
}

// Collect actual values from cards for each field
function collectFieldValuesFromCards(cards, availableFields) {
  const fieldValuesMap = new Map();
  
  availableFields.forEach(field => {
    fieldValuesMap.set(field.name, new Set());
  });
  
  if (cards && cards.length > 0) {
    cards.forEach(card => {
      availableFields.forEach(field => {
        const value = card.data?.[field.name];
        if (value !== undefined && value !== null && value !== '') {
          // Convert to string and add to set
          fieldValuesMap.get(field.name).add(String(value));
        }
      });
    });
  }
  
  // Convert sets to sorted arrays
  const result = {};
  fieldValuesMap.forEach((values, fieldName) => {
    result[fieldName] = Array.from(values).sort();
  });
  
  return result;
}

export function renderViews(views, schemas, tags, activeViewId, onViewClick, allCards) {
  const container = document.getElementById('viewsList');
  
  if (!container) return;
  
  // Always show "All Cards" as the default view
  const allCardsActive = !activeViewId;
  let html = `
    <div class="view-chip ${allCardsActive ? 'active' : ''}" data-view-id="all">
      <span>All Cards</span>
    </div>
  `;
  
  if (views && views.length > 0) {
    html += views.map(view => {
      const isActive = activeViewId === view.id;
      return `
        <div class="view-chip ${isActive ? 'active' : ''}" data-view-id="${view.id}">
          <span>${view.name}</span>
          <div class="view-chip-actions">
            <button class="view-chip-btn" data-action="export" data-view-id="${view.id}" title="Export CSV">⬇️</button>
            <button class="view-chip-btn" data-action="edit" data-view-id="${view.id}" title="Edit">✎</button>
            <button class="view-chip-btn" data-action="delete" data-view-id="${view.id}" title="Delete">✕</button>
          </div>
        </div>
      `;
    }).join('');
  }
  
  container.innerHTML = html;
  
  // Add event listeners for action buttons
  container.querySelectorAll('.view-chip-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const viewId = btn.dataset.viewId;
      
      if (action === 'export') {
        const view = views.find(v => v.id === viewId);
        if (view) {
          // Filter cards based on view criteria
          let filteredCards = allCards || [];
          
          // Apply schema filter
          if (view.schema_id) {
            filteredCards = filteredCards.filter(card => card.schema_id === view.schema_id);
          }
          
          // Apply tag filters (AND logic)
          if (view.tag_ids && view.tag_ids.length > 0) {
            filteredCards = filteredCards.filter(card => {
              const cardTagIds = card.tags ? card.tags.map(t => t.id) : [];
              return view.tag_ids.every(tagId => cardTagIds.includes(tagId));
            });
          }
          
          // Apply field filters
          if (view.field_filters && view.field_filters.length > 0) {
            filteredCards = filteredCards.filter(card => {
              return view.field_filters.every(filter => {
                const cardValue = card.data[filter.field_name];
                return matchesFieldFilter(cardValue, filter.operator, filter.value);
              });
            });
          }
          
          // Sanitize view name for filename
          const sanitizedName = view.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
          showExportModal(filteredCards, sanitizedName);
        }
      } else if (action === 'edit') {
        const view = views.find(v => v.id === viewId);
        openViewModal(view, schemas, tags, async () => {
          if (onViewClick) onViewClick(null); // Refresh views
        }, allCards);
      } else if (action === 'delete') {
        if (confirm('Are you sure you want to delete this view?')) {
          try {
            await viewsAPI.delete(viewId);
            showSuccess('View deleted successfully');
            if (onViewClick) onViewClick(null); // Refresh views
          } catch (error) {
            showError('Failed to delete view');
          }
        }
      }
    });
  });
  
  // Add event listeners for view chips
  container.querySelectorAll('.view-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      // Don't trigger if clicking action buttons
      if (e.target.closest('.view-chip-btn')) return;
      
      const viewId = chip.dataset.viewId;
      if (onViewClick) {
        onViewClick(viewId === 'all' ? null : viewId);
      }
    });
  });
}

export function openViewModal(view = null, schemas, tags, onSuccess, allCards = []) {
  const isEdit = !!view;
  const title = isEdit ? 'Edit View' : 'Create New View';
  
  // Collect all available fields from schemas
  const availableFields = collectAllFields(schemas);
  
  // Collect actual values from cards for each field
  const fieldValues = collectFieldValuesFromCards(allCards, availableFields);
  
  const content = `
    <form id="viewForm">
      <div class="form-group">
        <label class="form-label" for="viewName">View Name *</label>
        <input 
          type="text" 
          id="viewName" 
          class="form-input" 
          value="${view ? view.name : ''}"
          required
          placeholder="e.g., High Priority Tasks"
        />
      </div>
      
      <div class="form-group">
        <label class="form-label" for="viewDescription">Description</label>
        <textarea 
          id="viewDescription" 
          class="form-textarea" 
          placeholder="Optional description of what this view shows"
        >${view ? (view.description || '') : ''}</textarea>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="viewSchema">Filter by Schema (Optional)</label>
        <select id="viewSchema" class="form-select">
          <option value="">All Schemas</option>
          ${schemas.map(schema => `
            <option value="${schema.id}" ${view && view.schema_id === schema.id ? 'selected' : ''}>
              ${schema.name}
            </option>
          `).join('')}
        </select>
        <span class="form-description">Choose a schema to filter cards by type</span>
      </div>
      
      <div class="form-group">
        <label class="form-label">Filter by Tags (Optional)</label>
        <div id="viewTagsContainer" style="display: flex; flex-direction: column; gap: 8px;">
          ${tags.length === 0 ? '<p style="font-size: 12px; color: var(--nyt-gray);">No tags available</p>' : 
            tags.map(tag => {
              const isChecked = view && view.tag_ids && view.tag_ids.includes(tag.id);
              return `
                <label style="display: flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-size: 14px;">
                  <input type="checkbox" class="tag-checkbox" value="${tag.id}" ${isChecked ? 'checked' : ''}>
                  <span class="tag-color-dot" style="background: ${tag.color};"></span>
                  <span>${tag.name}</span>
                </label>
              `;
            }).join('')
          }
        </div>
        <span class="form-description">Cards must have ALL selected tags (AND logic)</span>
      </div>
      
      <div class="form-group">
        <label class="form-label">Field Filters (Optional)</label>
        <div id="fieldFiltersContainer">
          ${view && view.field_filters && view.field_filters.length > 0 ? 
            view.field_filters.map((filter, index) => renderFieldFilter(filter, index, availableFields, fieldValues)).join('') :
            renderFieldFilter(null, 0, availableFields, fieldValues)
          }
        </div>
        <button type="button" id="addFieldFilterBtn" class="text-btn small" style="margin-top: 8px;">+ Add Field Filter</button>
        <span class="form-description">Filter cards based on actual field values from your cards</span>
      </div>
      
      <div class="form-group">
        <label class="form-label">Preview</label>
        <p id="viewPreview" style="font-family: var(--font-sans); font-size: 14px; color: var(--nyt-gray); font-style: italic;">
          This view will show all cards
        </p>
      </div>
    </form>
  `;
  
  const footer = `
    <button type="button" class="text-btn secondary" id="cancelBtn">Cancel</button>
    <button type="button" class="text-btn primary" id="saveViewBtn">${isEdit ? 'Update' : 'Create'} View</button>
  `;
  
  const modal = createModal(content, title, footer);
  
  // Store field values for dynamic updates
  window._currentFieldValues = fieldValues;
  window._currentAvailableFields = availableFields;
  
  // Set up field filter management
  let filterIndex = view && view.field_filters ? view.field_filters.length : 1;
  
  document.getElementById('addFieldFilterBtn').addEventListener('click', () => {
    const container = document.getElementById('fieldFiltersContainer');
    container.insertAdjacentHTML('beforeend', renderFieldFilter(null, filterIndex++, availableFields, fieldValues));
    updatePreview();
  });
  
  // Delegate event for removing filters and field selection changes
  document.getElementById('fieldFiltersContainer').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-filter-btn')) {
      e.target.closest('.field-filter-row').remove();
      updatePreview();
    }
  });
  
  // Handle field selection change to update value dropdown
  document.getElementById('fieldFiltersContainer').addEventListener('change', (e) => {
    if (e.target.classList.contains('field-select')) {
      const row = e.target.closest('.field-filter-row');
      const selectedFieldName = e.target.value;
      const container = row.querySelector('.value-input-container');
      
      if (selectedFieldName && fieldValues[selectedFieldName]) {
        const values = fieldValues[selectedFieldName];
        
        // Create dropdown with actual values from cards
        if (values.length > 0) {
          container.innerHTML = `
            <select class="value-select form-select">
              <option value="">Select value...</option>
              ${values.map(val => `<option value="${val}">${val}</option>`).join('')}
            </select>
          `;
        } else {
          container.innerHTML = `
            <input type="text" class="value-input form-input" placeholder="No values found" />
          `;
        }
      } else {
        container.innerHTML = `
          <input type="text" class="value-input form-input" placeholder="Value" />
        `;
      }
      updatePreview();
    } else {
      updatePreview();
    }
  });
  
  // Update preview dynamically
  function updatePreview() {
    const schemaSelect = document.getElementById('viewSchema');
    const selectedSchema = schemaSelect.options[schemaSelect.selectedIndex].text;
    const checkedTags = Array.from(document.querySelectorAll('.tag-checkbox:checked'))
      .map(cb => tags.find(t => t.id === cb.value)?.name)
      .filter(Boolean);
    
    const fieldFilters = Array.from(document.querySelectorAll('.field-filter-row'))
      .map(row => {
        const field = row.querySelector('.field-select')?.value;
        const fieldLabel = row.querySelector('.field-select option:checked')?.textContent?.split('(')[0]?.trim();
        const operator = row.querySelector('.operator-select')?.value;
        const operatorLabel = row.querySelector('.operator-select option:checked')?.textContent;
        const value = row.querySelector('.value-input')?.value || row.querySelector('.value-select')?.value;
        return field && value ? `${fieldLabel} ${operatorLabel} "${value}"` : null;
      })
      .filter(Boolean);
    
    let preview = 'This view will show ';
    
    if (schemaSelect.value) {
      preview += `${selectedSchema} cards`;
    } else {
      preview += 'all cards';
    }
    
    if (checkedTags.length > 0) {
      preview += ` with tag${checkedTags.length > 1 ? 's' : ''}: ${checkedTags.join(', ')}`;
    }
    
    if (fieldFilters.length > 0) {
      preview += ` where ${fieldFilters.join(' AND ')}`;
    }
    
    document.getElementById('viewPreview').textContent = preview;
  }
  
  // Set up live preview
  document.getElementById('viewSchema').addEventListener('change', updatePreview);
  document.querySelectorAll('.tag-checkbox').forEach(cb => {
    cb.addEventListener('change', updatePreview);
  });
  
  // Initial preview update
  updatePreview();
  
  // Set up event listeners
  document.getElementById('cancelBtn').addEventListener('click', () => {
    closeModal(modal);
  });
  
  document.getElementById('saveViewBtn').addEventListener('click', async () => {
    await saveView(view, modal, onSuccess);
  });
}

function renderFieldFilter(filter, index, availableFields, fieldValues) {
  const operators = [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ];
  
  const selectedField = filter ? availableFields.find(f => f.name === filter.field_name) : null;
  const selectedFieldValues = selectedField ? (fieldValues[selectedField.name] || []) : [];
  
  // Generate value input based on whether we have actual values from cards
  let valueInput = '';
  if (selectedField && selectedFieldValues.length > 0) {
    // Use actual values from cards
    valueInput = `
      <select class="value-select form-select">
        <option value="">Select value...</option>
        ${selectedFieldValues.map(val => `
          <option value="${val}" ${filter && filter.value === val ? 'selected' : ''}>
            ${val}
          </option>
        `).join('')}
      </select>
    `;
  } else {
    valueInput = `
      <input type="text" class="value-input form-input" placeholder="Value" 
             value="${filter ? filter.value : ''}" />
    `;
  }
  
  return `
    <div class="field-filter-row" style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
      <select class="field-select form-select" style="flex: 1;">
        <option value="">Select field...</option>
        ${availableFields.map(field => {
          const valueCount = fieldValues[field.name]?.length || 0;
          return `
            <option value="${field.name}" 
                    ${filter && filter.field_name === field.name ? 'selected' : ''}>
              ${field.label} (${valueCount} values)
            </option>
          `;
        }).join('')}
      </select>
      
      <select class="operator-select form-select" style="flex: 0 0 150px;">
        ${operators.map(op => `
          <option value="${op.value}" ${filter && filter.operator === op.value ? 'selected' : ''}>
            ${op.label}
          </option>
        `).join('')}
      </select>
      
      <div class="value-input-container" style="flex: 1;">
        ${valueInput}
      </div>
      
      <button type="button" class="remove-filter-btn text-btn small secondary">✕</button>
    </div>
  `;
}

async function saveView(existingView, modal, onSuccess) {
  try {
    const name = document.getElementById('viewName').value.trim();
    const description = document.getElementById('viewDescription').value.trim();
    const schema_id = document.getElementById('viewSchema').value || null;
    const tag_ids = Array.from(document.querySelectorAll('.tag-checkbox:checked'))
      .map(cb => cb.value);
    
    // Collect field filters
    const field_filters = Array.from(document.querySelectorAll('.field-filter-row'))
      .map(row => {
        const field_name = row.querySelector('.field-select')?.value;
        const operator = row.querySelector('.operator-select')?.value;
        const value = row.querySelector('.value-input')?.value || row.querySelector('.value-select')?.value;
        
        if (field_name && operator && (value || operator === 'is_empty' || operator === 'is_not_empty')) {
          return { field_name, operator, value: value || '' };
        }
        return null;
      })
      .filter(Boolean);
    
    if (!name) {
      showError('View name is required');
      return;
    }
    
    const viewData = {
      name,
      description: description || null,
      schema_id,
      tag_ids: tag_ids.length > 0 ? tag_ids : [],
      field_filters: field_filters.length > 0 ? field_filters : [],
    };
    
    if (existingView) {
      await viewsAPI.update(existingView.id, viewData);
      showSuccess('View updated successfully');
    } else {
      await viewsAPI.create(viewData);
      showSuccess('View created successfully');
    }
    
    closeModal(modal);
    if (onSuccess) onSuccess();
  } catch (error) {
    showError(error.message);
  }
}
