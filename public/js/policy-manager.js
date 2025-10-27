// Policy Manager Module
import { createModal, closeModal } from './utils.js';

let currentModal = null;

function showModal(content) {
  if (currentModal) {
    closeModal(currentModal);
  }
  currentModal = createModal(content, '', '');
  return currentModal;
}

function closeCurrentModal() {
  if (currentModal) {
    closeModal(currentModal);
    currentModal = null;
  }
}

export async function openPolicyManager() {
  const policies = await fetchPolicies();
  const schemas = await fetchSchemas();
  const views = await fetchViews();
  const tags = await fetchTags();
  
  const modalContent = `
    <div class="modal-header">
      <h2>Connection Policies</h2>
      <button class="close-btn" onclick="window.closeModal()">&times;</button>
    </div>
    <div class="modal-body" style="max-width: 900px;">
      <div class="policy-manager">
        <div class="policy-controls">
          <button id="createOutputPolicyBtn" class="btn primary">+ Output Policy</button>
          <button id="createInputPolicyBtn" class="btn">+ Input Policy</button>
        </div>
        
        <div class="policies-list">
          ${policies.length === 0 ? '<p class="empty-state">No connection policies yet. Create one to share your knowledge base.</p>' : ''}
          ${policies.map(policy => renderPolicyCard(policy)).join('')}
        </div>
      </div>
    </div>
  `;
  
  showModal(modalContent);
  
  // Attach event listeners
  document.getElementById('createOutputPolicyBtn')?.addEventListener('click', () => {
    openCreatePolicyModal('output', schemas, views, tags);
  });
  
  document.getElementById('createInputPolicyBtn')?.addEventListener('click', () => {
    openCreatePolicyModal('input', schemas, views, tags);
  });
  
  // Attach copy and delete listeners for each policy
  policies.forEach(policy => {
    document.getElementById(`editBtn-${policy.id}`)?.addEventListener('click', () => {
      openEditPolicyModal(policy, schemas, views, tags);
    });
    
    document.getElementById(`copyBtn-${policy.id}`)?.addEventListener('click', () => {
      copyConnectionString(policy.connection_string);
    });
    
    document.getElementById(`deleteBtn-${policy.id}`)?.addEventListener('click', () => {
      deletePolicy(policy.id);
    });
    
    document.getElementById(`regenerateBtn-${policy.id}`)?.addEventListener('click', () => {
      regeneratePolicy(policy.id);
    });
  });
}

function renderPolicyCard(policy) {
  const expiresText = policy.expires_at 
    ? `Expires: ${new Date(policy.expires_at).toLocaleDateString()}`
    : 'No expiration';
  
  const statusBadge = policy.is_active 
    ? '<span class="status-badge active">Active</span>'
    : '<span class="status-badge inactive">Inactive</span>';
  
  const typeIcon = policy.policy_type === 'output' ? '📤' : '📥';
  
  return `
    <div class="policy-card">
      <div class="policy-header">
        <div>
          <h3>${typeIcon} ${policy.name}</h3>
          <p class="policy-description">${policy.description || ''}</p>
        </div>
        ${statusBadge}
      </div>
      
      <div class="policy-details">
        <div class="detail-row">
          <span class="label">Type:</span>
          <span class="value">${policy.policy_type === 'output' ? 'Output (Share)' : 'Input (Receive)'}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">Connection String:</span>
          <div class="connection-string-container">
            <code class="connection-string">${policy.connection_string}</code>
            <button id="copyBtn-${policy.id}" class="btn-icon" title="Copy">📋</button>
          </div>
        </div>
        
        <div class="detail-row">
          <span class="label">Refresh:</span>
          <span class="value">${policy.refresh_schedule || 'manual'}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">${expiresText}</span>
        </div>
      </div>
      
      <div class="policy-actions">
        <button id="editBtn-${policy.id}" class="btn-small">✏️ Edit</button>
        <button id="regenerateBtn-${policy.id}" class="btn-small">🔄 Regenerate String</button>
        <button id="deleteBtn-${policy.id}" class="btn-small danger">Delete</button>
      </div>
    </div>
  `;
}

function openCreatePolicyModal(policyType, schemas, views, tags) {
  const modalContent = `
    <div class="modal-header">
      <h2>Create ${policyType === 'output' ? 'Output' : 'Input'} Policy</h2>
      <button class="close-btn" onclick="window.closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <form id="createPolicyForm" class="form">
        <div class="form-group">
          <label>Policy Name *</label>
          <input type="text" id="policyName" required placeholder="e.g., Urgent Tasks">
        </div>
        
        <div class="form-group">
          <label>Description</label>
          <textarea id="policyDescription" rows="2" placeholder="What this policy is for"></textarea>
        </div>
        
        <div class="form-group">
          <label>Username *</label>
          <input type="text" id="policyUsername" required placeholder="Your username" value="user">
        </div>
        
        ${policyType === 'output' ? `
          <div class="form-group">
            <label>Select Views to Share *</label>
            <div class="checkbox-group">
              ${views.map(view => `
                <label class="checkbox-label">
                  <input type="checkbox" name="view_ids" value="${view.id}">
                  ${view.name}
                </label>
              `).join('')}
            </div>
            ${views.length === 0 ? '<p class="help-text">No views available. Create a view first.</p>' : ''}
          </div>
        ` : `
          <div class="form-group">
            <label>Schema for Incoming Cards *</label>
            <select id="policySchema" required>
              <option value="">Select schema...</option>
              ${schemas.map(schema => `
                <option value="${schema.id}">${schema.name}</option>
              `).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label>Auto-apply Tags (optional)</label>
            <div class="checkbox-group">
              ${tags.map(tag => `
                <label class="checkbox-label">
                  <input type="checkbox" name="tag_ids" value="${tag.id}">
                  <span class="tag-badge" style="background-color: ${tag.color}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px;">${tag.name}</span>
                </label>
              `).join('')}
            </div>
            ${tags.length === 0 ? '<p class="help-text">No tags available. Create tags first.</p>' : '<p class="help-text">Cards sent via this policy will automatically get these tags</p>'}
          </div>
        `}
        
        <div class="form-group">
          <label>Duration (days)</label>
          <input type="number" id="policyDuration" min="1" placeholder="Leave empty for no expiration">
        </div>
        
        <div class="form-group">
          <label>Refresh Schedule</label>
          <select id="policyRefresh">
            <option value="manual">Manual</option>
            <option value="every_minute">Every Minute</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="btn primary">Create Policy</button>
        </div>
      </form>
    </div>
  `;
  
  showModal(modalContent);
  
  document.getElementById('createPolicyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await createPolicy(policyType);
  });
}

async function createPolicy(policyType) {
  const name = document.getElementById('policyName').value;
  const description = document.getElementById('policyDescription').value;
  const username = document.getElementById('policyUsername').value;
  const duration = document.getElementById('policyDuration').value;
  const refresh = document.getElementById('policyRefresh').value;
  
  const data = {
    name,
    description,
    username,
    policy_type: policyType,
    duration_days: duration ? parseInt(duration) : null,
    refresh_schedule: refresh,
  };
  
  if (policyType === 'output') {
    const checkboxes = document.querySelectorAll('input[name="view_ids"]:checked');
    data.view_ids = Array.from(checkboxes).map(cb => cb.value);
    
    if (data.view_ids.length === 0) {
      alert('Please select at least one view');
      return;
    }
  } else {
    const schemaId = document.getElementById('policySchema').value;
    if (!schemaId) {
      alert('Please select a schema');
      return;
    }
    data.schema_id = schemaId;
    
    const checkboxes = document.querySelectorAll('input[name="tag_ids"]:checked');
    data.tag_ids = Array.from(checkboxes).map(cb => cb.value);
  }
  
  try {
    const response = await fetch('/api/policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (response.ok) {
      alert('Policy created successfully!');
      closeCurrentModal();
      openPolicyManager(); // Refresh
    } else {
      const error = await response.json();
      alert(`Error: ${error.error}`);
    }
  } catch (err) {
    alert('Failed to create policy');
    console.error(err);
  }
}

function openEditPolicyModal(policy, schemas, views, tags) {
  const policyType = policy.policy_type;
  
  const modalContent = `
    <div class="modal-header">
      <h2>Edit ${policyType === 'output' ? 'Output' : 'Input'} Policy</h2>
      <button class="close-btn" onclick="window.closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <form id="editPolicyForm" class="form">
        <div class="form-group">
          <label>Policy Name *</label>
          <input type="text" id="policyName" required value="${policy.name}">
        </div>
        
        <div class="form-group">
          <label>Description</label>
          <textarea id="policyDescription" rows="2">${policy.description || ''}</textarea>
        </div>
        
        ${policyType === 'output' ? `
          <div class="form-group">
            <label>Select Views to Share *</label>
            <div class="checkbox-group">
              ${views.map(view => `
                <label class="checkbox-label">
                  <input type="checkbox" name="view_ids" value="${view.id}" 
                    ${policy.view_ids && policy.view_ids.includes(view.id) ? 'checked' : ''}>
                  ${view.name}
                </label>
              `).join('')}
            </div>
          </div>
        ` : `
          <div class="form-group">
            <label>Schema for Incoming Cards *</label>
            <select id="policySchema" required>
              ${schemas.map(schema => `
                <option value="${schema.id}" ${schema.id === policy.schema_id ? 'selected' : ''}>
                  ${schema.name}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label>Auto-apply Tags (optional)</label>
            <div class="checkbox-group">
              ${tags.map(tag => `
                <label class="checkbox-label">
                  <input type="checkbox" name="tag_ids" value="${tag.id}"
                    ${policy.tag_ids && policy.tag_ids.includes(tag.id) ? 'checked' : ''}>
                  <span class="tag-badge" style="background-color: ${tag.color}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px;">${tag.name}</span>
                </label>
              `).join('')}
            </div>
            ${tags.length === 0 ? '<p class="help-text">No tags available.</p>' : ''}
          </div>
        `}
        
        <div class="form-group">
          <label>Duration (days)</label>
          <input type="number" id="policyDuration" min="1" value="${policy.duration_days || ''}">
        </div>
        
        <div class="form-group">
          <label>Refresh Schedule</label>
          <select id="policyRefresh">
            <option value="manual" ${policy.refresh_schedule === 'manual' ? 'selected' : ''}>Manual</option>
            <option value="every_minute" ${policy.refresh_schedule === 'every_minute' ? 'selected' : ''}>Every Minute</option>
            <option value="hourly" ${policy.refresh_schedule === 'hourly' ? 'selected' : ''}>Hourly</option>
            <option value="daily" ${policy.refresh_schedule === 'daily' ? 'selected' : ''}>Daily</option>
            <option value="weekly" ${policy.refresh_schedule === 'weekly' ? 'selected' : ''}>Weekly</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="policyActive" ${policy.is_active ? 'checked' : ''}>
            Active
          </label>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="btn primary">Update Policy</button>
        </div>
      </form>
    </div>
  `;
  
  showModal(modalContent);
  
  document.getElementById('editPolicyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await updatePolicy(policy.id, policyType);
  });
}

async function updatePolicy(policyId, policyType) {
  const name = document.getElementById('policyName').value;
  const description = document.getElementById('policyDescription').value;
  const duration = document.getElementById('policyDuration').value;
  const refresh = document.getElementById('policyRefresh').value;
  const isActive = document.getElementById('policyActive').checked;
  
  const data = {
    name,
    description,
    duration_days: duration ? parseInt(duration) : null,
    refresh_schedule: refresh,
    is_active: isActive,
  };
  
  if (policyType === 'output') {
    const checkboxes = document.querySelectorAll('input[name="view_ids"]:checked');
    data.view_ids = Array.from(checkboxes).map(cb => cb.value);
    
    if (data.view_ids.length === 0) {
      alert('Please select at least one view');
      return;
    }
  } else {
    const schemaId = document.getElementById('policySchema').value;
    if (!schemaId) {
      alert('Please select a schema');
      return;
    }
    data.schema_id = schemaId;
    
    const checkboxes = document.querySelectorAll('input[name="tag_ids"]:checked');
    data.tag_ids = Array.from(checkboxes).map(cb => cb.value);
  }
  
  try {
    const response = await fetch(`/api/policies/${policyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (response.ok) {
      alert('Policy updated successfully!');
      closeCurrentModal();
      openPolicyManager(); // Refresh
    } else {
      const error = await response.json();
      alert(`Error: ${error.error}`);
    }
  } catch (err) {
    alert('Failed to update policy');
    console.error(err);
  }
}

async function deletePolicy(id) {
  if (!confirm('Are you sure you want to delete this policy? Clients using this connection will lose access.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/policies/${id}`, {
      method: 'DELETE',
    });
    
    if (response.ok) {
      openPolicyManager(); // Refresh
    }
  } catch (err) {
    alert('Failed to delete policy');
    console.error(err);
  }
}

async function regeneratePolicy(id) {
  const username = prompt('Enter your username to regenerate connection string:');
  if (!username) return;
  
  try {
    const response = await fetch(`/api/policies/${id}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    
    if (response.ok) {
      alert('Connection string regenerated! Old string is now invalid.');
      openPolicyManager(); // Refresh
    } else {
      alert('Failed to regenerate connection string');
    }
  } catch (err) {
    alert('Failed to regenerate connection string');
    console.error(err);
  }
}

function copyConnectionString(connectionString) {
  navigator.clipboard.writeText(connectionString).then(() => {
    alert('Connection string copied to clipboard!');
  }).catch(() => {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = connectionString;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('Connection string copied!');
  });
}

async function fetchPolicies() {
  try {
    const response = await fetch('/api/policies');
    return await response.json();
  } catch (err) {
    console.error('Failed to fetch policies:', err);
    return [];
  }
}

async function fetchSchemas() {
  try {
    const response = await fetch('/api/schemas');
    return await response.json();
  } catch (err) {
    console.error('Failed to fetch schemas:', err);
    return [];
  }
}

async function fetchViews() {
  try {
    const response = await fetch('/api/views');
    return await response.json();
  } catch (err) {
    console.error('Failed to fetch views:', err);
    return [];
  }
}

async function fetchTags() {
  try {
    const response = await fetch('/api/tags');
    return await response.json();
  } catch (err) {
    console.error('Failed to fetch tags:', err);
    return [];
  }
}
