import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata = {
  title: "Contact",
  description: "Contact the cogni team.",
};

export default function ContactPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-2xl px-5 py-20 md:py-28">
        <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl">
          Contact us
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Questions about the product, billing, or a workspace? Email the team and we will get back
          to you.
        </p>
        <a
          href="mailto:hi@falakgala.dev"
          className="mt-8 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          hi@falakgala.dev
        </a>
      </section>
    </MarketingShell>
  );
}
