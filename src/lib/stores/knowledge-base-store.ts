import { create } from "zustand";

export const useKnowledgeBaseStore = create<{
  deletingId: string | null;
  setDeletingId: (deletingId: string | null) => void;
  reset: () => void;
}>((set) => ({
  deletingId: null,
  setDeletingId: (deletingId) => set({ deletingId }),
  reset: () =>
    set({
      deletingId: null,
    }),
}));
