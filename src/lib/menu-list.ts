import { LayoutGrid, MessageCircle, MessageSquare } from "@/components/icons";
import { APP_PAGES, APP_ROUTES } from "@/features/navigation/app-routes";

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
          href: APP_ROUTES.inbox,
          label: APP_PAGES.inbox.label,
          icon: MessageSquare,
          submenus: [],
        },
        {
          href: APP_ROUTES.agent,
          label: APP_PAGES.agent.label,
          icon: MessageCircle,
          submenus: [],
        },
        {
          href: APP_ROUTES.insights,
          label: APP_PAGES.insights.label,
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
