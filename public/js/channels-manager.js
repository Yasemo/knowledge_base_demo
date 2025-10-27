// Channels Manager Module
import { createModal, closeModal } from './utils.js';

let currentModal = null;
let activeChannelWs = null;
let activeChannelId = null;

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

export async function openChannelsManager() {
  const channels = await fetchChannels();
  
  const modalContent = `
    <div class="modal-header">
      <h2>💬 Channels</h2>
      <button class="close-btn" onclick="window.closeModal()">&times;</button>
    </div>
    <div class="modal-body" style="max-width: 1000px;">
      <div class="channels-manager">
        <div class="channel-controls">
          <button id="createChannelBtn" class="btn primary">+ Create Channel</button>
        </div>
        
        <div class="channels-list">
          ${channels.length === 0 ? '<p class="empty-state">No channels yet. Create one to start chatting with clients.</p>' : ''}
          ${channels.map(channel => renderChannelCard(channel)).join('')}
        </div>
      </div>
    </div>
  `;
  
  showModal(modalContent);
  
  document.getElementById('createChannelBtn')?.addEventListener('click', () => {
    openCreateChannelModal();
  });
  
  channels.forEach(channel => {
    document.getElementById(`openChat-${channel.id}`)?.addEventListener('click', () => {
      openChannelChat(channel);
    });
    
    document.getElementById(`copyBtn-${channel.id}`)?.addEventListener('click', () => {
      copyConnectionString(channel.connection_string);
    });
    
    document.getElementById(`deleteBtn-${channel.id}`)?.addEventListener('click', () => {
      deleteChannel(channel.id);
    });
  });
}

function renderChannelCard(channel) {
  const statusBadge = channel.is_active 
    ? '<span class="status-badge active">Active</span>'
    : '<span class="status-badge inactive">Inactive</span>';
  
  return `
    <div class="channel-card">
      <div class="channel-header">
        <div>
          <h3>💬 ${channel.name}</h3>
          <p class="channel-description">${channel.description || ''}</p>
        </div>
        ${statusBadge}
      </div>
      
      <div class="channel-details">
        <div class="detail-row">
          <span class="label">Connection String:</span>
          <div class="connection-string-container">
            <code class="connection-string">${channel.connection_string}</code>
            <button id="copyBtn-${channel.id}" class="btn-icon" title="Copy">📋</button>
          </div>
        </div>
        
        <div class="detail-row">
          <span class="label">Created:</span>
          <span class="value">${new Date(channel.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      
      <div class="channel-actions">
        <button id="openChat-${channel.id}" class="btn primary">Open Chat</button>
        <button id="deleteBtn-${channel.id}" class="btn-small danger">Delete</button>
      </div>
    </div>
  `;
}

function openCreateChannelModal() {
  const modalContent = `
    <div class="modal-header">
      <h2>Create Channel</h2>
      <button class="close-btn" onclick="window.closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <form id="createChannelForm" class="form">
        <div class="form-group">
          <label>Channel Name *</label>
          <input type="text" id="channelName" required placeholder="e.g., Team Chat">
        </div>
        
        <div class="form-group">
          <label>Description</label>
          <textarea id="channelDescription" rows="2" placeholder="What this channel is for"></textarea>
        </div>
        
        <div class="form-group">
          <label>Username *</label>
          <input type="text" id="channelUsername" required placeholder="Your username" value="admin">
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="btn primary">Create Channel</button>
        </div>
      </form>
    </div>
  `;
  
  showModal(modalContent);
  
  document.getElementById('createChannelForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await createChannel();
  });
}

async function createChannel() {
  const name = document.getElementById('channelName').value;
  const description = document.getElementById('channelDescription').value;
  const username = document.getElementById('channelUsername').value;
  
  try {
    const response = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, username }),
    });
    
    if (response.ok) {
      alert('Channel created successfully!');
      closeCurrentModal();
      openChannelsManager();
    } else {
      const error = await response.json();
      alert(`Error: ${error.error}`);
    }
  } catch (err) {
    alert('Failed to create channel');
    console.error(err);
  }
}

function openChannelChat(channel) {
  const modalContent = `
    <div class="modal-header">
      <h2>💬 ${channel.channel_name}</h2>
      <button class="close-btn" onclick="window.closeChannelChat()">&times;</button>
    </div>
    <div class="modal-body" style="max-width: 800px; height: 600px; display: flex; flex-direction: column;">
      <div class="chat-container">
        <div class="chat-controls" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f0f0f0; border: 1px solid #e2e2e2; margin-bottom: 12px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-family: Arial; font-size: 14px; font-weight: 600;">
            <input type="checkbox" id="aiModeToggle" style="width: 18px; height: 18px; cursor: pointer;">
            <span>🤖 AI Mode</span>
          </label>
          <span id="aiModeStatus" style="font-family: Arial; font-size: 12px; color: #666;">OFF - Messages go to chat</span>
        </div>
        <div id="chatMessages" class="chat-messages"></div>
        <div class="chat-input-container">
          <textarea id="chatInput" placeholder="Type a message..." rows="3"></textarea>
          <button id="sendMessageBtn" class="btn primary">Send</button>
        </div>
      </div>
    </div>
  `;
  
  showModal(modalContent);
  activeChannelId = channel.id;
  
  // Connect WebSocket
  connectToChannel(channel.connection_string);
  
  // AI Mode toggle handler
  const aiModeToggle = document.getElementById('aiModeToggle');
  const aiModeStatus = document.getElementById('aiModeStatus');
  const chatInput = document.getElementById('chatInput');
  
  aiModeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      aiModeStatus.textContent = 'ON - Ask AI directly';
      aiModeStatus.style.color = '#6f42c1';
      chatInput.placeholder = 'Ask the AI anything...';
    } else {
      aiModeStatus.textContent = 'OFF - Messages go to chat';
      aiModeStatus.style.color = '#666';
      chatInput.placeholder = 'Type a message...';
    }
  });
  
  // Send message handler
  document.getElementById('sendMessageBtn').addEventListener('click', () => {
    sendMessage();
  });
  
  document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      sendMessage();
    }
  });
  
  // Store close function globally
  window.closeChannelChat = () => {
    if (activeChannelWs) {
      activeChannelWs.close();
      activeChannelWs = null;
    }
    activeChannelId = null;
    closeCurrentModal();
  };
}

function connectToChannel(connectionString) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/channels/${connectionString}`;
  
  console.log('Connecting to WebSocket:', wsUrl);
  activeChannelWs = new WebSocket(wsUrl);
  
  activeChannelWs.onopen = () => {
    console.log('✅ WebSocket connected');
    addSystemMessage('Connected to channel');
  };
  
  activeChannelWs.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'connected') {
      console.log('Connected to channel:', data.channelName);
    } else if (data.type === 'history') {
      displayHistory(data.messages);
    } else if (data.type === 'message') {
      displayMessage(data.message);
    } else if (data.type === 'error') {
      addSystemMessage('Error: ' + data.message, true);
    }
  };
  
  activeChannelWs.onerror = (error) => {
    console.error('WebSocket error:', error);
    addSystemMessage('Connection error', true);
  };
  
  activeChannelWs.onclose = () => {
    console.log('WebSocket disconnected');
    addSystemMessage('Disconnected from channel');
  };
}

function displayHistory(messages) {
  const messagesContainer = document.getElementById('chatMessages');
  messagesContainer.innerHTML = '';
  messages.forEach(msg => displayMessage(msg));
}

function displayMessage(message) {
  const messagesContainer = document.getElementById('chatMessages');
  
  const icon = {
    kb: '👤',
    client: '👥',
    assistant: '🤖'
  }[message.sender_type] || '💬';
  
  const senderClass = `message-${message.sender_type}`;
  const timestamp = new Date(message.created_at).toLocaleTimeString();
  
  const messageEl = document.createElement('div');
  messageEl.className = `chat-message ${senderClass}`;
  messageEl.innerHTML = `
    <div class="message-header">
      <span class="message-icon">${icon}</span>
      <span class="message-sender">${message.sender_identifier}</span>
      <span class="message-time">${timestamp}</span>
    </div>
    <div class="message-content">${escapeHtml(message.message)}</div>
  `;
  
  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addSystemMessage(text, isError = false) {
  const messagesContainer = document.getElementById('chatMessages');
  const messageEl = document.createElement('div');
  messageEl.className = `chat-message message-system ${isError ? 'message-error' : ''}`;
  messageEl.innerHTML = `<div class="message-content">ℹ️ ${escapeHtml(text)}</div>`;
  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  const aiModeToggle = document.getElementById('aiModeToggle');
  const isAiMode = aiModeToggle?.checked || false;
  
  if (!message || !activeChannelWs || activeChannelWs.readyState !== WebSocket.OPEN) {
    return;
  }
  
  activeChannelWs.send(JSON.stringify({
    type: 'message',
    message: message,
    senderType: 'kb',
    senderIdentifier: 'KB Admin',
    aiMode: isAiMode
  }));
  
  input.value = '';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function deleteChannel(id) {
  if (!confirm('Are you sure you want to delete this channel?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/channels/${id}`, {
      method: 'DELETE',
    });
    
    if (response.ok) {
      openChannelsManager();
    }
  } catch (err) {
    alert('Failed to delete channel');
    console.error(err);
  }
}

function copyConnectionString(connectionString) {
  navigator.clipboard.writeText(connectionString).then(() => {
    alert('Connection string copied to clipboard!');
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = connectionString;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('Connection string copied!');
  });
}

async function fetchChannels() {
  try {
    const response = await fetch('/api/channels');
    return await response.json();
  } catch (err) {
    console.error('Failed to fetch channels:', err);
    return [];
  }
}
