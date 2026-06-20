"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Ellipsis, X } from "@/components/icons";

import { CollapseMenuButton } from "@/components/app-nav/collapse-menu-button";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCampaigns, useLatestChangelog } from "@/hooks/query";
import { getRootHref } from "@/lib/deployment-urls";
import { buildMenuList, type MenuList } from "@/lib/menu-list";
import { cn } from "@/lib/utils";

type MenuProps = {
  isOpen?: boolean;
};

type ChangelogQueryData = {
  success?: boolean;
  data?: {
    version?: string | null;
  };
};

type CampaignMenuEntry = {
  id?: string | null;
  name?: string | null;
};

const getHrefPathname = (href: string) => {
  try {
    return new URL(href).pathname;
  } catch {
    return href;
  }
};

const isMenuActive = (pathname: string, href: string) => {
  const hrefPathname = getHrefPathname(href);
  if (hrefPathname === "/") return pathname === "/" || pathname === "/dashboard";
  return pathname === hrefPathname || pathname.startsWith(`${hrefPathname}/`);
};

export function Menu({ isOpen }: MenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showChangelog, setShowChangelog] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  const campaignsQuery = useCampaigns();
  const { data: changelogData } = useLatestChangelog();

  const campaignSubmenus = useMemo(() => {
    const campaigns =
      (
        campaignsQuery.data as
          | {
              campaigns?: CampaignMenuEntry[];
            }
          | undefined
      )?.campaigns ?? [];

    return campaigns
      .filter(
        (campaign): campaign is { id: string; name: string } =>
          typeof campaign.id === "string" &&
          typeof campaign.name === "string" &&
          campaign.name.trim().length > 0,
      )
      .map((campaign) => ({
        href: `/campaigns/${campaign.id}`,
        label: campaign.name.trim(),
      }));
  }, [campaignsQuery.data]);

  const menuItems = useMemo<MenuList>(
    () =>
      buildMenuList({
        campaignSubmenus,
        campaignsLoading: campaignsQuery.isLoading,
      }),
    [campaignSubmenus, campaignsQuery.isLoading],
  );

  useEffect(() => {
    const latestChangelog = changelogData as ChangelogQueryData | undefined;
    if (latestChangelog?.success && latestChangelog.data?.version) {
      const { version } = latestChangelog.data;
      const lastViewedVersion = localStorage.getItem("lastViewedVersion");
      setLatestVersion(version);

      if (!lastViewedVersion || lastViewedVersion !== version) {
        setShowChangelog(true);
      }
    }
  }, [changelogData]);

  const handleChangelogClose = () => {
    setShowChangelog(false);
    if (latestVersion) {
      localStorage.setItem("lastViewedVersion", latestVersion);
    }
  };

  return (
    <nav className="w-full h-full">
      <ul className="flex flex-col w-full min-h-[calc(100vh-48px-36px-16px-56px)] lg:min-h-[calc(100vh-32px-40px-56px)] items-stretch px-3">
        {menuItems.map(({ groupLabel, menus }, index) => (
          <li className={cn("w-full", groupLabel ? "py-2" : "")} key={index}>
            {(isOpen && groupLabel) || isOpen === undefined ? (
              <p className="text-sm font-medium text-muted-foreground px-2.5 pb-2 w-full truncate">
                {groupLabel}
              </p>
            ) : !isOpen && isOpen !== undefined && groupLabel ? (
              <TooltipProvider delay={100}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div className="flex items-center justify-center w-full cursor-pointer">
                        <Ellipsis className="w-5 h-5" />
                      </div>
                    }
                  />
                  <TooltipContent side="right">
                    <p>{groupLabel}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <p className="pb-2"></p>
            )}
            {menus.map(({ href, label, icon: Icon, active, submenus, isLoading }) => {
              const isActive = active === undefined ? isMenuActive(pathname, href) : active;

              const hasActiveSubmenu = submenus?.some((submenu) => pathname.includes(submenu.href));

              const isCurrentActive = isActive || hasActiveSubmenu;

              const hasAgentSubmenu =
                href.includes("/campaigns") && submenus && submenus.length > 0;

              if (!submenus || submenus.length === 0 || !hasAgentSubmenu) {
                const button = (
                  <Button
                    variant={isCurrentActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full h-10 mb-2 relative overflow-hidden group cursor-pointer flex items-center transition-[justify-content,padding]",
                      isOpen === false ? "justify-center px-0" : "justify-start px-4",
                      isCurrentActive && "shadow-sm",
                    )}
                    onClick={() => router.push(href)}
                  >
                    {isCurrentActive && (
                      <div className="absolute inset-0 transition-opacity duration-300 opacity-100">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:4px_4px]" />
                      </div>
                    )}
                    {isCurrentActive && (
                      <div className="absolute inset-0 p-px transition-opacity duration-300 rounded-md opacity-100 -z-10 bg-gradient-to-br from-transparent via-border to-transparent" />
                    )}
                    <span
                      className={cn(
                        isOpen === false ? "" : "mr-4",
                        "flex-shrink-0 flex items-center justify-center",
                      )}
                    >
                      <Icon size={18} className={isCurrentActive ? "text-primary" : ""} />
                    </span>
                    {isOpen !== false && (
                      <p
                        className={cn(
                          "flex-1 min-w-0 truncate text-left",
                          isCurrentActive && "font-medium text-primary",
                        )}
                      >
                        {label}
                      </p>
                    )}
                    {isOpen && submenus && submenus.length > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                        {submenus.length}
                      </span>
                    )}
                  </Button>
                );

                return (
                  <div className="w-full" key={href}>
                    {isOpen === false ? (
                      <TooltipProvider delay={100}>
                        <Tooltip>
                          <TooltipTrigger render={button} />
                          <TooltipContent side="right">{label}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      button
                    )}
                  </div>
                );
              } else {
                return (
                  <div className="w-full" key={href}>
                    <CollapseMenuButton
                      icon={Icon}
                      label={label}
                      active={isCurrentActive}
                      submenus={submenus}
                      isOpen={isOpen}
                      badgeCount={submenus.length}
                      isLoading={isLoading}
                      href={href}
                    />
                  </div>
                );
              }
            })}
          </li>
        ))}
        {isOpen && showChangelog && (
          <li className="w-full mt-auto mb-2">
            <div className="relative p-3 rounded-lg bg-muted/50">
              <button
                onClick={handleChangelogClose}
                className="absolute cursor-pointer right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
              <Link
                target="_blank"
                href={getRootHref("/changelog")}
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (latestVersion) {
                    localStorage.setItem("lastViewedVersion", latestVersion);
                  }
                  setShowChangelog(false);
                }}
              >
                <p className="mb-1 font-medium">Updates Available</p>
                <p className="text-xs">View Changelog to see recent updates</p>
              </Link>
            </div>
          </li>
        )}
      </ul>
    </nav>
  );
}
