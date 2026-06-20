"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Toggle theme" />}
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        <HugeiconsIcon icon={isDark ? Sun03Icon : Moon02Icon} />
      </TooltipTrigger>
      <TooltipContent>{isDark ? "Use light theme" : "Use dark theme"}</TooltipContent>
    </Tooltip>
  );
}
