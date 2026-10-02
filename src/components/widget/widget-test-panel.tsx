import { BookOpen, CheckCircle2, MessageCircle } from "@/components/icons";

export type WidgetPreviewEvidence = {
  outcome: "answer" | "handoff";
  grounded: boolean;
  sources: { title: string }[];
};

function getHandoffTerms(value: string) {
  return value
    .split(/[\n,]+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

export function WidgetTestPanel({
  escalationKeywords,
  evidence,
}: {
  escalationKeywords: string;
  evidence: WidgetPreviewEvidence | null;
}) {
  const handoffTerms = getHandoffTerms(escalationKeywords);
  const visibleTerms = handoffTerms.slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h2 className="text-base font-semibold tracking-tight">Test your agent</h2>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Try a customer question in the preview, then check which knowledge sources the answer used
          or whether a handoff rule matched.
        </p>
      </header>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-3 text-sm leading-relaxed text-foreground">
        <span className="font-medium">Safe preview.</span> Test messages stay out of Inbox and
        Insights. External actions are disabled.
      </div>

      <ol className="space-y-3">
        <li className="flex items-start gap-3 rounded-lg border border-border/60 p-3.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
            1
          </span>
          <div>
            <p className="text-sm font-medium">Check a grounded answer</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Ask something your indexed sources can answer. The latest result will list the sources
              retrieved for that message.
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3 rounded-lg border border-border/60 p-3.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
            2
          </span>
          <div>
            <p className="text-sm font-medium">Check the no-evidence response</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Ask about something outside your sources and confirm the agent says when it does not
              know.
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3 rounded-lg border border-border/60 p-3.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
            3
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">Check human handoff</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {visibleTerms.length > 0
                ? "Use a configured handoff term in your message."
                : "No handoff terms are configured yet. Add them in Build to test keyword handoff."}
            </p>
            {visibleTerms.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Configured handoff terms">
                {visibleTerms.map((term) => (
                  <li
                    key={term}
                    className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                  >
                    {term}
                  </li>
                ))}
                {handoffTerms.length > visibleTerms.length ? (
                  <li className="px-1 py-1 text-xs text-muted-foreground">
                    +{handoffTerms.length - visibleTerms.length} more
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
        </li>
      </ol>

      <section
        aria-labelledby="preview-evidence-heading"
        aria-live="polite"
        className="rounded-xl border border-border/70 bg-card p-4"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-muted-foreground" aria-hidden="true" />
          <h3 id="preview-evidence-heading" className="text-sm font-semibold">
            Latest test result
          </h3>
        </div>
        {!evidence ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Send a message in the preview to see its source or handoff evidence here.
          </p>
        ) : evidence.outcome === "handoff" ? (
          <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-sm font-medium">Handoff rule matched</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              The preview returned the configured human-handoff response. No customer conversation
              was created.
            </p>
          </div>
        ) : evidence.grounded && evidence.sources.length > 0 ? (
          <div className="mt-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
              Knowledge sources retrieved
            </p>
            <ul className="mt-2 space-y-2">
              {evidence.sources.map((source) => (
                <li
                  key={source.title}
                  className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
                >
                  <BookOpen className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span className="break-words">{source.title}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-sm font-medium">No matching knowledge source</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Review this answer as ungrounded. Check your source coverage and fallback instructions
              before deploying.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
