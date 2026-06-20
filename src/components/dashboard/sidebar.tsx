import Link from "next/link";
import {
  DashboardSquare02Icon,
  Knowledge01Icon,
  MessageMultiple01Icon,
  Plug01Icon,
  Settings02Icon,
  SparklesIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const items = [
  { label: "Overview", href: "/dashboard", icon: DashboardSquare02Icon },
  { label: "Inbox", href: "/dashboard/inbox", icon: MessageMultiple01Icon },
  { label: "Contacts", href: "/dashboard/contacts", icon: UserGroupIcon },
  { label: "Knowledge", href: "/dashboard/knowledge", icon: Knowledge01Icon },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug01Icon },
  { label: "Settings", href: "/dashboard/settings", icon: Settings02Icon },
];

export function Sidebar({
  className,
  workspaceName,
}: {
  className?: string;
  workspaceName: string;
}) {
  return (
    <aside className={cn("flex h-full flex-col bg-sidebar", className)}>
      <div className="flex h-16 items-center gap-2 border-b px-5 font-semibold">
        <span className="flex size-8 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          <HugeiconsIcon icon={SparklesIcon} className="size-4" />
        </span>
        widget
      </div>
      <div className="p-3">
        <div className="flex w-full items-center justify-between rounded-2xl border bg-background px-3 py-2.5 text-left text-sm shadow-xs">
          <span>
            <span className="block truncate font-medium">{workspaceName}</span>
            <span className="block text-xs text-muted-foreground">Free plan</span>
          </span>
          <Badge variant="secondary">{workspaceName.charAt(0).toUpperCase()}</Badge>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Dashboard navigation">
        {items.map((item, index) =>
          index === 0 ? (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground",
              )}
            >
              <HugeiconsIcon icon={item.icon} className="size-4.5" />
              {item.label}
            </Link>
          ) : (
            <span
              key={item.href}
              aria-disabled="true"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/40"
            >
              <HugeiconsIcon icon={item.icon} className="size-4.5" />
              {item.label}
              <span className="ml-auto text-xs text-muted-foreground">Soon</span>
            </span>
          ),
        )}
      </nav>
      <div className="border-t p-3">
        <div className="rounded-2xl bg-sidebar-accent p-3 text-xs text-sidebar-accent-foreground">
          <p className="font-medium">Foundation mode</p>
          <p className="mt-1 text-muted-foreground">
            Local SQLite ready. Add complete D1 env to use Cloudflare.
          </p>
        </div>
      </div>
    </aside>
  );
}
