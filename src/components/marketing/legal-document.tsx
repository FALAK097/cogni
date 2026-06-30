import type { ReactNode } from "react";

import { MarketingShell } from "@/components/marketing/marketing-shell";

type LegalSection = {
  title: string;
  content: ReactNode;
};

type LegalDocumentProps = {
  title: string;
  description: string;
  effectiveDate: string;
  sections: LegalSection[];
};

export function LegalDocument({ title, description, effectiveDate, sections }: LegalDocumentProps) {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-5 py-16 md:py-20">
        <header className="mb-12 border-b border-border/40 pb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Legal
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{description}</p>
          <p className="mt-4 text-sm text-muted-foreground">Effective date: {effectiveDate}</p>
        </header>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-lg font-semibold text-foreground">{section.title}</h2>
              <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </article>
    </MarketingShell>
  );
}
