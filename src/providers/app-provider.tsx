"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "next-themes";
import { Agentation } from "agentation";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getQueryClient } from "@/lib/query-client";

const DASHBOARD_ROUTE_PREFIXES = [
  "/dashboard",
  "/playground",
  "/conversations",
  "/knowledge-base",
  "/integrations",
] as const;

function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function DocumentThemeGuard() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!isDashboardPath(pathname)) {
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.style.colorScheme = "light";
    }
  }, [pathname]);

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
