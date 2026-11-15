"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider, useTheme } from "next-themes";
import { Agentation } from "agentation";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getQueryClient } from "@/lib/query-client";

const DASHBOARD_ROUTE_PREFIXES = [
  "/agent",
  "/inbox",
  "/insights",
  "/settings",
  "/dashboard",
  "/playground",
  "/conversations",
  "/knowledge-base",
  "/integrations",
  "/docs",
] as const;

function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function DocumentThemeGuard() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (isDashboardPath(pathname)) {
      if (!resolvedTheme) return;
      const isDark = resolvedTheme === "dark";
      root.classList.toggle("dark", isDark);
      root.classList.toggle("light", !isDark);
      root.style.colorScheme = isDark ? "dark" : "light";
      return;
    }
    root.classList.remove("dark", "light");
    root.style.colorScheme = "light";
  }, [pathname, resolvedTheme]);

  return null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <NuqsAdapter>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <DocumentThemeGuard />
            {children}
          </TooltipProvider>
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === "development" && <Agentation />}
    </NuqsAdapter>
  );
}
