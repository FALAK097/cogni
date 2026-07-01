import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const MOBILE_SIDEBAR_BREAKPOINT = 1024;

export function isMobileSidebarViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_SIDEBAR_BREAKPOINT;
}

export function useIsMobileSidebar(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_SIDEBAR_BREAKPOINT - 1}px)`);
      mediaQuery.addEventListener("change", onStoreChange);
      return () => mediaQuery.removeEventListener("change", onStoreChange);
    },
    () => isMobileSidebarViewport(),
    () => false,
  );
}

export function closeMobileSidebar(): void {
  useSidebar.getState().setMobileDrawerOpen(false);
}

interface SidebarState {
  isOpen: boolean;
  mobileDrawerOpen: boolean;
  isHover: boolean;
  hasHydrated: boolean;
  settings: { disabled: boolean; isHoverOpen: boolean };
  toggleOpen: (force?: boolean) => void;
  setIsOpen: (isOpen: boolean) => void;
  setMobileDrawerOpen: (open: boolean) => void;
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
      mobileDrawerOpen: false,
      isHover: false,
      hasHydrated: false,
      settings: { disabled: false, isHoverOpen: false },
      toggleOpen: (force?: boolean) => {
        if (isMobileSidebarViewport()) {
          const next = force !== undefined ? force : !get().mobileDrawerOpen;
          set({ mobileDrawerOpen: next });
          return;
        }

        set({ isOpen: force !== undefined ? force : !get().isOpen });
      },
      setIsOpen: (isOpen: boolean) => {
        set({ isOpen });
      },
      setMobileDrawerOpen: (open: boolean) => {
        set({ mobileDrawerOpen: open });
      },
      setIsHover: (isHover: boolean) => {
        set({ isHover });
      },
      setHasHydrated: (hasHydrated: boolean) => {
        set({ hasHydrated });
      },
      getOpenState: () => {
        const state = get();
        if (isMobileSidebarViewport()) {
          return state.mobileDrawerOpen;
        }
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
      onRehydrateStorage: () => (state, error) => {
        if (!error && state) {
          state.mobileDrawerOpen = false;
          useSidebar.getState().setHasHydrated(true);
        }
      },
    },
  ),
);

if (typeof window !== "undefined") {
  useSidebar.persist.onFinishHydration(() => {
    useSidebar.getState().setMobileDrawerOpen(false);
    useSidebar.getState().setHasHydrated(true);
  });

  if (useSidebar.persist.hasHydrated()) {
    useSidebar.getState().setHasHydrated(true);
  }
}
