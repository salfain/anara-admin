import { create } from 'zustand';

let nextId = 1;

const useToastStore = create((set) => ({
  toasts: [],
  push: (message, type = 'success') => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
}));

export default useToastStore;
