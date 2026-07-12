import { BookOpen, LayoutGrid, MessageCircle, MessageSquare, Plug } from "@/components/icons";

export type MenuItem = {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  submenus: { href: string; label: string; active?: boolean }[];
  active?: boolean;
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
          href: "/dashboard",
          label: "Dashboard",
          icon: LayoutGrid,
          submenus: [],
        },
        {
          href: "/playground",
          label: "Playground",
          icon: MessageCircle,
          submenus: [],
        },
        {
          href: "/conversations",
          label: "Conversations",
          icon: MessageSquare,
          submenus: [],
        },
        {
          href: "/knowledge-base",
          label: "Knowledge Base",
          icon: BookOpen,
          submenus: [],
        },
        {
          href: "/integrations",
          label: "Integrations",
          icon: Plug,
          submenus: [],
        },
      ],
    },
  ];
}

export function buildMenuList(): MenuList {
  return getStaticMenuList();
}
