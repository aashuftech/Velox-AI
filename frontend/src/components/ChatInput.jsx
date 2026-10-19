import React, { useState, useRef, useEffect } from 'react';

export const ChatInput = ({ onSendMessage, disabled }) => {
  const [text, setText] = useState('');
  const formRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) {
      return;
    }
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    // IME-safe enter-to-submit
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      if (e.nativeEvent.isComposing || e.keyCode === 229) {
        return;
      }

      formRef.current?.requestSubmit();
    }
  };

  return (
    <div className="velox-bottom-zone">
      <div className="velox-bottom-container">
        {/* Composer Box Matching PDF */}
        <form ref={formRef} onSubmit={handleSubmit} className="velox-composer-box">
          <button
            type="button"
            className="velox-attachment-btn"
            title="Attach file"
            aria-label="Attach file"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          <label htmlFor="velox-main-input" className="visually-hidden">
            Velox AI input
          </label>
          <textarea
            ref={textareaRef}
            id="velox-main-input"
            className="velox-composer-input"
            placeholder="Velox AI se kuch bhi poochiye..."
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />

          <button
            type="submit"
            className="velox-send-btn"
            disabled={disabled || !text.trim()}
            aria-label="Send"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </form>

        {/* Disclaimer Text Matching PDF */}
        <div className="velox-disclaimer-text">
          Velox AI galti kar sakta hai. Zaroori jaankari ek baar verify zaroor karein.
        </div>
      </div>
    </div>
  );
};
