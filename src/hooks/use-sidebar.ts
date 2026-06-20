import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SidebarState {
  isOpen: boolean;
  isHover: boolean;
  settings: { disabled: boolean; isHoverOpen: boolean };
  toggleOpen: (force?: boolean) => void;
  setIsOpen: (isOpen: boolean) => void;
  setIsHover: (isHover: boolean) => void;
  getOpenState: () => boolean;
  setSettings: (settings: Partial<SidebarState["settings"]>) => void;
}

export const useSidebar = create<SidebarState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      isHover: false,
      settings: { disabled: false, isHoverOpen: false },
      toggleOpen: (force?: boolean) => {
        set({ isOpen: force !== undefined ? force : !get().isOpen });
      },
      setIsOpen: (isOpen: boolean) => {
        set({ isOpen });
      },
      setIsHover: (isHover: boolean) => {
        set({ isHover });
      },
      getOpenState: () => {
        const state = get();
        return state.isOpen || (state.settings.isHoverOpen && state.isHover);
      },
      setSettings: (settings) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
      },
    }),
    {
      name: "sidebar",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
