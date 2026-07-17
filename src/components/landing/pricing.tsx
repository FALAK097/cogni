import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "$49",
    desc: "For small teams getting started.",
    features: [
      "Up to 1,000 conversations/mo",
      "1 AI Agent",
      "Core integrations",
      "Email support",
      "Basic analytics",
    ],
    cta: "Get started",
    href: "/sign-up",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$149",
    desc: "For growing teams at scale.",
    features: [
      "Up to 10,000 conversations/mo",
      "Unlimited AI Agents",
      "All integrations",
      "Priority support",
      "Advanced analytics & reporting",
      "Custom widget branding",
    ],
    cta: "Start free trial",
    href: "/sign-up",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "For large orgs with complex needs.",
    features: [
      "Unlimited conversations",
      "Custom AI training",
      "Dedicated success manager",
      "SSO & SAML",
      "SLA guarantees",
      "On-premise option",
    ],
    cta: "Contact sales",
    href: "/contact",
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-background py-28 md:py-36">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Pricing
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="text-pretty mt-4 text-lg text-muted-foreground">
            Start for free, scale as your volume grows. No hidden fees.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition-[border-color,box-shadow] duration-200 ${
                plan.highlight
                  ? "border-primary/40 bg-primary shadow-xl shadow-primary/10"
                  : "border-border/60 bg-card hover:border-border hover:shadow-md hover:shadow-black/5"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-background px-4 py-1 text-xs font-semibold text-primary ring-1 ring-primary/30">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3
                  className={`text-lg font-semibold ${plan.highlight ? "text-primary-foreground" : "text-foreground"}`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`mt-1 text-sm ${plan.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                >
                  {plan.desc}
                </p>
              </div>

              <div className="mb-8 flex items-baseline gap-1">
                <span
                  className={`text-4xl font-bold tracking-tight tabular-nums ${plan.highlight ? "text-primary-foreground" : "text-foreground"}`}
                >
                  {plan.price}
                </span>
                {plan.price !== "Custom" && (
                  <span
                    className={`text-sm ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}
                  >
                    /month
                  </span>
                )}
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <svg
                      className={`mt-0.5 size-4 shrink-0 ${plan.highlight ? "text-primary-foreground/80" : "text-primary"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                    <span
                      className={`text-sm ${plan.highlight ? "text-primary-foreground/80" : "text-foreground/80"}`}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`flex h-11 items-center justify-center rounded-xl text-sm font-medium transition-[scale,background-color,border-color] duration-150 ease-out active:scale-[0.96] ${
                  plan.highlight
                    ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                    : "border border-border/70 bg-background hover:border-border hover:bg-muted/50"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
