import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('anara_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 403 usually means this user's permissions changed while the page was
    // open, so the UI is showing actions the server no longer allows. Let the
    // app know so it can re-read them instead of leaving stale buttons around.
    if (error.response?.status === 403) {
      window.dispatchEvent(new CustomEvent('anara:forbidden'));
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('anara_token');
      localStorage.removeItem('anara_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
