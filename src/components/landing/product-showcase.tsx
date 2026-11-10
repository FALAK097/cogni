import { CheckmarkBadge01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

const showcases = [
  {
    title: "Agent",
    description: "Build, test, and deploy an AI support agent grounded in your trusted sources.",
    bullets: [
      "Add website, text, and file sources",
      "Test answers before launch",
      "Customize the chat experience",
      "Deploy your support widget",
    ],
    imageClass: "bg-blue-50/50 dark:bg-blue-950/20",
    illustration: (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="relative h-64 w-48 rounded-[2rem] border-8 border-foreground/5 bg-background shadow-2xl">
          <div className="absolute top-4 left-1/2 h-2 w-16 -translate-x-1/2 rounded-full bg-foreground/10" />
          <div className="mt-8 p-4 space-y-4">
            <div className="h-10 w-3/4 rounded-xl bg-primary/20" />
            <div className="h-20 w-full rounded-xl bg-muted" />
            <div className="h-8 w-2/3 rounded-full bg-primary" />
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Inbox",
    description: "One unified inbox where humans and AI work together seamlessly.",
    bullets: [
      "Shared inbox view",
      "Full chat history",
      "Rich customer profiles",
      "AI suggested responses",
    ],
    imageClass: "bg-purple-50/50 dark:bg-purple-950/20",
    illustration: (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="flex w-full max-w-md overflow-hidden rounded-2xl border bg-background shadow-xl h-64">
          <div className="w-1/3 border-r bg-muted/30 p-2 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg bg-background p-2 shadow-sm space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="h-2 w-12 rounded bg-muted-foreground/30" />
                  <div className="h-1.5 w-6 rounded bg-muted-foreground/20" />
                </div>
                <div className="h-1.5 w-full rounded bg-muted-foreground/20" />
              </div>
            ))}
          </div>
          <div className="flex-1 flex flex-col">
            <div className="border-b p-3 flex items-center gap-2">
              <div className="size-6 rounded-full bg-muted" />
              <div className="h-2 w-20 rounded bg-muted-foreground/30" />
            </div>
            <div className="flex-1 p-3 space-y-3">
              <div className="h-6 w-2/3 rounded-xl rounded-tl-sm bg-muted" />
              <div className="ml-auto h-6 w-3/4 rounded-xl rounded-tr-sm bg-primary/20" />
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Insights",
    description: "Understand your support performance and identify knowledge gaps instantly.",
    bullets: [
      "Resolution rate tracking",
      "Conversation volume trends",
      "Topic clustering",
      "Agent performance metrics",
    ],
    imageClass: "bg-orange-50/50 dark:bg-orange-950/20",
    illustration: (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="w-full max-w-md rounded-2xl border bg-background shadow-xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-card p-3">
              <div className="text-xs text-muted-foreground mb-1">Resolution Rate</div>
              <div className="text-2xl font-bold text-foreground">94%</div>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <div className="text-xs text-muted-foreground mb-1">Avg Response</div>
              <div className="text-2xl font-bold text-foreground">12s</div>
            </div>
          </div>
          <div className="h-32 w-full rounded-xl border bg-muted/20 p-3 flex items-end gap-2">
            {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-primary/40 transition-colors hover:bg-primary/60"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

export function ProductShowcase() {
  return (
    <section className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col gap-24 md:gap-32">
          {showcases.map((showcase, index) => (
            <div
              key={showcase.title}
              className={cn(
                "grid gap-12 md:grid-cols-2 md:items-center",
                index % 2 !== 0 && "md:grid-cols-[1fr_1fr]",
              )}
            >
              <div
                className={cn(
                  "relative aspect-square overflow-hidden rounded-3xl border md:aspect-[4/3]",
                  showcase.imageClass,
                  index % 2 !== 0 && "md:order-last",
                )}
              >
                {showcase.illustration}
              </div>
              <div className="max-w-xl">
                <h3 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                  {showcase.title}
                </h3>
                <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                  {showcase.description}
                </p>
                <ul className="mt-8 space-y-4">
                  {showcase.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-3">
                      <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <HugeiconsIcon icon={CheckmarkBadge01Icon} className="size-3.5" />
                      </div>
                      <span className="text-foreground">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
