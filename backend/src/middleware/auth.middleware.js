import { verifyToken } from '../utils/token.js';
import { User } from '../models/User.js';
import { getDBStatus } from '../config/db.js';

export const requireAuth = async (req, res, next) => {
  try {
    const { connected } = getDBStatus();
    if (!connected) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable: MongoDB is not connected',
        database: 'disconnected',
      });
    }

    let token = req.cookies?.token;

    if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (tokenErr) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired or is invalid. Please log in again.',
      });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found. Please log in again.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal authentication error',
      error: error.message,
    });
  }
};
