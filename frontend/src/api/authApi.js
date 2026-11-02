import { apiClient } from './client.js';

export const authApi = {
  /**
   * Register a new user with Name, Email, Password, and Confirm Password.
   */
  async register({ name, email, password, confirmPassword }) {
    const res = await apiClient.post('/auth/register', {
      name,
      email,
      password,
      confirmPassword,
    });
    return res.data;
  },

  /**
   * Log in with Email and Password.
   */
  async login({ email, password }) {
    const res = await apiClient.post('/auth/login', {
      email,
      password,
    });
    return res.data;
  },

  /**
   * Log out and clear the session cookie.
   */
  async logout() {
    const res = await apiClient.post('/auth/logout');
    return res.data;
  },

  /**
   * Get current authenticated user profile.
   */
  async getCurrentUser() {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
};
