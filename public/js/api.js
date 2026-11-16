/**
 * Shared API Client (Engine 4)
 * 
 * Provides unified fetch wrapper for all frontend pages:
 * - Automatically handles JSON headers and parsing
 * - Redirects to /login.html on 401 Unauthorized
 * - Exposes standardized error messages
 */

const API = {
  /**
   * Core request handler wrapping window.fetch
   */
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized globally: user session expired or missing
      if (response.status === 401) {
        if (!window.location.pathname.endsWith('login.html')) {
          window.location.href = '/login.html';
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Session expired. Please sign in again.');
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${options.method || 'GET'} ${url}:`, err.message);
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  /**
   * Helper to fetch current logged-in user details
   */
  async getCurrentUser() {
    return this.get('/api/auth/me');
  },

  /**
   * Helper to log out and redirect to login page
   */
  async logout() {
    try {
      await this.post('/api/auth/logout');
    } catch (err) {
      console.warn('Logout error:', err.message);
    } finally {
      window.location.href = '/login.html';
    }
  }
};
