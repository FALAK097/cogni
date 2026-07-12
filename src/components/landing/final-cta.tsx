"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@/components/icons";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

/* ─── Decorative nature-themed elements ─────────────────────────────── */

function CloudDecor({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 40"
      fill="none"
      className={cn("pointer-events-none select-none float-gentle", className)}
      aria-hidden="true"
    >
      <ellipse cx="60" cy="24" rx="50" ry="14" fill="currentColor" fillOpacity="0.06" />
      <ellipse cx="40" cy="18" rx="28" ry="16" fill="currentColor" fillOpacity="0.08" />
      <ellipse cx="80" cy="20" rx="24" ry="12" fill="currentColor" fillOpacity="0.06" />
    </svg>
  );
}

export function FinalCta() {
  const { ref, revealed } = useReveal({ threshold: 0.15 });

  return (
    <section className="relative isolate overflow-hidden">
      {/* Landscape background — bookend with the hero */}
      <Image
        src="/assets/widget-bg.png"
        alt=""
        fill
        unoptimized
        className="-z-20 object-cover object-center"
        aria-hidden
      />
      {/* Dark overlay */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gray-900/55" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.35)_100%)]" />

      {/* Floating Cloud decoration */}
      <CloudDecor className="absolute left-10 top-16 w-36 text-white" />
      <CloudDecor className="absolute right-12 bottom-16 w-44 text-white" />

      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32 md:py-44 lg:px-12">
        <div
          ref={ref}
          className={cn(
            "mx-auto max-w-2xl text-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
            revealed ? "reveal-up" : "opacity-0",
          )}
        >
          <h2 className="text-4xl font-bold tracking-[-0.03em] text-white text-balance sm:text-5xl md:text-6xl">
            Start supporting customers
            <br />
            <span className="text-blue-200">in minutes.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-white/70">
            Join 1,200+ modern teams delivering exceptional support at scale. Free to start.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-in"
              className="flex h-12 items-center gap-2 rounded-xl bg-primary px-8 text-[15px] font-semibold text-white shadow-lg shadow-primary/40 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/50 active:scale-[0.97] press-scale"
            >
              Get started free
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="mailto:hi@falakgala.dev"
              className="flex h-12 items-center rounded-xl border border-white/30 bg-white/10 px-8 text-[15px] font-medium text-white backdrop-blur-sm transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:bg-white/20 active:scale-[0.97] press-scale"
            >
              Talk to us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
