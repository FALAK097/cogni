"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "@/components/icons";
import { ThemeLogo } from "@/components/theme-logo";
import { buttonVariants } from "@/components/ui/button-variants";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Features", href: "#features", section: "features" },
  { label: "How It Works", href: "#how-it-works", section: "how-it-works" },
  { label: "Integrations", href: "#integrations", section: "integrations" },
  { label: "FAQ", href: "#faq", section: "faq" },
] as const;

const SECTION_IDS = NAV_LINKS.map((link) => link.section);

function useActiveSection(sectionIds: readonly string[]) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries.find((entry) => entry.isIntersecting);
        if (visibleSection) setActiveSection(visibleSection.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 },
    );

    for (const sectionId of sectionIds) {
      const section = document.getElementById(sectionId);
      if (section) observer.observe(section);
    }

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeSection;
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeSection = useActiveSection(SECTION_IDS);

  return (
    <header className="sticky inset-x-0 top-0 z-50 border-b border-border bg-background/95">
      <nav className="mx-auto flex min-h-20 w-full max-w-[1120px] items-center gap-6 px-6 sm:px-10">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 font-semibold">
          <ThemeLogo showWordmark wordmarkClassName="text-foreground" />
        </Link>

        {/* Nav links with active highlight — desktop */}
        <div className="hidden flex-1 items-center gap-1 md:flex">
          {NAV_LINKS.map(({ label, href, section }) => {
            const isActive = activeSection === section;
            return (
              <a
                key={label}
                href={href}
                className={cn(
                  "relative flex min-h-10 items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "bg-primary/8 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
                {isActive && (
                  <span className="absolute inset-x-3 -bottom-[11px] h-0.5 rounded-full bg-primary" />
                )}
              </a>
            );
          })}
        </div>

        {/* CTA + mobile menu */}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ size: "sm" }),
              "hidden h-10 px-5 text-sm md:inline-flex",
            )}
          >
            Get started
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="inline-flex size-11 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[min(100vw-2rem,320px)] px-0"
              title="Navigation"
            >
              <SheetHeader className="border-b border-border px-5 pb-4">
                <SheetTitle className="flex items-center gap-2.5 text-left">
                  <ThemeLogo showWordmark wordmarkClassName="text-foreground" />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-3 py-4">
                {NAV_LINKS.map(({ label, href, section }) => {
                  const isActive = activeSection === section;
                  return (
                    <a
                      key={label}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "rounded-xl px-4 py-3 text-base font-medium transition-colors",
                        isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
                      )}
                    >
                      {label}
                    </a>
                  );
                })}
              </nav>
              <div className="mt-auto border-t border-border px-5 py-4">
                <Link
                  href="/sign-in"
                  onClick={() => setMobileOpen(false)}
                  className={cn(buttonVariants(), "h-11 w-full")}
                >
                  Get started
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
