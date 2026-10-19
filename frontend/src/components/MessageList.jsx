import React, { useEffect, useRef } from 'react';

// Format standard AI markdown (bold, lists, code blocks, paragraphs)
const renderFormattedText = (text) => {
  if (!text) return null;

  // Split by double newline into paragraphs
  const paragraphs = text.split(/\n\n+/);

  return paragraphs.map((para, pIdx) => {
    // Check if paragraph is a bullet list
    const lines = para.split('\n');
    const isBulletList = lines.every((line) => line.trim().startsWith('* ') || line.trim().startsWith('- '));

    if (isBulletList) {
      return (
        <ul key={pIdx} style={{ paddingLeft: '20px', margin: '8px 0' }}>
          {lines.map((line, lIdx) => {
            const cleanLine = line.trim().replace(/^[\*\-]\s+/, '');
            return (
              <li key={lIdx} style={{ marginBottom: '4px' }}>
                {renderInlineFormatting(cleanLine)}
              </li>
            );
          })}
        </ul>
      );
    }

    return (
      <p key={pIdx} style={{ margin: pIdx > 0 ? '10px 0 0 0' : 0 }}>
        {lines.map((line, lIdx) => (
          <React.Fragment key={lIdx}>
            {renderInlineFormatting(line)}
            {lIdx < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  });
};

// Render bold **text** and inline code `code`
const renderInlineFormatting = (text) => {
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const chunk = match[0];
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      parts.push(<strong key={match.index}>{chunk.slice(2, -2)}</strong>);
    } else if (chunk.startsWith('`') && chunk.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          style={{
            backgroundColor: '#161724',
            padding: '2px 5px',
            borderRadius: '4px',
            fontSize: '0.88em',
            border: '1px solid #252738',
          }}
        >
          {chunk.slice(1, -1)}
        </code>
      );
    }
    lastIndex = match.index + chunk.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

export const MessageList = ({
  messages,
  isLoading,
  onRegenerate,
  onSelectPrompt,
}) => {
  const scrollEndRef = useRef(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleCopy = (textToCopy) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      alert('Message copied to clipboard!');
    }
  };

  if (!messages || messages.length === 0) {
    return (
      <div className="velox-chat-canvas">
        <div className="velox-chat-content-limit" style={{ margin: 'auto', textAlign: 'center' }}>
          <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>
            <div className="velox-assistant-avatar" style={{ margin: '0 auto 16px auto', width: '38px', height: '38px', fontSize: '18px' }}>
              V
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>
              Velox<span style={{ color: '#2dd4bf' }}>AI</span>
            </h2>
            <p style={{ color: '#9496a8', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '24px' }}>
              Your intelligent assistant connected to Google Gemini and MongoDB Atlas. Ask anything or pick a topic below to start.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="velox-chat-canvas">
      <div className="velox-chat-content-limit">
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';

          if (isUser) {
            return (
              <div key={msg._id || index} className="velox-user-row">
                <div className="velox-user-bubble">{msg.text}</div>
              </div>
            );
          }

          // Assistant message
          return (
            <div key={msg._id || index} className="velox-assistant-row">
              <div className="velox-assistant-avatar" aria-hidden="true">
                V
              </div>

              <div className="velox-assistant-body">
                <div className="velox-assistant-text">
                  {renderFormattedText(msg.text)}
                </div>

                {/* Bottom Action Icons (Copy, Regenerate) */}
                <div className="velox-msg-actions">
                  <button
                    type="button"
                    className="velox-action-icon-btn"
                    title="Copy message"
                    onClick={() => handleCopy(msg.text)}
                    aria-label="Copy message"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="velox-action-icon-btn"
                    title="Regenerate response"
                    onClick={onRegenerate}
                    aria-label="Regenerate response"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="velox-assistant-row">
            <div className="velox-assistant-avatar" aria-hidden="true">
              V
            </div>
            <div className="velox-assistant-body">
              <div className="velox-thinking-bubble">
                <span className="velox-thinking-dot" />
                <span className="velox-thinking-dot" />
                <span className="velox-thinking-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>
    </div>
  );
};
