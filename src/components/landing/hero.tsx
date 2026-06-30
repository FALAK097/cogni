import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, CheckCircle, Lock, Play, Send, Sparkles } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-background pt-36 pb-20 md:pt-44 md:pb-32">
      {/* Layered backgrounds */}
      <div className="pointer-events-none absolute inset-0 -z-20">
        {/* Soft radial glow top center */}
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/8 blur-[120px]" />
        {/* Bottom right warm accent */}
        <div className="absolute -bottom-32 right-[-10%] h-[400px] w-[500px] rounded-full bg-violet-500/6 blur-[100px]" />
      </div>

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.025] dark:opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="mx-auto max-w-7xl px-5">
        {/* Eyebrow badge */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/6 px-4 py-1.5 text-xs font-medium text-primary">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            Introducing Widget AI v2.0
          </div>
        </div>

        {/* Headline */}
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-balance text-5xl font-semibold tracking-[-0.03em] text-foreground sm:text-6xl md:text-7xl">
            Customer support{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent">
                that thinks
              </span>
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 6 Q75 1 150 6 Q225 11 300 6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-primary/30"
                  strokeLinecap="round"
                />
              </svg>
            </span>{" "}
            for you.
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Deploy an AI support agent trained on your knowledge base in minutes. Resolve 70% of
            tickets instantly — with seamless human handoff when it counts.
          </p>
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/sign-up"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 rounded-xl px-8 text-base shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5",
            )}
          >
            Start for free
            <ArrowRight className="ml-2 size-4" />
          </Link>
          <button
            type="button"
            className="flex h-12 items-center gap-2 rounded-xl border border-border/70 bg-background px-8 text-base font-medium text-foreground transition-all hover:border-border hover:bg-muted/50 hover:-translate-y-0.5"
          >
            <Play className="size-4 text-muted-foreground" />
            Watch demo
          </button>
        </div>

        {/* Hero product mockup */}
        <div className="relative mx-auto mt-20 max-w-5xl">
          {/* Glow behind card */}
          <div className="absolute inset-x-[10%] -top-8 h-32 rounded-full bg-primary/15 blur-3xl" />

          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_32px_64px_rgba(0,0,0,0.1)] ring-1 ring-inset ring-white/10 dark:shadow-[0_32px_64px_rgba(0,0,0,0.4)]">
            {/* Mac-style top bar */}
            <div className="flex items-center gap-3 border-b border-border/50 bg-muted/30 px-5 py-3">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-red-400" />
                <div className="size-3 rounded-full bg-yellow-400" />
                <div className="size-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex flex-1 items-center justify-center">
                <div className="flex h-6 w-56 items-center gap-2 rounded-md border border-border/50 bg-background/50 px-3">
                  <Lock className="size-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">app.widget.ai/inbox</span>
                </div>
              </div>
            </div>

            {/* App layout */}
            <div className="flex h-[400px] sm:h-[480px]">
              {/* Sidebar */}
              <div className="hidden w-56 shrink-0 flex-col border-r border-border/50 bg-muted/20 p-3 sm:flex">
                <div className="mb-4 flex items-center gap-2 px-2 py-1">
                  <div className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-foreground">Acme Support</span>
                </div>
                {["Inbox", "AI Agents", "Knowledge", "Analytics"].map((item, i) => (
                  <div
                    key={item}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium",
                      i === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground",
                    )}
                  >
                    <div
                      className={cn(
                        "size-1.5 rounded-full",
                        i === 0 ? "bg-primary" : "bg-muted-foreground/40",
                      )}
                    />
                    {item}
                    {i === 0 && (
                      <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        3
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Inbox list */}
              <div className="hidden w-52 shrink-0 flex-col border-r border-border/50 p-3 md:flex">
                <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Open
                </p>
                {[
                  { name: "Sarah K.", msg: "Can I change my plan?", time: "2m", dot: "emerald" },
                  { name: "James R.", msg: "How to export data?", time: "8m", dot: "amber" },
                  { name: "Priya M.", msg: "Integration with Slack", time: "15m", dot: "blue" },
                ].map((item) => (
                  <div
                    key={item.name}
                    className={cn(
                      "mb-1 cursor-pointer rounded-xl p-2.5",
                      item.name === "Sarah K." ? "bg-accent/60" : "hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn("mt-0.5 size-2 shrink-0 rounded-full", {
                          "bg-emerald-500": item.dot === "emerald",
                          "bg-amber-500": item.dot === "amber",
                          "bg-blue-500": item.dot === "blue",
                        })}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">{item.name}</span>
                          <span className="text-[10px] text-muted-foreground">{item.time}</span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {item.msg}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat view */}
              <div className="flex flex-1 flex-col">
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b border-border/50 px-5 py-3">
                  <div className="size-8 overflow-hidden rounded-full bg-muted">
                    <Image
                      src="https://i.pravatar.cc/40?img=11"
                      alt=""
                      width={32}
                      height={32}
                      className="size-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Sarah K.</p>
                    <p className="text-xs text-muted-foreground">sarah@acmecorp.com</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400">
                      AI Handling
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 space-y-4 overflow-auto p-5">
                  <div className="flex gap-3">
                    <div className="size-7 shrink-0 overflow-hidden rounded-full bg-muted">
                      <Image
                        src="https://i.pravatar.cc/40?img=11"
                        alt=""
                        width={28}
                        height={28}
                        className="size-full object-cover"
                      />
                    </div>
                    <div className="max-w-[70%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5">
                      <p className="text-sm text-foreground">
                        Can I change my plan before the next billing date?
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row-reverse gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Sparkles className="size-3" />
                    </div>
                    <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5">
                      <p className="text-sm text-primary-foreground">
                        Yes! Plan changes take effect immediately, and unused time is credited
                        automatically. Would you like me to open your billing settings?
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-10">
                    <div className="size-1.5 rounded-full bg-muted-foreground/30" />
                    <p className="text-[11px] text-muted-foreground">
                      Answered from{" "}
                      <span className="font-medium text-foreground">Billing Policy</span> · updated
                      2 days ago
                    </p>
                  </div>
                </div>

                {/* Input */}
                <div className="border-t border-border/50 p-4">
                  <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5">
                    <p className="flex-1 text-sm text-muted-foreground">
                      Reply or let AI handle it…
                    </p>
                    <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Send className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating stats */}
          <div className="absolute -bottom-5 -left-4 hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 sm:block">
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/90 px-4 py-3 shadow-xl backdrop-blur-xl">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">94% resolved by AI</p>
                <p className="text-[11px] text-muted-foreground">avg. 8 second response</p>
              </div>
            </div>
          </div>

          <div className="absolute -right-4 -top-5 hidden animate-in fade-in slide-in-from-top-4 duration-700 delay-300 sm:block">
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/90 px-4 py-3 shadow-xl backdrop-blur-xl">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BarChart3 className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">↑ 3.2× ticket volume</p>
                <p className="text-[11px] text-muted-foreground">handled automatically</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
