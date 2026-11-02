import { apiClient } from './client.js';

export const chatApi = {
  async getHealth() {
    const res = await apiClient.get('/health');
    return res.data;
  },

  async sendGuestMessage(text, history = []) {
    const res = await apiClient.post('/chat/guest', { text, history });
    return res.data;
  },

  async getConversations() {
    const res = await apiClient.get('/conversations');
    return res.data;
  },

  async createConversation(title = 'New Chat') {
    const res = await apiClient.post('/conversations', { title });
    return res.data;
  },

  async renameConversation(conversationId, title) {
    const res = await apiClient.patch(`/conversations/${conversationId}`, { title });
    return res.data;
  },

  async deleteConversation(conversationId) {
    const res = await apiClient.delete(`/conversations/${conversationId}`);
    return res.data;
  },

  async getMessages(conversationId) {
    const res = await apiClient.get(`/conversations/${conversationId}/messages`);
    return res.data;
  },

  async sendMessage(conversationId, text) {
    const res = await apiClient.post(`/conversations/${conversationId}/messages`, { text });
    return res.data;
  },
};
