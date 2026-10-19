import React from 'react';

export const ChatSidebar = ({
  conversations = [],
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  onCloseMobile,
}) => {
  // Real grouping based on MongoDB conversation timestamps
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

  return (
    <>
      <div
        className={`velox-sidebar-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside className={`velox-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="velox-sidebar-top">
          <div className="velox-logo" onClick={onNewConversation}>
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

        <div className="velox-sidebar-groups">
          {conversations.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: '#63667c', fontSize: '0.82rem' }}>
              No chat history yet. Start a new conversation below.
            </div>
          ) : (
            <>
              {/* TODAY Group */}
              {todayConversations.length > 0 && (
                <div className="velox-group-section">
                  <div className="velox-group-title">TODAY</div>
                  <div className="velox-group-list">
                    {todayConversations.map((conv) => {
                      const isActive = conv._id === activeId;
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
                          <button
                            type="button"
                            className="velox-chat-delete"
                            title="Delete conversation from MongoDB"
                            aria-label={`Delete ${conv.title}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteConversation(conv._id);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PICHLE 7 DIN Group */}
              {pastConversations.length > 0 && (
                <div className="velox-group-section">
                  <div className="velox-group-title">PICHLE 7 DIN</div>
                  <div className="velox-group-list">
                    {pastConversations.map((conv) => {
                      const isActive = conv._id === activeId;
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
                          <button
                            type="button"
                            className="velox-chat-delete"
                            title="Delete conversation from MongoDB"
                            aria-label={`Delete ${conv.title}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteConversation(conv._id);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {olderConversations.length > 0 && (
                <div className="velox-group-section">
                  <div className="velox-group-title">OLDER</div>
                  <div className="velox-group-list">
                    {olderConversations.map((conv) => (
                      <div
                        key={conv._id}
                        className={`velox-chat-item ${conv._id === activeId ? 'active' : ''}`}
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
                        <button
                          type="button"
                          className="velox-chat-delete"
                          title="Delete conversation from MongoDB"
                          aria-label={`Delete ${conv.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conv._id);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Profile Card Matching PDF */}
        <div className="velox-sidebar-bottom">
          <div className="velox-profile-card">
            <div className="velox-profile-info">
              <span className="velox-profile-tier">Velox Pro</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
