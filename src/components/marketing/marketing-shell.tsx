import Link from "next/link";
import type { ReactNode } from "react";
import { Sparkles } from "@/components/icons";

type MarketingShellProps = {
  children: ReactNode;
};

export function MarketingShell({ children }: MarketingShellProps) {
  const navLinks = [
    { label: "Features", href: "/#features" },
    { label: "Integrations", href: "/#integrations" },
    { label: "Privacy", href: "/privacy-policy" },
    { label: "Terms", href: "/terms" },
  ] as const;

  return (
    <div className="min-h-svh bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-primary/30">
              <Sparkles className="size-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-gray-900">widget</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link
            href="/sign-in"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/20 transition-all hover:-translate-y-0.5"
          >
            Get started
          </Link>
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
              {navLinks.map(({ label, href }) => (
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
