import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@/components/icons";

export function FinalCta() {
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

      <div className="mx-auto max-w-7xl px-5 py-32 sm:px-8 md:py-44 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
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
              className="flex h-12 items-center gap-2 rounded-xl bg-primary px-8 text-[15px] font-semibold text-white shadow-lg shadow-primary/40 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/50 active:scale-[0.98]"
            >
              Get started free
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="mailto:hi@falakgala.dev"
              className="flex h-12 items-center rounded-xl border border-white/30 bg-white/10 px-8 text-[15px] font-medium text-white backdrop-blur-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-white/20"
            >
              Talk to us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
