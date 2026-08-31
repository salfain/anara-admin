import { create } from 'zustand';
import api from '../api/client';

// Bursts of 403s (a page firing several requests at once) would otherwise
// each kick off their own refresh.
let refreshInFlight = null;

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('anara_user') || 'null'),
  token: localStorage.getItem('anara_token') || null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('anara_token', data.token);
      localStorage.setItem('anara_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Login gagal', loading: false });
      return false;
    }
  },

  signup: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/signup', { email, password, name });
      set({ loading: false });
      return { ok: true, pending: Boolean(data.pending), message: data.message };
    } catch (err) {
      set({ error: err.response?.data?.error || 'Signup gagal', loading: false });
      return { ok: false };
    }
  },

  // Called on load, on a timer, on tab focus, and whenever the server rejects
  // an action as forbidden — so it has to be cheap and safe to call often.
  // The token no longer needs reissuing: the backend resolves the role and its
  // permissions from the database per request rather than from the claims.
  refreshUser: async () => {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      try {
        const { data } = await api.get('/auth/me');
        localStorage.setItem('anara_user', JSON.stringify(data.user));
        set({ user: data.user });
      } catch {
        // token invalid/expired — leave to existing 401 handling elsewhere
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  },

  logout: () => {
    localStorage.removeItem('anara_token');
    localStorage.removeItem('anara_user');
    set({ user: null, token: null });
  },
}));

export default useAuthStore;
