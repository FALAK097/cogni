"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button-variants";
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
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        // Trigger when the top 30% of the section crosses the viewport center
        { rootMargin: "-20% 0px -65% 0px", threshold: 0 },
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [sectionIds]);

  return active;
}

const SECTION_IDS = NAV_LINKS.map((l) => l.section);

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const activeSection = useActiveSection(SECTION_IDS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-5">
      <nav
        className={cn(
          "flex w-full max-w-5xl items-center gap-6 rounded-2xl border px-5 py-2.5 transition-all duration-300",
          scrolled
            ? "border-white/60 bg-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.10)] backdrop-blur-xl"
            : "border-white/40 bg-white/60 backdrop-blur-md",
        )}
      >
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <Sparkles className="size-4" />
          </span>
          <span className="text-[15px] tracking-tight text-gray-900">widget</span>
        </Link>

        {/* Nav links with active highlight */}
        <div className="hidden flex-1 items-center gap-1 md:flex">
          {NAV_LINKS.map(({ label, href, section }) => {
            const isActive = activeSection === section;
            return (
              <a
                key={label}
                href={href}
                className={cn(
                  "relative rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary/8 text-primary"
                    : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900",
                )}
              >
                {label}
                {/* Active bottom indicator */}
                {isActive && (
                  <span className="absolute inset-x-3 -bottom-[11px] h-0.5 rounded-full bg-primary" />
                )}
              </a>
            );
          })}
        </div>

        {/* CTA */}
        <div className="flex items-center">
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ size: "sm" }),
              "h-9 rounded-xl px-5 text-sm shadow-sm shadow-primary/20",
            )}
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}
