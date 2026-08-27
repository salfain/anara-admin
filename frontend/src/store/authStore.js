import { create } from 'zustand';
import api from '../api/client';

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

  refreshUser: async () => {
    try {
      // Reissue the token too — an old token may predate the isAdmin claim,
      // and the backend trusts that claim (not a live role lookup) on every request.
      const { data: refreshed } = await api.post('/auth/refresh');
      localStorage.setItem('anara_token', refreshed.token);
      set({ token: refreshed.token });

      const { data } = await api.get('/auth/me');
      localStorage.setItem('anara_user', JSON.stringify(data.user));
      set({ user: data.user });
    } catch {
      // token invalid/expired — leave to existing 401 handling elsewhere
    }
  },

  logout: () => {
    localStorage.removeItem('anara_token');
    localStorage.removeItem('anara_user');
    set({ user: null, token: null });
  },
}));

export default useAuthStore;
