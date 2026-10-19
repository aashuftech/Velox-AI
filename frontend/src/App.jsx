import React, { useState, useEffect, useCallback } from 'react';
import { chatApi } from './api/chatApi.js';
import { ChatSidebar } from './components/ChatSidebar.jsx';
import { ChatHeader } from './components/ChatHeader.jsx';
import { MessageList } from './components/MessageList.jsx';
import { ChatInput } from './components/ChatInput.jsx';

export const App = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [providerName, setProviderName] = useState('Google Gemini');
  const [storageMode, setStorageMode] = useState('mongodb');
  const [errorMessage, setErrorMessage] = useState('');

  // Check health status & active integrations
  const checkHealth = useCallback(async () => {
    try {
      const data = await chatApi.getHealth();
      const isOk = data.status === 'ok';
      const isDbOk = data.database?.connected === true;

      setIsBackendConnected(isOk && isDbOk);
      setProviderName(data.aiProviders?.activeProvider || 'Google Gemini (Live)');
      setStorageMode(data.database?.storageMode || 'mongodb');

      if (!isDbOk) {
        setErrorMessage('Database Alert: MongoDB Atlas is disconnected. Please check database connection.');
      } else {
        setErrorMessage('');
      }
    } catch (err) {
      setIsBackendConnected(false);
      setProviderName('Connecting...');
      setStorageMode('disconnected');
      setErrorMessage(`Backend connection error: ${err.message}. Please ensure server is running.`);
    }
  }, []);

  // Fetch real conversations from MongoDB Atlas
  const loadConversations = useCallback(async (selectFirst = false) => {
    try {
      const result = await chatApi.getConversations();
      const list = result.data || [];
      setConversations(list);

      if (selectFirst && list.length > 0) {
        setActiveConversationId((prev) => (prev ? prev : list[0]._id));
      }
    } catch (err) {
      setErrorMessage(`Failed to fetch conversations from MongoDB: ${err.message}`);
    }
  }, []);

  // Initial mount: check health and load real conversations
  useEffect(() => {
    checkHealth();
    loadConversations(true);

    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth, loadConversations]);

  // Load real messages from MongoDB Atlas when active conversation switches
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    let isSubscribed = true;
    const fetchMsgs = async () => {
      try {
        const result = await chatApi.getMessages(activeConversationId);
        if (isSubscribed) {
          setMessages(result.data || []);
        }
      } catch (err) {
        if (isSubscribed) {
          setErrorMessage(`Failed to load messages from database: ${err.message}`);
        }
      }
    };

    fetchMsgs();

    return () => {
      isSubscribed = false;
    };
  }, [activeConversationId]);

  // Create real conversation in MongoDB Atlas
  const handleNewConversation = async () => {
    try {
      const title = 'New Chat';
      const result = await chatApi.createConversation(title);
      const newConv = result.data;
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv._id);
      setMessages([]);
      setErrorMessage('');
    } catch (err) {
      setErrorMessage(`Failed to create conversation in MongoDB: ${err.message}`);
    }
  };

  // Delete conversation and messages permanently from MongoDB Atlas
  const handleDeleteConversation = async (id) => {
    try {
      await chatApi.deleteConversation(id);
      const remaining = conversations.filter((c) => c._id !== id);
      setConversations(remaining);

      if (activeConversationId === id) {
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0]._id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      setErrorMessage(`Failed to delete conversation from MongoDB: ${err.message}`);
    }
  };

  // Send message to Gemini and persist in MongoDB Atlas
  const handleSendMessage = async (text) => {
    let targetConvId = activeConversationId;

    // If no active conversation exists, create one in MongoDB Atlas first
    if (!targetConvId) {
      try {
        const title = text.slice(0, 36);
        const convRes = await chatApi.createConversation(title);
        const realConv = convRes.data;
        setConversations((prev) => [realConv, ...prev]);
        setActiveConversationId(realConv._id);
        targetConvId = realConv._id;
      } catch (err) {
        setErrorMessage(`Cannot initialize chat in MongoDB: ${err.message}`);
        return;
      }
    }

    // Optimistic UI preview
    const tempUserMsg = {
      _id: `temp-${Date.now()}`,
      conversationId: targetConvId,
      sender: 'user',
      text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage(targetConvId, text);
      const { userMessage, assistantMessage } = response.data;

      setMessages((prev) => [
        ...prev.filter((m) => m._id !== tempUserMsg._id),
        userMessage,
        assistantMessage,
      ]);

      setErrorMessage('');
      // Refresh conversation list to show updated title / timestamp
      loadConversations(false);
    } catch (err) {
      setErrorMessage(`Failed to send message: ${err.message}`);
      // Remove optimistic message if persistence failed
      setMessages((prev) => prev.filter((m) => m._id !== tempUserMsg._id));
    } finally {
      setIsLoading(false);
    }
  };

  // Regenerate last user prompt
  const handleRegenerate = () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.sender === 'user');
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.text);
    }
  };

  const activeConv = conversations.find((c) => c._id === activeConversationId);

  return (
    <div className="velox-layout">
      <ChatSidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      <main className="velox-main">
        <ChatHeader
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isConnected={isBackendConnected}
          providerName={providerName}
          storageMode={storageMode}
        />

        {errorMessage && (
          <div
            className="velox-alert-banner"
            role="alert"
            style={{
              margin: '8px 24px',
              backgroundColor: '#1c141d',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '10px 16px',
              color: '#ef4444',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              className="velox-alert-dismiss"
              onClick={() => setErrorMessage('')}
              aria-label="Dismiss alert"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              ✕
            </button>
          </div>
        )}

        <MessageList
          messages={messages}
          isLoading={isLoading}
          onRegenerate={handleRegenerate}
          onSelectPrompt={handleSendMessage}
        />

        <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
      </main>
    </div>
  );
};

export default App;
