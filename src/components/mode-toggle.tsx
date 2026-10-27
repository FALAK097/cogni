"use client";

import * as React from "react";
import { Sun, Moon } from "@/components/icons";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ModeToggle() {
  const { setTheme, theme } = useTheme();
  const button = (
    <Button
      className="relative size-9 shrink-0 hover:bg-transparent"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
      <span className="sr-only">Switch Theme</span>
    </Button>
  );

  return (
    <TooltipProvider delay={100}>
      <Tooltip>
        <TooltipTrigger render={button} />
        <TooltipContent side="bottom">Switch Theme</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
