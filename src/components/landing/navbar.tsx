"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sparkles, Sun } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="size-9" />;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-muted-foreground backdrop-blur transition-all hover:border-border hover:bg-background hover:text-foreground"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="size-[15px]" /> : <Moon className="size-[15px]" />}
    </button>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-5">
      <nav
        className={cn(
          "flex w-full max-w-5xl items-center justify-between gap-6 rounded-2xl border px-5 py-2.5 transition-all duration-300",
          scrolled
            ? "border-border/80 bg-background/90 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl"
            : "border-border/40 bg-background/60 backdrop-blur-md",
        )}
      >
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <Sparkles className="size-4" />
          </span>
          <span className="text-[15px] tracking-tight text-foreground">widget</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/sign-in"
            className="hidden rounded-xl px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className={cn(
              buttonVariants({ size: "sm" }),
              "h-9 rounded-xl px-4 text-sm shadow-sm shadow-primary/20",
            )}
          >
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
}
