import { BarChart3, Bot, BookOpen, LinkIcon, MessageSquare, Users } from "@/components/icons";

const features = [
  {
    title: "AI Agent",
    desc: "Train on docs, websites and files. Resolves 70% of questions without a human.",
    color: "text-violet-500",
    bg: "bg-violet-500/8 dark:bg-violet-500/12",
    icon: Bot,
  },
  {
    title: "Human Handoff",
    desc: "Seamlessly escalate conversations to your team with full context preserved.",
    color: "text-blue-500",
    bg: "bg-blue-500/8 dark:bg-blue-500/12",
    icon: Users,
  },
  {
    title: "Knowledge Base",
    desc: "Ingest websites, PDFs and docs. Stays in sync automatically as your content changes.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/8 dark:bg-emerald-500/12",
    icon: BookOpen,
  },
  {
    title: "Integrations",
    desc: "Connect Gmail, Slack, HubSpot, Notion and 50+ tools with one click.",
    color: "text-orange-500",
    bg: "bg-orange-500/8 dark:bg-orange-500/12",
    icon: LinkIcon,
  },
  {
    title: "Analytics",
    desc: "Conversation insights, resolution metrics, and topic clustering in real time.",
    color: "text-rose-500",
    bg: "bg-rose-500/8 dark:bg-rose-500/12",
    icon: BarChart3,
  },
  {
    title: "Custom Widget",
    desc: "Beautiful, brandable chat widget. Your colors, fonts, avatar and conversation starters.",
    color: "text-pink-500",
    bg: "bg-pink-500/8 dark:bg-pink-500/12",
    icon: MessageSquare,
  },
];

export function Features() {
  return (
    <section id="features" className="bg-background py-28 md:py-36">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Platform
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Everything your support team needs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One platform to automate answers, manage conversations, and deliver insights.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-lg hover:shadow-black/5"
              >
                <div
                  className={`mb-5 inline-flex size-11 items-center justify-center rounded-xl ${feature.bg} ${feature.color}`}
                >
                  <Icon className="size-5" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                <div
                  className={`absolute right-6 bottom-0 left-6 h-px scale-x-0 rounded-full transition-transform duration-300 group-hover:scale-x-100 ${feature.color.replace("text-", "bg-")}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
