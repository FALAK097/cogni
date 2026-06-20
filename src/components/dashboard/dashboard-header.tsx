"use client";

import { Menu01Icon, Notification02Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Sidebar } from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export function DashboardHeader({
  userName,
  userImage,
  workspaceName,
}: {
  userName: string;
  userImage?: string | null;
  workspaceName: string;
}) {
  return (
    <header className="flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
      <Sheet>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              aria-label="Open navigation"
            />
          }
        >
          <HugeiconsIcon icon={Menu01Icon} />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
          <Sidebar workspaceName={workspaceName} />
        </SheetContent>
      </Sheet>

      <div className="relative hidden w-full max-w-sm md:block">
        <HugeiconsIcon
          icon={Search01Icon}
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          aria-label="Search conversations, contacts, and documents"
          placeholder="Search coming soon"
          disabled
          className="h-9 w-full rounded-4xl border bg-muted/50 pr-3 pl-9 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Button variant="ghost" size="icon-sm" aria-label="Notifications" disabled>
          <HugeiconsIcon icon={Notification02Icon} />
        </Button>
        <Avatar className="ml-1 size-8">
          {userImage ? <AvatarImage src={userImage} alt="" /> : null}
          <AvatarFallback>{initials(userName)}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
