import { schemasAPI, showError, showSuccess, createModal, closeModal, FIELD_TYPES } from './utils.js';

let currentModal = null;
let fieldCounter = 0;

export function initSchemaBuilder() {
  console.log('Schema builder initialized');
}

export function openSchemaModal(schema = null, onSuccess) {
  const isEdit = !!schema;
  const title = isEdit ? 'Edit Schema' : 'Create New Schema';
  
  const content = `
    <form id="schemaForm">
      <div class="form-group">
        <label class="form-label" for="schemaName">Schema Name *</label>
        <input 
          type="text" 
          id="schemaName" 
          class="form-input" 
          value="${schema ? schema.name : ''}"
          required
        />
      </div>
      
      <div class="form-group">
        <label class="form-label" for="schemaDescription">Description</label>
        <textarea 
          id="schemaDescription" 
          class="form-textarea"
        >${schema ? schema.description || '' : ''}</textarea>
      </div>
      
      <div class="form-group">
        <label class="form-label">Fields</label>
        <div id="fieldsList" class="field-list"></div>
        <button type="button" id="addFieldBtn" class="text-btn small">+ Add Field</button>
      </div>
    </form>
  `;
  
  const footer = `
    <button type="button" class="text-btn secondary" id="cancelBtn">Cancel</button>
    <button type="button" class="text-btn primary" id="saveSchemaBtn">${isEdit ? 'Update' : 'Create'} Schema</button>
  `;
  
  currentModal = createModal(content, title, footer);
  
  // Initialize fields
  if (schema && schema.field_definitions && schema.field_definitions.fields) {
    schema.field_definitions.fields.forEach(field => {
      addFieldToList(field);
    });
  }
  
  // Set up event listeners
  document.getElementById('addFieldBtn').addEventListener('click', () => {
    addFieldToList();
  });
  
  document.getElementById('cancelBtn').addEventListener('click', () => {
    closeModal(currentModal);
  });
  
  document.getElementById('saveSchemaBtn').addEventListener('click', async () => {
    await saveSchema(schema, onSuccess);
  });
}

function addFieldToList(fieldData = null) {
  const fieldId = fieldCounter++;
  const fieldsList = document.getElementById('fieldsList');
  
  const fieldDiv = document.createElement('div');
  fieldDiv.className = 'field-item';
  fieldDiv.dataset.fieldId = fieldId;
  
  const currentType = fieldData ? fieldData.type : 'text';
  const needsOptions = currentType === 'select' || currentType === 'multi_select';
  
  fieldDiv.innerHTML = `
    <div class="field-item-header">
      <input 
        type="text" 
        class="form-input" 
        placeholder="Field name (e.g., title)" 
        value="${fieldData ? fieldData.name : ''}"
        data-field="name"
        style="margin-bottom: 8px;"
      />
      <button type="button" class="text-btn small secondary" data-action="remove">Remove</button>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
      <div>
        <label class="form-label" style="font-size: 11px;">Field Type</label>
        <select class="form-select" data-field="type" style="font-size: 14px; padding: 6px;">
          ${FIELD_TYPES.map(type => `
            <option value="${type.value}" ${fieldData && fieldData.type === type.value ? 'selected' : ''}>
              ${type.label}
            </option>
          `).join('')}
        </select>
      </div>
      <div>
        <label class="form-label" style="font-size: 11px;">Label</label>
        <input 
          type="text" 
          class="form-input" 
          value="${fieldData ? fieldData.label : ''}"
          data-field="label"
          style="font-size: 14px; padding: 6px;"
        />
      </div>
    </div>
    
    <div style="margin-bottom: 8px;">
      <label class="form-label" style="font-size: 11px;">Description</label>
      <input 
        type="text" 
        class="form-input" 
        value="${fieldData ? fieldData.description || '' : ''}"
        data-field="description"
        style="font-size: 14px; padding: 6px;"
      />
    </div>
    
    <div style="margin-bottom: 8px;">
      <label style="font-size: 12px;">
        <input 
          type="checkbox" 
          class="form-checkbox" 
          data-field="required"
          ${fieldData && fieldData.required ? 'checked' : ''}
        />
        Required field
      </label>
    </div>
    
    <div class="field-options-container" style="display: ${needsOptions ? 'block' : 'none'}; background: #f9f9f9; padding: 12px; border: 1px solid var(--nyt-border); margin-top: 8px;">
      <label class="form-label" style="font-size: 11px; margin-bottom: 8px;">Options</label>
      <div class="options-list" data-field="options"></div>
      <button type="button" class="text-btn small" data-action="add-option" style="margin-top: 8px;">+ Add Option</button>
    </div>
  `;
  
  fieldsList.appendChild(fieldDiv);
  
  // Load existing options if editing
  if (fieldData && fieldData.options && Array.isArray(fieldData.options)) {
    const optionsList = fieldDiv.querySelector('.options-list');
    fieldData.options.forEach(option => {
      addOptionToField(optionsList, option);
    });
  }
  
  // Type change handler - show/hide options
  const typeSelect = fieldDiv.querySelector('[data-field="type"]');
  typeSelect.addEventListener('change', () => {
    const selectedType = typeSelect.value;
    const optionsContainer = fieldDiv.querySelector('.field-options-container');
    const needsOptions = selectedType === 'select' || selectedType === 'multi_select';
    optionsContainer.style.display = needsOptions ? 'block' : 'none';
  });
  
  // Remove button handler
  fieldDiv.querySelector('[data-action="remove"]').addEventListener('click', () => {
    fieldDiv.remove();
  });
  
  // Add option button handler
  fieldDiv.querySelector('[data-action="add-option"]').addEventListener('click', () => {
    const optionsList = fieldDiv.querySelector('.options-list');
    addOptionToField(optionsList);
  });
}

function addOptionToField(optionsList, optionData = null) {
  const optionDiv = document.createElement('div');
  optionDiv.className = 'option-item';
  optionDiv.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr 80px 60px; gap: 6px; margin-bottom: 6px; align-items: center;';
  
  optionDiv.innerHTML = `
    <input 
      type="text" 
      class="form-input" 
      placeholder="Value (e.g., high)"
      value="${optionData ? optionData.value : ''}"
      data-option="value"
      style="font-size: 13px; padding: 6px;"
    />
    <input 
      type="text" 
      class="form-input" 
      placeholder="Label (e.g., High)"
      value="${optionData ? optionData.label : ''}"
      data-option="label"
      style="font-size: 13px; padding: 6px;"
    />
    <input 
      type="color" 
      class="form-input" 
      value="${optionData ? optionData.color : '#2196f3'}"
      data-option="color"
      style="font-size: 13px; padding: 2px; height: 32px;"
    />
    <button type="button" class="text-btn small secondary" data-action="remove-option" style="padding: 4px 8px;">×</button>
  `;
  
  optionsList.appendChild(optionDiv);
  
  // Remove option handler
  optionDiv.querySelector('[data-action="remove-option"]').addEventListener('click', () => {
    optionDiv.remove();
  });
}

async function saveSchema(existingSchema, onSuccess) {
  try {
    const name = document.getElementById('schemaName').value.trim();
    const description = document.getElementById('schemaDescription').value.trim();
    
    if (!name) {
      showError('Schema name is required');
      return;
    }
    
    // Collect fields
    const fields = [];
    const fieldItems = document.querySelectorAll('.field-item');
    
    if (fieldItems.length === 0) {
      showError('Please add at least one field');
      return;
    }
    
    fieldItems.forEach((item, index) => {
      const field = {
        name: item.querySelector('[data-field="name"]').value.trim(),
        type: item.querySelector('[data-field="type"]').value,
        label: item.querySelector('[data-field="label"]').value.trim(),
        description: item.querySelector('[data-field="description"]').value.trim(),
        required: item.querySelector('[data-field="required"]').checked,
        display_order: index + 1,
      };
      
      if (!field.name) {
        throw new Error('All fields must have a name');
      }
      
      // Add special property for markdown fields
      if (field.type === 'markdown') {
        field.is_primary_content = true;
      }
      
      // Collect options for select and multi_select fields
      if (field.type === 'select' || field.type === 'multi_select') {
        const optionItems = item.querySelectorAll('.option-item');
        const options = [];
        
        optionItems.forEach(optionItem => {
          const value = optionItem.querySelector('[data-option="value"]').value.trim();
          const label = optionItem.querySelector('[data-option="label"]').value.trim();
          const color = optionItem.querySelector('[data-option="color"]').value;
          
          if (value && label) {
            options.push({ value, label, color });
          }
        });
        
        if (options.length === 0) {
          throw new Error(`Field "${field.name}" is a ${field.type} type and requires at least one option`);
        }
        
        field.options = options;
      }
      
      fields.push(field);
    });
    
    const schemaData = {
      name,
      description: description || null,
      field_definitions: { fields },
    };
    
    if (existingSchema) {
      await schemasAPI.update(existingSchema.id, schemaData);
      showSuccess('Schema updated successfully');
    } else {
      await schemasAPI.create(schemaData);
      showSuccess('Schema created successfully');
    }
    
    closeModal(currentModal);
    if (onSuccess) onSuccess();
  } catch (error) {
    showError(error.message);
  }
}
