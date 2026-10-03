import Link from "next/link";
import { ThemeLogo } from "@/components/theme-logo";

const COPYRIGHT_YEAR = new Date().getUTCFullYear();

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
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        {/* Main row */}
        <div className="flex flex-col items-start justify-between gap-8 py-12 sm:flex-row sm:items-center">
          {/* Brand */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <ThemeLogo showWordmark wordmarkClassName="text-gray-900" />
          </Link>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-x-7 gap-y-2">
            {FOOTER_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-sm text-gray-500 transition-colors duration-150 hover:text-gray-900"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        {/* Bottom divider + copyright */}
        <div className="border-t border-gray-100 py-6">
          <p className="text-sm text-gray-400">
            &copy; {COPYRIGHT_YEAR} cogni Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
