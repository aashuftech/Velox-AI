import React, { useState } from 'react';

export const ChatHeader = ({
  onToggleSidebar,
  isConnected = true,
  providerName = 'Google Gemini (Live)',
  storageMode = 'mongodb',
}) => {
  const [model, setModel] = useState('Velox Turbo');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const models = ['Velox Turbo', 'Velox Pro 3.5', 'Velox Ultra'];

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert('Chat link copied to clipboard!');
    }
  };

  const isAtlas = storageMode === 'mongodb';

  return (
    <header className="velox-topbar">
      <div className="velox-topbar-left">
        <button
          type="button"
          className="velox-hamburger"
          onClick={onToggleSidebar}
          aria-label="Open sidebar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Velox Turbo Selector Pill from PDF */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="velox-model-pill"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title={`Active AI: ${providerName} | Database: ${
              isAtlas ? 'MongoDB Atlas (Persistent)' : 'In-Memory Fallback'
            }`}
          >
            <span
              className="velox-model-dot"
              style={{
                backgroundColor: isConnected ? '#2dd4bf' : '#ef4444',
                boxShadow: isConnected
                  ? '0 0 6px #2dd4bf'
                  : '0 0 6px #ef4444',
              }}
            />
            <span>{model}</span>
            <span className="velox-model-chevron">⌵</span>
          </button>

          {isMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                backgroundColor: '#181926',
                border: '1px solid #252738',
                borderRadius: '10px',
                padding: '6px',
                zIndex: 60,
                minWidth: '220px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              <div
                style={{
                  padding: '6px 10px 4px 10px',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#63667c',
                }}
              >
                Model Engine
              </div>
              {models.map((m) => (
                <div
                  key={m}
                  onClick={() => {
                    setModel(m);
                    setIsMenuOpen(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.84rem',
                    color: m === model ? '#2dd4bf' : '#ffffff',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    backgroundColor: m === model ? '#1e2030' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{m}</span>
                  {m === model && <span style={{ fontSize: '0.75rem' }}>✓</span>}
                </div>
              ))}

              <div
                style={{
                  margin: '6px 0',
                  borderTop: '1px solid #252738',
                  paddingTop: '6px',
                }}
              />

              <div
                style={{
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  color: '#9496a8',
                  lineHeight: 1.4,
                }}
              >
                <div>
                  <strong style={{ color: '#ffffff' }}>AI Core:</strong>{' '}
                  <span style={{ color: '#2dd4bf' }}>{providerName}</span>
                </div>
                <div>
                  <strong style={{ color: '#ffffff' }}>Storage:</strong>{' '}
                  <span style={{ color: isAtlas ? '#2dd4bf' : '#f59e0b' }}>
                    {isAtlas ? 'MongoDB Atlas' : 'In-Memory'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="velox-topbar-right">
        {/* Share Button from PDF */}
        <button
          type="button"
          className="velox-share-btn"
          onClick={handleShare}
          title="Share conversation"
          aria-label="Share conversation"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
      </div>
    </header>
  );
};
