import Link from "next/link";
import { ArrowRight, CheckCircle } from "@/components/icons";

export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-background py-32 md:py-48">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute right-[10%] bottom-0 h-[300px] w-[300px] rounded-full bg-violet-500/8 blur-[80px]" />
        <div className="absolute top-0 left-[5%] h-[200px] w-[300px] rounded-full bg-primary/5 blur-[60px]" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="mx-auto max-w-4xl px-5 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/6 px-4 py-1.5 text-xs font-medium text-primary">
          <CheckCircle className="size-3.5" />
          No credit card required
        </div>
        <h2 className="text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl md:text-6xl">
          Start supporting customers
          <span className="block bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
            in minutes.
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Join 1,200+ modern teams delivering exceptional support at scale. Try it free today, no
          setup fees.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/sign-up"
            className="flex h-12 items-center gap-2 rounded-xl bg-primary px-8 text-base font-medium text-primary-foreground shadow-md shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30"
          >
            Get started free
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/contact"
            className="flex h-12 items-center rounded-xl border border-border/70 bg-background px-8 text-base font-medium text-foreground transition-all hover:-translate-y-0.5 hover:border-border hover:bg-muted/50"
          >
            Contact us
          </Link>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          14-day free trial · No credit card · Cancel anytime
        </p>
      </div>
    </section>
  );
}
