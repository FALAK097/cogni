import Link from "next/link";
import { Sparkles } from "@/components/icons";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border/40 bg-background">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-5">
        <div className="flex flex-col items-center justify-between gap-6 py-12 sm:flex-row">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
              <Sparkles className="size-4" />
            </span>
            <span className="text-[15px] tracking-tight text-foreground">widget</span>
          </Link>

          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Widget Inc. All rights reserved.
          </p>

          <div className="flex items-center gap-5">
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
              Contact
            </Link>
            <Link
              href="/privacy-policy"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
