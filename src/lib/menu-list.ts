import { LayoutGrid, MessageCircle, MessageSquare } from "@/components/icons";

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
          href: "/conversations",
          label: "Inbox",
          icon: MessageSquare,
          submenus: [],
        },
        {
          href: "/playground",
          label: "Agent",
          icon: MessageCircle,
          submenus: [],
        },
        {
          href: "/dashboard",
          label: "Insights",
          icon: LayoutGrid,
          submenus: [],
        },
      ],
    },
  ];
}

export function buildMenuList(): MenuList {
  return getStaticMenuList();
}
