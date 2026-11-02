import { User } from '../models/User.js';
import { generateToken, getCookieOptions, getClearCookieOptions } from '../utils/token.js';
import { getDBStatus } from '../config/db.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ensureDatabaseConnected = (res) => {
  const { connected } = getDBStatus();
  if (!connected) {
    res.status(503).json({
      success: false,
      message: 'Database unavailable: MongoDB is not connected',
      database: 'disconnected',
    });
    return false;
  }
  return true;
};

/**
 * POST /api/auth/register
 * Register a new user with Name, Email, Password, and Confirm Password.
 */
export const register = async (req, res) => {
  try {
    if (!ensureDatabaseConnected(res)) return;

    const { name, email, password, confirmPassword } = req.body || {};

    // Validation: Name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 50 characters',
      });
    }

    // Validation: Email
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Validation: Password
    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }
    if (password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Password cannot exceed 128 characters',
      });
    }

    // Validation: Confirm Password
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Create user
    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password,
    });

    // Generate JWT token and set HttpOnly cookie
    const token = generateToken(user._id);
    const cookieOpts = getCookieOptions(req);
    res.cookie('token', token, cookieOpts);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[Auth Register Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register account',
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/login
 * Log in with Email and Password.
 */
export const login = async (req, res) => {
  try {
    if (!ensureDatabaseConnected(res)) return;

    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT and set HttpOnly cookie
    const token = generateToken(user._id);
    const cookieOpts = getCookieOptions(req);
    res.cookie('token', token, cookieOpts);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[Auth Login Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to log in',
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/logout
 * Log out and clear the authentication cookie.
 */
export const logout = async (req, res) => {
  try {
    const clearOpts = getClearCookieOptions(req);
    res.clearCookie('token', clearOpts);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('[Auth Logout Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to log out',
      error: error.message,
    });
  }
};

/**
 * GET /api/auth/me
 * Retrieve the current authenticated user's profile.
 */
export const getCurrentUser = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    console.error('[Auth GetMe Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve current user',
      error: error.message,
    });
  }
};
