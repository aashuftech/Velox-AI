import React, { useState, useEffect } from 'react';
import { SidebarProfile } from './SidebarProfile.jsx';

export const ChatSidebar = ({
  conversations = [],
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  isOpen,
  onCloseMobile,
  user,
  onLogout,
  onOpenAuth,
}) => {
  // Three-dot dropdown state & Inline rename state
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (!e.target.closest('.velox-chat-menu-container')) {
        setMenuOpenId(null);
      }
    };

    const handleDocumentKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpenId(null);
        if (editingId) {
          setEditingId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [editingId]);

  // Rename actions
  const handleStartRename = (conv, e) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setEditingId(conv._id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (convId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = editTitle.trim();
    if (trimmed && onRenameConversation) {
      onRenameConversation(convId, trimmed);
    }
    setEditingId(null);
  };

  const handleCancelRename = (e) => {
    if (e) e.stopPropagation();
    setEditingId(null);
  };

  // Group conversations based on timestamps
  const todayConversations = [];
  const pastConversations = [];
  const olderConversations = [];

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  conversations.forEach((conv) => {
    const convTime = conv.updatedAt || conv.createdAt
      ? new Date(conv.updatedAt || conv.createdAt).getTime()
      : 0;

    if (convTime >= startOfToday) {
      todayConversations.push(conv);
    } else if (convTime >= sevenDaysAgo.getTime()) {
      pastConversations.push(conv);
    } else {
      olderConversations.push(conv);
    }
  });

  // Reusable conversation item renderer
  const renderConversationItem = (conv) => {
    const isActive = conv._id === activeId;
    const isEditing = conv._id === editingId;
    const isMenuOpen = conv._id === menuOpenId;

    if (isEditing) {
      return (
        <div
          key={conv._id}
          className={`velox-chat-item editing ${isActive ? 'active' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <form
            className="velox-inline-edit-form"
            onSubmit={(e) => handleSaveRename(conv._id, e)}
          >
            <input
              type="text"
              className="velox-inline-edit-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  handleCancelRename(e);
                }
              }}
              autoFocus
              maxLength={150}
              aria-label="Edit conversation title"
            />
            <div className="velox-inline-edit-actions">
              <button
                type="submit"
                className="velox-inline-btn velox-save-btn"
                title="Save (Enter)"
                aria-label="Save title"
                disabled={!editTitle.trim()}
              >
                ✓
              </button>
              <button
                type="button"
                className="velox-inline-btn velox-cancel-btn"
                title="Cancel (Esc)"
                aria-label="Cancel editing"
                onClick={handleCancelRename}
              >
                ✕
              </button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div
        key={conv._id}
        className={`velox-chat-item ${isActive ? 'active' : ''}`}
        onClick={() => {
          onSelectConversation(conv._id);
          onCloseMobile();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onSelectConversation(conv._id);
            onCloseMobile();
          }
        }}
      >
        <span className="velox-chat-title">{conv.title}</span>

        <div
          className="velox-chat-menu-container"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={`velox-chat-menu-btn ${isMenuOpen ? 'open' : ''}`}
            title="Conversation options"
            aria-label={`Options for ${conv.title}`}
            aria-expanded={isMenuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpenId((prev) => (prev === conv._id ? null : conv._id));
            }}
          >
            ⋮
          </button>

          {isMenuOpen && (
            <div className="velox-chat-dropdown" role="menu">
              <button
                type="button"
                className="velox-dropdown-action-btn"
                role="menuitem"
                onClick={(e) => handleStartRename(conv, e)}
              >
                <svg
                  className="velox-action-icon"
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Rename</span>
              </button>

              <button
                type="button"
                className="velox-dropdown-action-btn velox-delete-action"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(null);
                  onDeleteConversation(conv._id);
                }}
              >
                <svg
                  className="velox-action-icon"
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className={`velox-sidebar-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside className={`velox-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="velox-sidebar-top">
          <div className="velox-logo" onClick={user ? onNewConversation : undefined}>
            <div className="velox-logo-icon">V</div>
            <div className="velox-logo-text">
              Velox<span className="teal-highlight">AI</span>
            </div>
          </div>

          <button
            type="button"
            className="velox-sidebar-close"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* New chat button: rendered ONLY for authenticated users */}
        {user && (
          <div className="velox-new-chat-wrapper">
            <button
              type="button"
              className="velox-new-chat-btn"
              onClick={() => {
                onNewConversation();
                onCloseMobile();
              }}
            >
              <span>+</span> New chat
            </button>
          </div>
        )}

        <div className="velox-sidebar-groups">
          {!user ? (
            /* Guest Sidebar: Clean and uncluttered, only the single clickable line */
            <div className="velox-guest-sidebar-container">
              <button
                type="button"
                className="velox-signup-history-link"
                onClick={() => {
                  onOpenAuth && onOpenAuth('signup');
                  onCloseMobile();
                }}
              >
                Sign up to save history →
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="velox-empty-sidebar-msg">
              No chat history yet. Start a new conversation below.
            </div>
          ) : (
            <>
              {/* TODAY Group */}
              {todayConversations.length > 0 && (
                <div className="velox-group-section">
                  <div className="velox-group-title">TODAY</div>
                  <div className="velox-group-list">
                    {todayConversations.map((conv) => renderConversationItem(conv))}
                  </div>
                </div>
              )}

              {/* PICHLE 7 DIN Group */}
              {pastConversations.length > 0 && (
                <div className="velox-group-section">
                  <div className="velox-group-title">PICHLE 7 DIN</div>
                  <div className="velox-group-list">
                    {pastConversations.map((conv) => renderConversationItem(conv))}
                  </div>
                </div>
              )}

              {/* OLDER Group */}
              {olderConversations.length > 0 && (
                <div className="velox-group-section">
                  <div className="velox-group-title">OLDER</div>
                  <div className="velox-group-list">
                    {olderConversations.map((conv) => renderConversationItem(conv))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar Bottom: Logged-in profile or minimal clean space */}
        {user && (
          <div className="velox-sidebar-bottom">
            <SidebarProfile user={user} onLogout={onLogout} />
          </div>
        )}
      </aside>
    </>
  );
};
