"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { LogOut } from "@/components/icons";

import { AvatarDialog } from "@/components/avatar-dialog";
import { ModeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/hooks/use-auth";

type UserNavProps = {
  userData: { avatar?: string; name: string; email?: string };
  trigger?: ReactElement;
  isSidebarOpen?: boolean;
};

export function UserNav({ userData, trigger, isSidebarOpen }: UserNavProps) {
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  const logout = useLogout();
  const currentAvatar = avatarOverride ?? userData.avatar;

  const handleAvatarUpdate = (newAvatar: string) => {
    setAvatarOverride(newAvatar);
  };

  const handleSignOut = () => {
    logout.mutate();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          // Use `render` so the trigger does not wrap our <Button> (avoids nested <button> hydration errors).
          render={
            trigger ?? (
              <Button variant="outline" className="relative w-8 h-8 rounded-full">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={userData.avatar} alt={userData.name} />
                  <AvatarFallback>{userData.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            )
          }
        />

        <DropdownMenuContent className="w-60" align="end">
          <DropdownMenuLabel className="py-3 font-normal">
            <div className="flex gap-2 justify-between items-center">
              <div className="flex gap-3 items-center min-w-0">
                <button
                  type="button"
                  aria-label="Change profile photo"
                  title="Change profile photo"
                  onClick={() => setIsAvatarDialogOpen(true)}
                  className="flex-shrink-0 rounded-full transition-transform duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Avatar className="size-10">
                    <AvatarImage src={currentAvatar} alt="" />
                    <AvatarFallback>{userData.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </button>
                <div className="flex flex-col space-y-1.5 min-w-0">
                  <p className="text-sm font-medium leading-none truncate">{userData.name}</p>
                  <p className="text-xs leading-relaxed truncate text-muted-foreground">
                    {userData.email}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">{!isSidebarOpen && <ModeToggle />}</div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-500 cursor-pointer"
            onClick={() => {
              handleSignOut();
            }}
          >
            <LogOut className="mr-3 w-4 h-4 text-red-500" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AvatarDialog
        open={isAvatarDialogOpen}
        onOpenChange={setIsAvatarDialogOpen}
        currentAvatar={currentAvatar}
        onAvatarUpdate={handleAvatarUpdate}
      />
    </>
  );
}
