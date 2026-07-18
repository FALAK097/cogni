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

/** Track which section is currently in the viewport */
function useActiveSection(sectionIds: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries.find((entry) => entry.isIntersecting);
        if (visibleSection) setActive(visibleSection.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 },
    );

    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return active;
}

const SECTION_IDS = NAV_LINKS.map((l) => l.section);

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeSection = useActiveSection(SECTION_IDS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:px-5">
      <nav
        className={cn(
          "flex w-full max-w-5xl items-center gap-3 rounded-2xl border px-4 py-2.5 transition-[background-color,border-color,box-shadow] duration-300 sm:gap-6 sm:px-5",
          scrolled
            ? "border-white/60 bg-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.10)] backdrop-blur-xl"
            : "border-white/40 bg-white/60 backdrop-blur-md",
        )}
      >
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 font-semibold">
          <ThemeLogo showWordmark wordmarkClassName="text-gray-900" />
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
                    : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900",
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
              "hidden h-9 rounded-xl px-5 text-sm shadow-sm shadow-primary/20 md:inline-flex",
            )}
          >
            Get started
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="inline-flex size-11 items-center justify-center rounded-xl border border-gray-200/80 bg-white/80 text-gray-700 transition-colors hover:bg-white md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[min(100vw-2rem,320px)] px-0"
              title="Navigation"
            >
              <SheetHeader className="border-b border-gray-100 px-5 pb-4">
                <SheetTitle className="flex items-center gap-2.5 text-left">
                  <ThemeLogo showWordmark wordmarkClassName="text-gray-900" />
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
                        isActive ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-100",
                      )}
                    >
                      {label}
                    </a>
                  );
                })}
              </nav>
              <div className="mt-auto border-t border-gray-100 px-5 py-4">
                <Link
                  href="/sign-in"
                  onClick={() => setMobileOpen(false)}
                  className={cn(buttonVariants(), "h-11 w-full rounded-xl")}
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
