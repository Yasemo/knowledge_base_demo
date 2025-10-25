import { tagsAPI, showError, showSuccess, createModal, closeModal, generateRandomColor } from './utils.js';

export function initTagManager() {
  console.log('Tag manager initialized');
}

export function renderTagFilters(tags, selectedTags, onFilterChange) {
  const container = document.getElementById('tagFilterList');
  
  if (!tags || tags.length === 0) {
    container.innerHTML = '<p style="font-size: 12px; color: var(--nyt-gray);">No tags yet</p>';
    return;
  }
  
  container.innerHTML = tags.map(tag => {
    const isActive = selectedTags.includes(tag.id);
    return `
      <div class="tag-filter-item ${isActive ? 'active' : ''}" data-tag-id="${tag.id}">
        <span class="tag-color-dot" style="background: ${tag.color};"></span>
        <span>${tag.name}</span>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  container.querySelectorAll('.tag-filter-item').forEach(item => {
    item.addEventListener('click', () => {
      const tagId = item.dataset.tagId;
      if (onFilterChange) {
        onFilterChange(tagId);
      }
    });
  });
}

export function openTagModal(tag = null, onSuccess) {
  const isEdit = !!tag;
  const title = isEdit ? 'Edit Tag' : 'Create New Tag';
  
  const content = `
    <form id="tagForm">
      <div class="form-group">
        <label class="form-label" for="tagName">Tag Name *</label>
        <input 
          type="text" 
          id="tagName" 
          class="form-input" 
          value="${tag ? tag.name : ''}"
          required
          placeholder="e.g., Frontend, Bug, Important"
        />
      </div>
      
      <div class="form-group">
        <label class="form-label" for="tagColor">Tag Color *</label>
        <div style="display: flex; gap: 12px; align-items: center;">
          <input 
            type="color" 
            id="tagColor" 
            value="${tag ? tag.color : generateRandomColor()}"
            style="width: 60px; height: 40px; border: 1px solid var(--nyt-border); cursor: pointer;"
          />
          <input 
            type="text" 
            id="tagColorText" 
            class="form-input" 
            value="${tag ? tag.color : generateRandomColor()}"
            placeholder="#000000"
            pattern="^#[0-9A-Fa-f]{6}$"
            style="flex: 1;"
          />
        </div>
        <span class="form-description">Choose a color to identify this tag</span>
      </div>
      
      <div class="form-group">
        <label class="form-label">Preview</label>
        <div id="tagPreview" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border: 1px solid var(--nyt-border); font-family: var(--font-sans); font-size: 12px;">
          <span class="tag-color-dot" style="background: ${tag ? tag.color : generateRandomColor()};"></span>
          <span id="previewName">${tag ? tag.name : 'Tag Name'}</span>
        </div>
      </div>
    </form>
  `;
  
  const footer = `
    <button type="button" class="text-btn secondary" id="cancelBtn">Cancel</button>
    <button type="button" class="text-btn primary" id="saveTagBtn">${isEdit ? 'Update' : 'Create'} Tag</button>
  `;
  
  const modal = createModal(content, title, footer);
  
  // Set up live preview
  const nameInput = document.getElementById('tagName');
  const colorInput = document.getElementById('tagColor');
  const colorTextInput = document.getElementById('tagColorText');
  const previewName = document.getElementById('previewName');
  const previewDot = document.querySelector('#tagPreview .tag-color-dot');
  
  nameInput.addEventListener('input', () => {
    previewName.textContent = nameInput.value || 'Tag Name';
  });
  
  colorInput.addEventListener('input', () => {
    colorTextInput.value = colorInput.value;
    previewDot.style.background = colorInput.value;
  });
  
  colorTextInput.addEventListener('input', () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(colorTextInput.value)) {
      colorInput.value = colorTextInput.value;
      previewDot.style.background = colorTextInput.value;
    }
  });
  
  // Set up event listeners
  document.getElementById('cancelBtn').addEventListener('click', () => {
    closeModal(modal);
  });
  
  document.getElementById('saveTagBtn').addEventListener('click', async () => {
    await saveTag(tag, modal, onSuccess);
  });
}

async function saveTag(existingTag, modal, onSuccess) {
  try {
    const name = document.getElementById('tagName').value.trim();
    const color = document.getElementById('tagColor').value;
    
    if (!name) {
      showError('Tag name is required');
      return;
    }
    
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      showError('Invalid color format. Use hex format like #ff0000');
      return;
    }
    
    const tagData = { name, color };
    
    if (existingTag) {
      await tagsAPI.update(existingTag.id, tagData);
      showSuccess('Tag updated successfully');
    } else {
      await tagsAPI.create(tagData);
      showSuccess('Tag created successfully');
    }
    
    closeModal(modal);
    if (onSuccess) onSuccess();
  } catch (error) {
    showError(error.message);
  }
}
