import React, { useState, useEffect, useCallback } from 'react';
import { chatApi } from './api/chatApi.js';
import { authApi } from './api/authApi.js';
import { ChatSidebar } from './components/ChatSidebar.jsx';
import { ChatHeader } from './components/ChatHeader.jsx';
import { MessageList } from './components/MessageList.jsx';
import { ChatInput } from './components/ChatInput.jsx';
import { Login } from './components/Login.jsx';
import { Signup } from './components/Signup.jsx';

export const App = () => {
  // Authentication state
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authModal, setAuthModal] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/login') return 'login';
      if (window.location.pathname === '/signup') return 'signup';
    }
    return null;
  });

  // Chatbot state
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [providerName, setProviderName] = useState('Google Gemini');
  const [storageMode, setStorageMode] = useState('mongodb');
  const [errorMessage, setErrorMessage] = useState('');

  // Handle URL history syncing for login / signup modal
  const openAuthModal = (view) => {
    setAuthModal(view);
    if (typeof window !== 'undefined') {
      const targetPath = view === 'signup' ? '/signup' : '/login';
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  };

  const closeAuthModal = () => {
    setAuthModal(null);
    if (typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname === '/signup')) {
      window.history.pushState(null, '', '/');
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/signup') {
        setAuthModal('signup');
      } else if (window.location.pathname === '/login') {
        setAuthModal('login');
      } else {
        setAuthModal(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check health status & active AI integrations
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

  // Fetch real conversations belonging to logged-in user from MongoDB Atlas
  const loadConversations = useCallback(async (selectFirst = false) => {
    try {
      const result = await chatApi.getConversations();
      const list = result.data || [];
      setConversations(list);

      if (selectFirst && list.length > 0) {
        setActiveConversationId((prev) => (prev ? prev : list[0]._id));
      } else if (list.length === 0) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        // Session expired or unauthenticated
        setUser(null);
        setConversations([]);
      } else {
        setErrorMessage(`Failed to fetch conversations from MongoDB: ${err.message}`);
      }
    }
  }, []);

  // Restore authenticated session on initial mount or page refresh
  useEffect(() => {
    let isSubscribed = true;

    const restoreSession = async () => {
      try {
        const data = await authApi.getCurrentUser();
        if (isSubscribed && data?.user) {
          setUser(data.user);
          if (typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname === '/signup')) {
            window.history.replaceState(null, '', '/');
            setAuthModal(null);
          }
          await loadConversations(true);
        }
      } catch (err) {
        if (isSubscribed) {
          setUser(null);
        }
      } finally {
        if (isSubscribed) {
          setIsAuthChecking(false);
        }
      }
    };

    restoreSession();
    checkHealth();

    const interval = setInterval(checkHealth, 15000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [checkHealth, loadConversations]);

  // Load real messages from MongoDB Atlas when active conversation switches for authenticated user
  useEffect(() => {
    if (!user || !activeConversationId) {
      // In guest mode or when no active conversation, don't auto-fetch from DB
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
          if (err.response?.status === 401) {
            setUser(null);
          } else {
            setErrorMessage(`Failed to load messages from database: ${err.message}`);
          }
        }
      }
    };

    fetchMsgs();

    return () => {
      isSubscribed = false;
    };
  }, [activeConversationId, user]);

  // Login handler
  const handleLogin = async (email, password) => {
    const data = await authApi.login({ email, password });
    setUser(data.user);
    closeAuthModal();
    await loadConversations(true);
  };

  // Signup handler
  const handleSignup = async (formData) => {
    const data = await authApi.register(formData);
    setUser(data.user);
    closeAuthModal();
    await loadConversations(true);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('[Logout Notice]', err.message);
    } finally {
      setUser(null);
      setConversations([]);
      setMessages([]);
      setActiveConversationId(null);
    }
  };

  // Create new conversation (authenticated: creates in MongoDB; guest: resets in-memory messages)
  const handleNewConversation = async () => {
    if (!user) {
      // Guest: start fresh chat in-memory
      setMessages([]);
      setActiveConversationId(null);
      setErrorMessage('');
      return;
    }

    try {
      const title = 'New Chat';
      const result = await chatApi.createConversation(title);
      const newConv = result.data;
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv._id);
      setMessages([]);
      setErrorMessage('');
    } catch (err) {
      if (err.response?.status === 401) {
        setUser(null);
      } else {
        setErrorMessage(`Failed to create conversation in MongoDB: ${err.message}`);
      }
    }
  };

  // Delete conversation and messages permanently from MongoDB Atlas (authenticated only)
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
      if (err.response?.status === 401) {
        setUser(null);
      } else {
        setErrorMessage(`Failed to delete conversation from MongoDB: ${err.message}`);
      }
    }
  };

  // Rename conversation and persist title in MongoDB Atlas (authenticated only)
  const handleRenameConversation = async (id, newTitle) => {
    const previousConversations = [...conversations];
    // Optimistic UI update
    setConversations((prev) =>
      prev.map((c) => (c._id === id ? { ...c, title: newTitle, isCustomTitle: true } : c))
    );

    try {
      await chatApi.renameConversation(id, newTitle);
      setErrorMessage('');
    } catch (err) {
      // Revert optimistic update on failure
      setConversations(previousConversations);
      if (err.response?.status === 401) {
        setUser(null);
      } else {
        setErrorMessage(`Failed to rename conversation in MongoDB: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  // Send message: supports both authenticated persistence and guest in-memory chat
  const handleSendMessage = async (text) => {
    // -------------------------------------------------------------
    // GUEST FLOW: Do NOT save to MongoDB
    // -------------------------------------------------------------
    if (!user) {
      const tempUserMsg = {
        _id: `guest-user-${Date.now()}`,
        sender: 'user',
        text,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempUserMsg]);
      setIsLoading(true);

      try {
        const history = messages.map((m) => ({
          sender: m.sender,
          text: m.text,
        }));
        const response = await chatApi.sendGuestMessage(text, history);
        const { assistantMessage } = response.data;

        setMessages((prev) => [...prev, assistantMessage]);
        setErrorMessage('');
      } catch (err) {
        setErrorMessage(`Failed to generate AI response: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // -------------------------------------------------------------
    // AUTHENTICATED FLOW: Save to MongoDB Atlas
    // -------------------------------------------------------------
    let targetConvId = activeConversationId;

    if (!targetConvId) {
      try {
        const title = text.slice(0, 36);
        const convRes = await chatApi.createConversation(title);
        const realConv = convRes.data;
        setConversations((prev) => [realConv, ...prev]);
        setActiveConversationId(realConv._id);
        targetConvId = realConv._id;
      } catch (err) {
        if (err.response?.status === 401) {
          setUser(null);
        } else {
          setErrorMessage(`Cannot initialize chat in MongoDB: ${err.message}`);
        }
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
      loadConversations(false);
    } catch (err) {
      if (err.response?.status === 401) {
        setUser(null);
      } else {
        setErrorMessage(`Failed to send message: ${err.message}`);
      }
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

  // Initial Auth Verification Screen
  if (isAuthChecking) {
    return (
      <div className="velox-auth-loading-screen">
        <div className="velox-auth-logo">
          <div className="velox-logo-icon">V</div>
          <div className="velox-logo-text">
            Velox<span className="teal-highlight">AI</span>
          </div>
        </div>
        <div className="velox-auth-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="velox-layout">
      <ChatSidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
        onOpenAuth={openAuthModal}
      />

      <main className="velox-main">
        <ChatHeader
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isConnected={isBackendConnected}
          providerName={providerName}
          storageMode={user ? storageMode : 'in-memory-guest'}
          user={user}
          onOpenAuth={openAuthModal}
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

      {/* Auth Modal Overlay for Login & Signup when triggered */}
      {authModal && (
        <div className="velox-modal-backdrop" onClick={closeAuthModal}>
          <div className="velox-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            {authModal === 'signup' ? (
              <Signup
                onSignupSuccess={handleSignup}
                onSwitchToLogin={() => openAuthModal('login')}
                onClose={closeAuthModal}
              />
            ) : (
              <Login
                onLoginSuccess={handleLogin}
                onSwitchToSignup={() => openAuthModal('signup')}
                onClose={closeAuthModal}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
