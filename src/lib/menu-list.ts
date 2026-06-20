import {
  BookOpen,
  LayoutGrid,
  MessageCircle,
  MessageSquare,
  Plug,
  Users,
} from "@/components/icons";
import { getDashboardHref } from "@/lib/deployment-urls";
export type MenuItem = {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  submenus: { href: string; label: string; active?: boolean }[];
  active?: boolean;
  isLoading?: boolean;
};

export type MenuGroup = {
  groupLabel: string;
  menus: MenuItem[];
};

export type MenuList = MenuGroup[];

type BuildMenuListOptions = {
  campaignSubmenus?: MenuItem["submenus"];
  campaignsLoading?: boolean;
};

export function getStaticMenuList(
  _orgType: string | null = null,
  options: BuildMenuListOptions = {},
): MenuList {
  const campaignSubmenus = options.campaignSubmenus ?? [];
  const baseMenus: MenuList = [
    {
      groupLabel: "",
      menus: [
        {
          href: getDashboardHref(),
          label: "Dashboard",
          icon: LayoutGrid,
          submenus: [],
        },
        {
          href: "/campaigns",
          label: "Campaigns",
          icon: Users,
          submenus: campaignSubmenus,
          isLoading: options.campaignsLoading,
        },
        {
          href: "/conversations",
          label: "Conversations",
          icon: MessageSquare,
          submenus: [],
        },
        {
          href: "/echo",
          label: "Echo Widget",
          icon: MessageCircle,
          submenus: [],
        },
        {
          href: "/integrations",
          label: "Integrations",
          icon: Plug,
          submenus: [],
        },
        {
          href: "/knowledge-base",
          label: "Knowledge Base",
          icon: BookOpen,
          submenus: [],
        },
      ],
    },
  ];
  return baseMenus;
}

export function buildMenuList(options: BuildMenuListOptions = {}): MenuList {
  return getStaticMenuList(null, options);
}
