import Link from "next/link";
import Image from "next/image";
import { ThemeLogo } from "@/components/theme-logo";

const COPYRIGHT_YEAR = new Date().getUTCFullYear();

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="light grid min-h-svh bg-white text-gray-900 lg:grid-cols-2">
      {/* ── Left: form panel ── */}
      <div className="flex min-h-svh flex-col gap-8 bg-white px-6 py-8 sm:px-10 lg:px-16">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <ThemeLogo showWordmark wordmarkClassName="text-gray-900" />
        </Link>

        {/* Centered form */}
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>

        {/* Copyright */}
        <p className="shrink-0 pb-2 text-center text-xs text-gray-600">
          &copy; {COPYRIGHT_YEAR} cogni Inc. All rights reserved.
        </p>
      </div>

      {/* ── Right: marketing panel ── */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center">
        {/* Background landscape image with dark overlay */}
        <Image
          src="/assets/widget-bg.png"
          alt=""
          fill
          unoptimized
          className="object-cover object-center"
          priority
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-indigo-900/70" />

        {/* Subtle dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-md px-12">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
            AI Support
          </p>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            Customer support that knows when to answer and when to hand off.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-indigo-200/80">
            Deploy a branded widget, ground AI in your knowledge base, and keep every conversation
            in one inbox.
          </p>

          {/* Metric cards */}
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Knowledge", value: "Grounded AI" },
              { label: "Conversations", value: "Shared inbox" },
              { label: "Widget", value: "Your brand" },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm"
              >
                <p className="text-xl font-bold text-white">{metric.value}</p>
                <p className="mt-0.5 text-[11px] text-indigo-300">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
