import { ContactForm } from "@/components/marketing/contact-form";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { Mail, MessageSquare } from "@/components/icons";

export const metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the widget team for product questions, support, and partnerships.",
};

export default function ContactPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-5xl px-5 py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
              Contact
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Contact us
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Have a question about widget, need help getting started, or want to talk about your
              support workflow? Send us a message and we&apos;ll get back to you within one business
              day.
            </p>

            <div className="mt-10 space-y-5">
              <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="size-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">General inquiries</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Product questions, demos, and account help
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Support teams</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tell us about your volume, integrations, and rollout timeline
                  </p>
                </div>
              </div>
            </div>
          </div>

          <ContactForm />
        </div>
      </div>
    </MarketingShell>
  );
}
