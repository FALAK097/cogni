"use client";

import Link from "next/link";
import { Sparkles } from "@/components/icons";
import { cn } from "@/lib/utils";

/* ─── Decorative nature-themed elements ─────────────────────────────── */

function LeafDecor({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("pointer-events-none select-none sway", className)}
      aria-hidden="true"
      style={{ width: "100%", height: "100%" }}
    >
      <path
        d="M16 2C10 8 4 16 8 24c2 4 6 6 8 6s6-2 8-6c4-8-2-16-8-22z"
        fill="currentColor"
        fillOpacity="0.05"
      />
      <path
        d="M16 6v22M12 10c2 2 4 4 4 8M20 10c-2 2-4 4-4 8"
        stroke="currentColor"
        strokeOpacity="0.08"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const FOOTER_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Integrations", href: "#integrations" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms" },
] as const;

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-gray-100 bg-white">
      {/* Decorative leaf */}
      <div className="absolute right-6 bottom-4 size-16 text-emerald-500 opacity-40">
        <LeafDecor />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 relative z-10">
        {/* Main row */}
        <div className="flex flex-col items-start justify-between gap-8 py-12 sm:flex-row sm:items-center">
          {/* Brand */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 hover:scale-[1.02] transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-primary/30">
              <Sparkles className="size-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-gray-900">widget</span>
          </Link>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-x-7 gap-y-2">
            {FOOTER_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-sm text-gray-500 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-gray-900 hover:-translate-y-0.5"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        {/* Bottom divider + copyright */}
        <div className="border-t border-gray-100 py-6">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Widget Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
