import Link from "next/link";
import { useState } from "react";

import { BookOpen, CheckCircle2, MessageCircle } from "@/components/icons";
import { Button } from "@/components/ui/button";

export type WidgetPreviewEvidence = {
  outcome: "answer" | "handoff" | "error";
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
  suggestions,
  evidence,
  sendingPrompt,
  onTryPrompt,
}: {
  escalationKeywords: string;
  suggestions: string[];
  evidence: WidgetPreviewEvidence | null;
  sendingPrompt: string | null;
  onTryPrompt: (prompt: string) => Promise<boolean>;
}) {
  const [tryError, setTryError] = useState<string | null>(null);
  const handoffTerms = getHandoffTerms(escalationKeywords);
  const visibleTerms = handoffTerms.slice(0, 5);
  const visibleSuggestions = [...new Set(suggestions.map((suggestion) => suggestion.trim()))]
    .filter((suggestion) => suggestion.length > 0 && suggestion.length <= 500)
    .slice(0, 3);

  const tryPrompt = async (prompt: string) => {
    setTryError(null);
    try {
      if (!(await onTryPrompt(prompt))) {
        setTryError("The preview couldn't start. Retry the preview, then try again.");
      }
    } catch {
      setTryError("Couldn't send that test. Retry the preview and try again.");
    }
  };

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
            {visibleSuggestions.length > 0 ? (
              <ul className="mt-3 space-y-2" aria-label="Suggested questions to test">
                {visibleSuggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto min-h-10 w-full justify-between gap-3 whitespace-normal rounded-lg px-3 py-2 text-left text-sm font-normal"
                      onClick={() => void tryPrompt(suggestion)}
                      disabled={sendingPrompt !== null}
                      aria-label={`Send test question: ${suggestion}`}
                    >
                      <span className="line-clamp-2 min-w-0">{suggestion}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {sendingPrompt === suggestion ? "Sending…" : "Try"}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Add a suggested question in{" "}
                <Link
                  href="/playground?subtab=customize"
                  className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Customize
                </Link>{" "}
                to test a prompt tailored to your agent.
              </p>
            )}
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
            {visibleTerms[0] ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 h-9 rounded-lg"
                onClick={() => void tryPrompt(visibleTerms[0]!)}
                disabled={sendingPrompt !== null}
              >
                {sendingPrompt === visibleTerms[0] ? "Sending…" : "Try handoff in preview"}
              </Button>
            ) : null}
          </div>
        </li>
      </ol>

      {tryError ? (
        <p role="alert" className="text-sm text-destructive">
          {tryError}
        </p>
      ) : null}

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
        ) : evidence.outcome === "error" ? (
          <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-sm font-medium">The agent couldn&apos;t complete this test</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              The preview didn&apos;t receive an answer. Check the model connection and try again.
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
