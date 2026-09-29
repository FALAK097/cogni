"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, BookOpen } from "@/components/icons";
import { cn } from "@/lib/utils";

const sections = [
  { href: "/playground", label: "Configure & test", icon: Bot },
  { href: "/knowledge-base", label: "Knowledge", icon: BookOpen },
] as const;

export function AgentNavigation() {
  const pathname = usePathname();
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-b border-border bg-card px-4 py-3 sm:px-6">
      <span className="text-sm font-semibold">Agent</span>
      <nav aria-label="Agent sections" className="flex min-w-0 gap-1">
        {sections.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : false}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              pathname === href
                ? "bg-secondary font-medium text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
