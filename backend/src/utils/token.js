import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'velox_ai_default_development_secret_key_32chars_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Sign a JWT token for the authenticated user.
 */
export const generateToken = (userId) => {
  return jwt.sign({ id: userId.toString() }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verify a given JWT token.
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Build production-ready cookie options.
 * Cross-origin deployment (e.g. Vercel frontend + Render backend) requires
 * sameSite='none' and secure=true over HTTPS.
 */
export const getCookieOptions = (req) => {
  const isHttps =
    Boolean(req?.secure) ||
    req?.headers?.['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
};

/**
 * Build cookie clearing options matching the set options.
 */
export const getClearCookieOptions = (req) => {
  const isHttps =
    Boolean(req?.secure) ||
    req?.headers?.['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
  };
};
