import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SidebarState {
  isOpen: boolean;
  isHover: boolean;
  hasHydrated: boolean;
  settings: { disabled: boolean; isHoverOpen: boolean };
  toggleOpen: (force?: boolean) => void;
  closeOnMobile: () => void;
  setIsOpen: (isOpen: boolean) => void;
  setIsHover: (isHover: boolean) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  getOpenState: () => boolean;
  setSettings: (settings: Partial<SidebarState["settings"]>) => void;
}

function readPersistedIsOpen(): boolean {
  if (typeof window === "undefined") return true;

  try {
    const raw = localStorage.getItem("sidebar");
    if (!raw) return true;

    const parsed = JSON.parse(raw) as { state?: { isOpen?: boolean } };
    return parsed.state?.isOpen ?? true;
  } catch {
    return true;
  }
}

export const useSidebar = create<SidebarState>()(
  persist(
    (set, get) => ({
      isOpen: readPersistedIsOpen(),
      isHover: false,
      hasHydrated: false,
      settings: { disabled: false, isHoverOpen: false },
      toggleOpen: (force?: boolean) => {
        set({ isOpen: force !== undefined ? force : !get().isOpen });
      },
      closeOnMobile: () => {
        if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
          set({ isOpen: false });
        }
      },
      setIsOpen: (isOpen: boolean) => {
        set({ isOpen });
      },
      setIsHover: (isHover: boolean) => {
        set({ isHover });
      },
      setHasHydrated: (hasHydrated: boolean) => {
        set({ hasHydrated });
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
      partialize: (state) => ({
        isOpen: state.isOpen,
        settings: state.settings,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (!error) {
          useSidebar.getState().setHasHydrated(true);
        }
      },
    },
  ),
);

if (typeof window !== "undefined") {
  useSidebar.persist.onFinishHydration(() => {
    useSidebar.getState().setHasHydrated(true);
  });

  if (useSidebar.persist.hasHydrated()) {
    useSidebar.getState().setHasHydrated(true);
  }
}
