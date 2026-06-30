import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-svh overflow-hidden bg-background lg:grid-cols-2">
      <div className="flex h-full flex-col px-6 py-8 sm:px-10 lg:px-16">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </span>
          <span className="tracking-tight text-foreground">widget</span>
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>

        <p className="shrink-0 pb-2 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Widget Inc. All rights reserved.
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-muted/30 lg:flex lg:flex-col lg:justify-center">
        <div className="absolute -top-24 -right-24 h-[500px] w-[500px] rounded-full bg-primary/15 blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[80px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-md px-12">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            AI support
          </p>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
            Customer support that knows when to answer — and when to hand off.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Deploy a branded widget, ground AI in your knowledge base, and keep every conversation
            in one inbox.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { label: "Ticket deflection", value: "94%" },
              { label: "Avg. response", value: "8s" },
              { label: "Setup time", value: "5 min" },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-border/50 bg-background/60 p-4 backdrop-blur-sm"
              >
                <p className="text-xl font-bold text-foreground">{metric.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
