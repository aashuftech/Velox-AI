import React, { useState, useEffect } from 'react';

export const Signup = ({ onSignupSuccess, onSwitchToLogin, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    if (!name.trim()) {
      errors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (name.trim().length > 50) {
      errors.name = 'Name cannot exceed 50 characters';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
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
      await onSignupSuccess({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to create account. Please try again.';
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
        <div className="velox-auth-logo">
          <div className="velox-logo-icon">V</div>
          <div className="velox-logo-text">
            Velox<span className="teal-highlight">AI</span>
          </div>
        </div>

        <div className="velox-auth-header">
          <h1 className="velox-auth-title">Create your account</h1>
          <p className="velox-auth-subtitle">
            Get started to save your chat sessions and unlock persistent memory
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
          {/* Name Field */}
          <div className="velox-form-group">
            <label htmlFor="signup-name" className="velox-form-label">
              Full Name
            </label>
            <input
              id="signup-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="e.g. Alex Morgan"
              className={`velox-auth-input ${fieldErrors.name ? 'input-error' : ''}`}
              autoComplete="name"
              autoFocus
              disabled={isSubmitting}
            />
            {fieldErrors.name && (
              <span className="velox-field-error">{fieldErrors.name}</span>
            )}
          </div>

          {/* Email Field */}
          <div className="velox-form-group">
            <label htmlFor="signup-email" className="velox-form-label">
              Email Address
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
              }}
              placeholder="name@example.com"
              className={`velox-auth-input ${fieldErrors.email ? 'input-error' : ''}`}
              autoComplete="email"
              disabled={isSubmitting}
            />
            {fieldErrors.email && (
              <span className="velox-field-error">{fieldErrors.email}</span>
            )}
          </div>

          {/* Password Field */}
          <div className="velox-form-group">
            <label htmlFor="signup-password" className="velox-form-label">
              Password
            </label>
            <div className="velox-input-wrapper">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="At least 6 characters"
                className={`velox-auth-input ${fieldErrors.password ? 'input-error' : ''}`}
                autoComplete="new-password"
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

          {/* Confirm Password Field */}
          <div className="velox-form-group">
            <label htmlFor="signup-confirm-password" className="velox-form-label">
              Confirm Password
            </label>
            <div className="velox-input-wrapper">
              <input
                id="signup-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }
                }}
                placeholder="Re-enter your password"
                className={`velox-auth-input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="velox-password-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <span className="velox-field-error">{fieldErrors.confirmPassword}</span>
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
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="velox-auth-footer">
          <p>
            Already have an account?{' '}
            <button
              type="button"
              className="velox-switch-btn"
              onClick={onSwitchToLogin}
              disabled={isSubmitting}
            >
              Sign in
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
