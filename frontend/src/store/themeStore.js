import { create } from 'zustand';

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

const stored = localStorage.getItem('anara_theme') || 'light';
applyTheme(stored);

const useThemeStore = create((set, get) => ({
  theme: stored,
  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('anara_theme', next);
    applyTheme(next);
    set({ theme: next });
  },
}));

export default useThemeStore;
