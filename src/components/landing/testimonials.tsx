import Image from "next/image";

const testimonials = [
  {
    quote:
      "The AI agent resolved 60% of our Tier-1 tickets in week one. It's like having an always-on support engineer who never sleeps. The human handoff is genuinely seamless.",
    name: "Sarah Jenkins",
    role: "Head of Customer Success",
    company: "Acme Corp",
    avatar: "https://i.pravatar.cc/80?img=47",
    metric: "60% ticket deflection",
  },
  {
    quote:
      "Connecting our documentation took 5 minutes. Now customers get instant, accurate answers instead of waiting 24 hours. Our CSAT went from 3.8 to 4.9 in a month.",
    name: "Michael Chang",
    role: "Product Manager",
    company: "Nexus",
    avatar: "https://i.pravatar.cc/80?img=11",
    metric: "4.9 CSAT score",
  },
  {
    quote:
      "The analytics dashboard revealed exactly what our users were confused about. We redesigned our onboarding based entirely on conversation patterns. Incredible insight.",
    name: "Elena Rodriguez",
    role: "Founder & CEO",
    company: "Lumina",
    avatar: "https://i.pravatar.cc/80?img=32",
    metric: "40% lower churn",
  },
];

export function Testimonials() {
  return (
    <section className="border-y border-border/40 bg-muted/10 py-28 md:py-36">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Testimonials
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Loved by forward-thinking teams
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="relative flex flex-col rounded-2xl border border-border/60 bg-card p-8 shadow-sm transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-md hover:shadow-black/5"
            >
              {/* Stars */}
              <div className="mb-5 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} className="size-4 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" />
                  </svg>
                ))}
              </div>

              <blockquote className="flex-1 text-[15px] leading-relaxed text-foreground">
                "{t.quote}"
              </blockquote>

              <div className="mt-8 flex items-center gap-4 border-t border-border/40 pt-5">
                <Image
                  src={t.avatar}
                  alt={t.name}
                  width={44}
                  height={44}
                  className="size-11 rounded-full object-cover ring-2 ring-border/50"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.role}, {t.company}
                  </p>
                </div>
                <div className="ml-auto rounded-lg bg-primary/8 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {t.metric}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
