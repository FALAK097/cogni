"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Knowledge01Icon,
  MessageMultiple01Icon,
  Plug01Icon,
  Settings02Icon,
  SparklesIcon,
  UserGroupIcon,
  WebDesign01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const items = [
  { label: "Widget", href: "/dashboard/widget", icon: WebDesign01Icon },
  { label: "Inbox", href: "/dashboard/inbox", icon: MessageMultiple01Icon },
  { label: "Contacts", href: "/dashboard/contacts", icon: UserGroupIcon, disabled: true },
  { label: "Knowledge", href: "/dashboard/knowledge", icon: Knowledge01Icon, disabled: true },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug01Icon, disabled: true },
  { label: "Settings", href: "/dashboard/settings", icon: Settings02Icon, disabled: true },
];

export function AppSidebar({
  workspace,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  workspace: {
    name: string;
  };
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold">
            <HugeiconsIcon icon={SparklesIcon} className="size-4" />
          </span>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold text-foreground">widget</span>
            <span className="truncate text-xs text-muted-foreground">{workspace.name}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarMenu className="px-2">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            if (item.disabled) {
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    disabled
                    tooltip={item.label}
                    className="flex items-center gap-3 text-muted-foreground/45 cursor-not-allowed hover:bg-transparent"
                  >
                    <HugeiconsIcon icon={item.icon} className="size-4.5" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={active}
                  tooltip={item.label}
                  className="flex items-center gap-3"
                >
                  <HugeiconsIcon icon={item.icon} className="size-4.5" />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
