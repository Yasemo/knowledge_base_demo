import { cardsAPI, schemasAPI, showError, showSuccess, createModal, closeModal } from './utils.js';

let currentModal = null;

export function initCardCreator() {
  console.log('Card creator initialized');
}

export function openCardCreatorModal(schemas, tags, card = null, onSuccess) {
  const isEdit = !!card;
  const title = isEdit ? 'Edit Content Card' : 'Create New Content Card';
  
  const content = `
    <form id="cardForm">
      <div class="form-group">
        <label class="form-label" for="cardSchema">Schema *</label>
        <select id="cardSchema" class="form-select" ${isEdit ? 'disabled' : ''}>
          <option value="">Select a schema...</option>
          ${schemas.map(schema => `
            <option value="${schema.id}" ${isEdit && card.schema_id === schema.id ? 'selected' : ''}>
              ${schema.name}
            </option>
          `).join('')}
        </select>
      </div>
      
      <div id="dynamicFields"></div>
      
      <div class="form-group">
        <label class="form-label">Tags</label>
        <div id="tagSelection" style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${tags.map(tag => `
            <label style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border: 1px solid var(--nyt-border); cursor: pointer; font-family: var(--font-sans); font-size: 12px;">
              <input 
                type="checkbox" 
                name="tags" 
                value="${tag.id}"
                ${isEdit && card.tags && card.tags.some(t => t.id === tag.id) ? 'checked' : ''}
              />
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${tag.color};"></span>
              ${tag.name}
            </label>
          `).join('')}
        </div>
      </div>
    </form>
  `;
  
  const footer = `
    <button type="button" class="text-btn secondary" id="cancelBtn">Cancel</button>
    <button type="button" class="text-btn primary" id="saveCardBtn">${isEdit ? 'Update' : 'Create'} Card</button>
  `;
  
  currentModal = createModal(content, title, footer);
  
  // Set up schema change handler
  const schemaSelect = document.getElementById('cardSchema');
  schemaSelect.addEventListener('change', () => {
    const schemaId = schemaSelect.value;
    if (schemaId) {
      const schema = schemas.find(s => s.id === schemaId);
      renderDynamicFields(schema, card);
    }
  });
  
  // If editing, load the schema fields
  if (isEdit) {
    const schema = schemas.find(s => s.id === card.schema_id);
    renderDynamicFields(schema, card);
  }
  
  // Set up event listeners
  document.getElementById('cancelBtn').addEventListener('click', () => {
    closeModal(currentModal);
  });
  
  document.getElementById('saveCardBtn').addEventListener('click', async () => {
    await saveCard(schemas, card, onSuccess);
  });
}

function renderDynamicFields(schema, existingCard = null) {
  const container = document.getElementById('dynamicFields');
  container.innerHTML = '';
  
  if (!schema || !schema.field_definitions || !schema.field_definitions.fields) {
    return;
  }
  
  const fields = schema.field_definitions.fields;
  const cardData = existingCard ? existingCard.data : {};
  const cardContent = existingCard ? existingCard.content : '';
  
  fields.forEach(field => {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    let inputHTML = '';
    const value = cardData[field.name] || '';
    
    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
        inputHTML = `
          <input 
            type="${field.type}" 
            id="field_${field.name}" 
            class="form-input" 
            value="${value}"
            ${field.required ? 'required' : ''}
          />
        `;
        break;
      
      case 'textarea':
        inputHTML = `
          <textarea 
            id="field_${field.name}" 
            class="form-textarea"
            ${field.required ? 'required' : ''}
          >${value}</textarea>
        `;
        break;
      
      case 'markdown':
        // Markdown field uses the content column
        const markdownValue = field.is_primary_content ? cardContent : value;
        inputHTML = `
          <textarea 
            id="field_${field.name}" 
            class="form-textarea large"
            ${field.required ? 'required' : ''}
          >${markdownValue}</textarea>
          <span class="form-description">Use Markdown syntax for formatting</span>
        `;
        break;
      
      case 'number':
        inputHTML = `
          <input 
            type="number" 
            id="field_${field.name}" 
            class="form-input" 
            value="${value}"
            ${field.required ? 'required' : ''}
          />
        `;
        break;
      
      case 'date':
        inputHTML = `
          <input 
            type="date" 
            id="field_${field.name}" 
            class="form-input" 
            value="${value}"
            ${field.required ? 'required' : ''}
          />
        `;
        break;
      
      case 'datetime':
        inputHTML = `
          <input 
            type="datetime-local" 
            id="field_${field.name}" 
            class="form-input" 
            value="${value}"
            ${field.required ? 'required' : ''}
          />
        `;
        break;
      
      case 'select':
        inputHTML = `
          <select 
            id="field_${field.name}" 
            class="form-select"
            ${field.required ? 'required' : ''}
          >
            <option value="">Select...</option>
            ${field.options ? field.options.map(opt => `
              <option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>
                ${opt.label}
              </option>
            `).join('') : ''}
          </select>
        `;
        break;
      
      case 'boolean':
        inputHTML = `
          <label style="font-size: 14px;">
            <input 
              type="checkbox" 
              id="field_${field.name}" 
              class="form-checkbox"
              ${value === true ? 'checked' : ''}
            />
            ${field.label}
          </label>
        `;
        break;
      
      default:
        inputHTML = `
          <input 
            type="text" 
            id="field_${field.name}" 
            class="form-input" 
            value="${value}"
          />
        `;
    }
    
    if (field.type !== 'boolean') {
      formGroup.innerHTML = `
        <label class="form-label" for="field_${field.name}">
          ${field.label}${field.required ? ' *' : ''}
        </label>
        ${field.description ? `<span class="form-description">${field.description}</span>` : ''}
        ${inputHTML}
      `;
    } else {
      formGroup.innerHTML = inputHTML;
    }
    
    container.appendChild(formGroup);
  });
}

async function saveCard(schemas, existingCard, onSuccess) {
  try {
    const schemaId = document.getElementById('cardSchema').value;
    
    if (!schemaId) {
      showError('Please select a schema');
      return;
    }
    
    const schema = schemas.find(s => s.id === schemaId);
    const fields = schema.field_definitions.fields;
    
    // Collect field values
    const data = {};
    let content = '';
    
    for (const field of fields) {
      const element = document.getElementById(`field_${field.name}`);
      
      if (!element) continue;
      
      let value;
      
      if (field.type === 'boolean') {
        value = element.checked;
      } else if (field.type === 'markdown' && field.is_primary_content) {
        // Primary markdown content goes to the content column
        content = element.value.trim();
        continue; // Don't add to data object
      } else {
        value = element.value.trim();
      }
      
      // Validate required fields
      if (field.required && !value && value !== false) {
        showError(`${field.label} is required`);
        return;
      }
      
      if (value || value === false) {
        data[field.name] = value;
      }
    }
    
    // Ensure we have content
    if (!content) {
      showError('Content is required');
      return;
    }
    
    // Collect selected tags
    const tagCheckboxes = document.querySelectorAll('input[name="tags"]:checked');
    const tag_ids = Array.from(tagCheckboxes).map(cb => cb.value);
    
    const cardData = {
      schema_id: schemaId,
      schema_name: schema.name,
      data,
      content,
      tag_ids,
    };
    
    if (existingCard) {
      await cardsAPI.update(existingCard.id, cardData);
      showSuccess('Card updated successfully');
    } else {
      await cardsAPI.create(cardData);
      showSuccess('Card created successfully');
    }
    
    closeModal(currentModal);
    if (onSuccess) onSuccess();
  } catch (error) {
    // Check for duplicate title error
    if (error.message.includes('duplicate key') || error.message.includes('idx_content_cards_title_lower')) {
      const titleValue = data.title || 'this title';
      showError(`A card with the title "${titleValue}" already exists. Please use a different title.`);
    } else {
      showError(error.message);
    }
  }
}
