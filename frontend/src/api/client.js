import axios from 'axios';

const configuredBaseUrl =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, '');
export const API_BASE_URL = /\/api$/i.test(normalizedBaseUrl)
  ? normalizedBaseUrl
  : `${normalizedBaseUrl}/api`;

/**
 * Shared Axios client with credentialed CORS support.
 * Ensures HttpOnly auth cookies are sent across origins (e.g. Vercel to Render).
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
