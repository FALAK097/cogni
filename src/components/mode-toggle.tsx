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
      className="size-8 shrink-0"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4 rotate-90 scale-0 transition-transform ease-in-out duration-500 dark:rotate-0 dark:scale-100" />
      <Moon className="absolute size-4 rotate-0 scale-100 transition-transform ease-in-out duration-500 dark:-rotate-90 dark:scale-0" />
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
