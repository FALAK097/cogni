"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { z } from "zod";

import { APP_ROUTES } from "@/features/navigation/app-routes";
import { useActiveWorkspaceId } from "@/hooks/use-auth";

const insightsSchema = z.object({
  label: z.literal("Uncalibrated review cues"),
  notice: z.string(),
  evaluatedCount: z.number().int().nonnegative(),
  lowScoreCount: z.number().int().nonnegative(),
  helpfulnessAverage: z.number().nullable(),
  groundingAverage: z.number().nullable(),
  pendingCount: z.number().int().nonnegative(),
  cues: z.array(
    z.object({
      conversationId: z.string().min(1),
      helpfulness: z.number().int().min(1).max(5),
      grounding: z.number().int().min(1).max(5),
      sentiment: z.enum(["positive", "neutral", "negative", "mixed"]),
      topics: z.array(z.string()).max(3),
      escalationOutcome: z.enum(["NONE", "RESOLVED", "PENDING", "MISSED", "NOT_APPLICABLE"]),
      reasonCodes: z.array(z.string()).max(4),
      lowScore: z.boolean(),
      createdAt: z.string(),
    }),
  ),
});

function displayCode(code: string) {
  return code.toLowerCase().replaceAll("_", " ");
}

export function ConversationQaInsights() {
  const workspaceId = useActiveWorkspaceId() ?? "";
  const query = useQuery({
    queryKey: ["conversation-qa-insights", workspaceId],
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
    queryFn: async () => {
      const response = await fetch("/api/dashboard/analytics/conversation-qa");
      if (!response.ok) throw new Error("Could not load conversation review cues.");
      return insightsSchema.parse(await response.json());
    },
  });
  const data = query.data;

  return (
    <section
      aria-labelledby="conversation-qa-heading"
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Conversation review
          </p>
          <h2 id="conversation-qa-heading" className="mt-1 text-lg font-semibold tracking-tight">
            QA scoring
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Uncalibrated review cues — not confidence estimates or quality trends. Only public
            conversation messages are evaluated (up to the latest 100 messages / 40k characters).
            Scores and counts use up to the 30 latest evaluations.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-64">
          <Metric
            label="Evaluated"
            value={query.isLoading ? "—" : String(data?.evaluatedCount ?? 0)}
          />
          <Metric
            label="Low-score cues"
            value={query.isLoading ? "—" : String(data?.lowScoreCount ?? 0)}
          />
          <Metric
            label="Helpfulness avg."
            value={
              data?.helpfulnessAverage === null || data?.helpfulnessAverage === undefined
                ? "—"
                : `${data.helpfulnessAverage.toFixed(1)} / 5`
            }
          />
          <Metric
            label="Grounding avg."
            value={
              data?.groundingAverage === null || data?.groundingAverage === undefined
                ? "—"
                : `${data.groundingAverage.toFixed(1)} / 5`
            }
          />
        </div>
      </div>

      {data && data.cues.length > 0 ? (
        <div className="mt-5 border-t border-border/70 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">Recent review cues</h3>
            <span className="text-xs text-muted-foreground">
              {data.pendingCount > 0 ? `${data.pendingCount} queued` : "Latest evaluations"}
            </span>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {data.cues.slice(0, 6).map((cue, index) => (
              <li
                key={`${cue.createdAt}-${index}`}
                className="rounded-xl border border-border/60 bg-muted/25 px-3.5 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium tabular-nums">
                    Helpfulness {cue.helpfulness}/5 · Grounding {cue.grounding}/5
                  </span>
                  {cue.lowScore ? (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                      Review
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(cue.createdAt), "MMM d, yyyy")} · {displayCode(cue.sentiment)}
                  {cue.topics.length ? ` · ${cue.topics.map(displayCode).join(", ")}` : ""}
                  {` · escalation ${displayCode(cue.escalationOutcome)}`}
                </p>
                {cue.reasonCodes.length > 0 ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {cue.reasonCodes.map(displayCode).join(" · ")}
                  </p>
                ) : null}
                <Link
                  href={`${APP_ROUTES.inbox}?conversationId=${encodeURIComponent(cue.conversationId)}`}
                  className="mt-2 inline-flex min-h-10 items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Review conversation
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : query.isError ? (
        <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Review cues are temporarily unavailable.
        </p>
      ) : query.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
          Loading review cues…
        </p>
      ) : (
        <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          No conversations have been evaluated yet. Closed conversations are queued for review;
          active conversations become eligible after 24 hours without a public message.
        </p>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}
