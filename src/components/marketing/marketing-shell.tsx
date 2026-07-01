"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Menu, Sparkles } from "@/components/icons";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Integrations", href: "/#integrations" },
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms" },
] as const;

type MarketingShellProps = {
  children: ReactNode;
};

function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-1 md:flex">
        {NAV_LINKS.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Link
          href="/sign-in"
          className="hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/20 transition-all hover:-translate-y-0.5 sm:inline-block"
        >
          Get started
        </Link>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition-colors hover:bg-gray-100 md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(100vw-2rem,320px)] px-0" title="Navigation">
            <SheetHeader className="border-b border-gray-100 px-5 pb-4">
              <SheetTitle className="flex items-center gap-2.5 text-left">
                <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-white">
                  <Sparkles className="size-4" />
                </span>
                widget
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-3 py-4">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-gray-100 px-5 py-4">
              <Link
                href="/sign-in"
                onClick={() => setMobileOpen(false)}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white shadow-sm shadow-primary/20"
              >
                Get started
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

export function MarketingShell({ children }: MarketingShellProps) {
  return (
    <div className="light min-h-svh bg-white text-gray-900">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-5 sm:px-8 lg:px-12">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-primary/30">
              <Sparkles className="size-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-gray-900">widget</span>
          </Link>
          <MarketingNav />
        </div>
      </header>

      <main>{children}</main>

      {/* Footer - light, consistent with landing page */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col items-start justify-between gap-8 py-12 sm:flex-row sm:items-center">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-primary/30">
                <Sparkles className="size-4" />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-gray-900">widget</span>
            </Link>
            <nav className="flex flex-wrap gap-x-7 gap-y-2">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="border-t border-gray-100 py-6">
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} Widget Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
