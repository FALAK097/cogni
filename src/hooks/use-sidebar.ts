import { create } from "zustand";

export const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function writeSidebarCookie(value: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function readSidebarCookie(value: string | undefined): boolean {
  return value !== "false";
}

interface SidebarState {
  isOpen: boolean;
  isHover: boolean;
  settings: { disabled: boolean; isHoverOpen: boolean };
  _hasHydrated: boolean;
  toggleOpen: (force?: boolean) => void;
  setIsOpen: (isOpen: boolean) => void;
  setIsHover: (isHover: boolean) => void;
  getOpenState: () => boolean;
  setSettings: (settings: Partial<SidebarState["settings"]>) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useSidebar = create<SidebarState>((set, get) => ({
  isOpen: true,
  isHover: false,
  settings: { disabled: false, isHoverOpen: false },
  _hasHydrated: false,
  toggleOpen: (force?: boolean) => {
    const next = force !== undefined ? force : !get().isOpen;
    set({ isOpen: next });
    writeSidebarCookie(next);
  },
  setIsOpen: (isOpen: boolean) => {
    set({ isOpen });
    writeSidebarCookie(isOpen);
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
  setHasHydrated: (hasHydrated: boolean) => {
    set({ _hasHydrated: hasHydrated });
  },
}));
