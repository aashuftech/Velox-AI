import React, { useState, useEffect } from 'react';
import VeloxMark from './VeloxMark.jsx';

export const Login = ({ onLoginSuccess, onSwitchToSignup, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const validate = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onLoginSuccess(email.trim(), password);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to log in. Please check your credentials.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="velox-auth-page"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className="velox-auth-card">
        {onClose && (
          <button
            type="button"
            className="velox-auth-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
            title="Continue as Guest"
          >
            ✕
          </button>
        )}

        {/* Velox AI Logo */}
        <div className="brand velox-auth-logo">
          <VeloxMark size={38} />
          <span className="brand-name" style={{ fontSize: '22px' }}>
            Velox<b>AI</b>
          </span>
        </div>

        <div className="velox-auth-header">
          <h1 className="velox-auth-title">Welcome back</h1>
          <p className="velox-auth-subtitle">
            Sign in to access your saved conversations and personalized AI history
          </p>
        </div>

        {errorMessage && (
          <div className="velox-auth-alert" role="alert">
            <span>{errorMessage}</span>
            <button
              type="button"
              className="velox-alert-dismiss"
              onClick={() => setErrorMessage('')}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="velox-auth-form" noValidate>
          {/* Email Field */}
          <div className="velox-form-group">
            <label htmlFor="login-email" className="velox-form-label">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
              }}
              placeholder="name@example.com"
              className={`velox-auth-input ${fieldErrors.email ? 'input-error' : ''}`}
              autoComplete="email"
              autoFocus
              disabled={isSubmitting}
            />
            {fieldErrors.email && (
              <span className="velox-field-error">{fieldErrors.email}</span>
            )}
          </div>

          {/* Password Field */}
          <div className="velox-form-group">
            <label htmlFor="login-password" className="velox-form-label">
              Password
            </label>
            <div className="velox-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="Enter your password"
                className={`velox-auth-input ${fieldErrors.password ? 'input-error' : ''}`}
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="velox-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="velox-field-error">{fieldErrors.password}</span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="velox-auth-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="velox-btn-spinner-wrapper">
                <span className="velox-spinner" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="velox-auth-footer">
          <p>
            Don't have an account?{' '}
            <button
              type="button"
              className="velox-switch-btn"
              onClick={onSwitchToSignup}
              disabled={isSubmitting}
            >
              Create account
            </button>
          </p>
          {onClose && (
            <p style={{ marginTop: '14px' }}>
              <button
                type="button"
                className="velox-guest-continue-btn"
                onClick={onClose}
              >
                Continue chatting as Guest →
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
