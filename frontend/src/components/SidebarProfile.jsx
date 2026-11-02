import React, { useState, useRef, useEffect } from 'react';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const SidebarProfile = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  const initials = getInitials(user.name);

  return (
    <div className="velox-profile-container" ref={containerRef}>
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="velox-profile-dropdown" role="menu">
          <div className="velox-dropdown-user-header">
            <div className="velox-avatar-badge velox-avatar-amber velox-avatar-lg">
              {initials}
            </div>
            <div className="velox-dropdown-user-meta">
              <span className="velox-dropdown-name" title={user.name}>
                {user.name}
              </span>
              <span className="velox-dropdown-email" title={user.email}>
                {user.email}
              </span>
            </div>
          </div>

          <div className="velox-dropdown-tier-row">
            <span className="velox-tier-indicator" />
            <span className="velox-tier-label">Free Plan</span>
          </div>

          <div className="velox-dropdown-divider" />

          {/* Clean minimal Sign out option without any red box/background */}
          <button
            type="button"
            className="velox-dropdown-logout-btn"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            role="menuitem"
          >
            <svg
              className="velox-logout-svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      )}

      {/* Main Profile Bottom Card:
          Clean, spacious vertical stack with Avatar, Name, Email, and Chevron */}
      <div
        className={`velox-profile-card ${isOpen ? 'active-dropdown' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="User profile and settings"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <div className="velox-avatar-badge velox-avatar-amber">
          {initials}
        </div>

        <div className="velox-profile-info">
          <span className="velox-user-name" title={user.name}>
            {user.name}
          </span>
          <span className="velox-user-email" title={user.email}>
            {user.email}
          </span>
        </div>

        <span className={`velox-dropdown-chevron ${isOpen ? 'open' : ''}`}>
          ▾
        </span>
      </div>
    </div>
  );
};
