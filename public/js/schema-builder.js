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
    
    <div>
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
  `;
  
  fieldsList.appendChild(fieldDiv);
  
  // Remove button handler
  fieldDiv.querySelector('[data-action="remove"]').addEventListener('click', () => {
    fieldDiv.remove();
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
