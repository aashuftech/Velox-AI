const configuredBaseUrl =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, '');
const PRIMARY_URL = /\/api$/i.test(normalizedBaseUrl)
  ? normalizedBaseUrl
  : `${normalizedBaseUrl}/api`;
const FALLBACK_URL = '/api';

const fetchWithFallback = async (endpoint, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';

  try {
    const res = await fetch(`${PRIMARY_URL}${endpoint}`, options);
    if (canRetry && !res.ok && res.status >= 500 && PRIMARY_URL !== FALLBACK_URL) {
      // Try fallback url if 500 error on primary
      return await fetch(`${FALLBACK_URL}${endpoint}`, options);
    }
    return res;
  } catch (err) {
    if (canRetry && PRIMARY_URL !== FALLBACK_URL) {
      return await fetch(`${FALLBACK_URL}${endpoint}`, options);
    }
    throw err;
  }
};

export const chatApi = {
  async getHealth() {
    const res = await fetchWithFallback('/health');
    if (!res.ok) {
      throw new Error(`Health check failed (${res.status})`);
    }
    return res.json();
  },

  async getConversations() {
    const res = await fetchWithFallback('/conversations');
    if (!res.ok) {
      throw new Error(`Failed to fetch conversations (${res.status})`);
    }
    return res.json();
  },

  async createConversation(title = 'New Chat') {
    const res = await fetchWithFallback('/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      throw new Error(`Failed to create conversation (${res.status})`);
    }
    return res.json();
  },

  async deleteConversation(conversationId) {
    const res = await fetchWithFallback(`/conversations/${conversationId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Failed to delete conversation (${res.status})`);
    }
    return res.json();
  },

  async getMessages(conversationId) {
    const res = await fetchWithFallback(`/conversations/${conversationId}/messages`);
    if (!res.ok) {
      throw new Error(`Failed to fetch messages (${res.status})`);
    }
    return res.json();
  },

  async sendMessage(conversationId, text) {
    const res = await fetchWithFallback(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      throw new Error(`Failed to send message (${res.status})`);
    }
    return res.json();
  },
};
