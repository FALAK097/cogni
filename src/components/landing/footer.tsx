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
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-[1120px] px-6 sm:px-10">
        {/* Main row */}
        <div className="flex flex-col items-start justify-between gap-8 py-12 sm:flex-row sm:items-center">
          {/* Brand */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <ThemeLogo showWordmark wordmarkClassName="text-foreground" />
          </Link>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-x-7 gap-y-2">
            {FOOTER_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        {/* Bottom divider + copyright */}
        <div className="border-t border-border py-6">
          <p className="text-sm text-muted-foreground">
            &copy; {COPYRIGHT_YEAR} cogni Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
