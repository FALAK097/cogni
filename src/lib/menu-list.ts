import type { Hugeicon } from "@/components/icons";
import {
  BookOpen,
  Bot,
  Clock,
  LayoutGrid,
  MessageCircle,
  MessageSquare,
  Plug,
  Settings,
  Users,
} from "@/components/icons";

export type MenuItem = {
  id: string;
  href: string;
  label: string;
  icon: Hugeicon;
  submenus: { href: string; label: string; active?: boolean }[];
  active?: boolean;
  badge?: string;
  badgeVariant?: "default" | "coming-soon";
};

export type MenuGroup = {
  groupLabel: string;
  menus: MenuItem[];
};

export type MenuList = MenuGroup[];

export function getStaticMenuList(): MenuList {
  return [
    {
      groupLabel: "",
      menus: [
        {
          id: "dashboard",
          href: "/backstage",
          label: "Dashboard",
          icon: LayoutGrid,
          submenus: [],
        },
        {
          id: "playground",
          href: "/playground",
          label: "Playground",
          icon: Bot,
          submenus: [],
        },
        {
          id: "conversations",
          href: "/conversations",
          label: "Conversations",
          icon: MessageSquare,
          submenus: [],
        },
        {
          id: "widget",
          href: "/widget",
          label: "Widget",
          icon: MessageCircle,
          submenus: [],
        },
        {
          id: "integrations",
          href: "/integrations",
          label: "Integrations",
          icon: Plug,
          submenus: [],
        },
        {
          id: "knowledge-base",
          href: "/knowledge-base",
          label: "Knowledge Base",
          icon: BookOpen,
          submenus: [],
        },
      ],
    },
  ];
}

export const SIDEBAR_FOOTER_LINK = {
  href: "https://help.widget.inc",
  label: "Helpdesk",
};

export function buildMenuList(): MenuList {
  return getStaticMenuList();
}

export function getWorkspaceMenuList(): MenuList {
  return [
    {
      groupLabel: "",
      menus: [
        {
          id: "agents",
          href: "/agents",
          label: "Agents",
          icon: Users,
          submenus: [],
        },
        {
          id: "usage",
          href: "/agents/usage",
          label: "Usage",
          icon: Clock,
          submenus: [],
        },
        {
          id: "workspace-settings",
          href: "/agents/settings",
          label: "Workspace settings",
          icon: Settings,
          submenus: [],
        },
      ],
    },
  ];
}

export function buildWorkspaceMenuList(): MenuList {
  return getWorkspaceMenuList();
}
