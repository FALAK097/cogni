import { create } from "zustand";

type ConversationsState = {
  selectedConversationId: string | null;
  focusTasksOnOpen: boolean;
  setSelectedConversationId: (id: string | null) => void;
  openConversationWithTasks: (id: string) => void;
  closeConversation: () => void;
};

export const useConversationsStore = create<ConversationsState>((set) => ({
  selectedConversationId: null,
  focusTasksOnOpen: false,
  setSelectedConversationId: (selectedConversationId) =>
    set({ selectedConversationId, focusTasksOnOpen: false }),
  openConversationWithTasks: (id) => set({ selectedConversationId: id, focusTasksOnOpen: true }),
  closeConversation: () => set({ selectedConversationId: null, focusTasksOnOpen: false }),
}));
