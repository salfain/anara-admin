import { create } from 'zustand';

const stored = localStorage.getItem('anara_sidebar_collapsed') === 'true';

const useSidebarStore = create((set, get) => ({
  collapsed: stored,
  toggleCollapsed: () => {
    const next = !get().collapsed;
    localStorage.setItem('anara_sidebar_collapsed', String(next));
    set({ collapsed: next });
  },
}));

export default useSidebarStore;
