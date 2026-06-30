import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { cn } from "@/lib/utils";

const steps = [
  {
    num: "01",
    title: "Connect your website",
    description: "Paste a single script tag. The widget appears live on your site immediately.",
    color: "text-primary",
    bg: "bg-primary/8 dark:bg-primary/12",
    border: "border-primary/20",
  },
  {
    num: "02",
    title: "Import your knowledge",
    description: "Sync documentation, Help Center, PDFs, and Notion pages with one click.",
    color: "text-violet-500",
    bg: "bg-violet-500/8 dark:bg-violet-500/12",
    border: "border-violet-500/20",
  },
  {
    num: "03",
    title: "Customize the widget",
    description: "Match your brand exactly — colors, fonts, avatar, and conversation starters.",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/8 dark:bg-emerald-500/12",
    border: "border-emerald-500/20",
  },
  {
    num: "04",
    title: "Go live instantly",
    description: "Your AI agent handles questions 24/7. Your team steps in only when it matters.",
    color: "text-orange-500",
    bg: "bg-orange-500/8 dark:bg-orange-500/12",
    border: "border-orange-500/20",
  },
];

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden border-y border-border/40 bg-muted/20 py-28 md:py-36">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute bottom-0 left-1/2 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Setup
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Live in under 5 minutes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No engineers, no complex configurations, no waiting.
          </p>
        </div>

        {/* Desktop: horizontal steps with connector lines */}
        <ol className="mx-auto hidden max-w-5xl md:flex">
          {steps.map((step, i) => (
            <li key={step.num} className="flex flex-1 flex-col">
              <div className="flex items-center">
                <div
                  aria-hidden
                  className={cn("h-px flex-1", i === 0 ? "bg-transparent" : "bg-border")}
                />
                <div
                  className={cn(
                    "relative z-10 flex size-12 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold",
                    step.color,
                    step.bg,
                    step.border,
                  )}
                >
                  {step.num}
                </div>
                <div
                  aria-hidden
                  className={cn(
                    "h-px flex-1",
                    i === steps.length - 1 ? "bg-transparent" : "bg-border",
                  )}
                />
              </div>

              <div className="mt-6 px-3 text-center">
                <h3 className="mb-2 text-base font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Mobile: vertical timeline */}
        <ol className="mx-auto max-w-lg space-y-0 md:hidden">
          {steps.map((step, i) => (
            <li key={step.num} className="relative flex gap-5 pb-10 last:pb-0">
              {i < steps.length - 1 && (
                <div
                  aria-hidden
                  className="absolute top-12 left-6 h-[calc(100%-3rem)] w-px -translate-x-1/2 bg-border"
                />
              )}

              <div
                className={cn(
                  "relative z-10 flex size-12 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold",
                  step.color,
                  step.bg,
                  step.border,
                )}
              >
                {step.num}
              </div>

              <div className="min-w-0 pt-1">
                <h3 className="mb-1.5 text-base font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-14 flex justify-center">
          <Link
            href="/sign-up"
            className="flex h-11 items-center gap-2 rounded-xl bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/30"
          >
            Start building
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
