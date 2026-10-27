"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useAgentTestImprovements,
  useCreateAgentTestImprovement,
  useReviewAgentTestImprovement,
} from "@/hooks/query/use-widget";
import type { AgentTestExpectedOutcome, AgentTestImprovementStatus } from "../input";

export type FailedAgentTestContext = {
  runId: string;
  caseId: string;
  title: string;
  prompt: string;
  expectedOutcome: AgentTestExpectedOutcome;
  expectedSourceIds: string[];
  sourceIds: string[];
  failedAt: string;
};

const filters: { status: AgentTestImprovementStatus; label: string }[] = [
  { status: "OPEN", label: "Open" },
  { status: "RESOLVED", label: "Resolved" },
  { status: "DISMISSED", label: "Dismissed" },
];

function formatOutcome(outcome: AgentTestExpectedOutcome) {
  return {
    grounded_answer: "Grounded answer",
    no_evidence: "No evidence expected",
    human_handoff: "Human handoff",
  }[outcome];
}

export function AgentTestImprovementQueue({
  failedCases,
  unavailableFailureCount,
  canReview,
}: {
  failedCases: FailedAgentTestContext[];
  unavailableFailureCount: number;
  canReview: boolean;
}) {
  const [status, setStatus] = useState<AgentTestImprovementStatus>("OPEN");
  const [selectedFailure, setSelectedFailure] = useState<FailedAgentTestContext | null>(null);
  const [rationale, setRationale] = useState("");
  const [reviewNoteById, setReviewNoteById] = useState<Record<string, string>>({});
  const improvementsQuery = useAgentTestImprovements();
  const createImprovement = useCreateAgentTestImprovement();
  const reviewImprovement = useReviewAgentTestImprovement();
  const items = (improvementsQuery.data?.items ?? []).filter((item) => item.status === status);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFailure) return;
    try {
      await createImprovement.mutateAsync({
        runId: selectedFailure.runId,
        caseId: selectedFailure.caseId,
        rationale,
      });
      setSelectedFailure(null);
      setRationale("");
    } catch {
      // The mutation error is announced in the dialog below.
    }
  }

  return (
    <section aria-labelledby="agent-improvement-queue-heading" className="mt-6 border-t pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id="agent-improvement-queue-heading" className="text-sm font-semibold tracking-tight">
            Agent improvement review
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Capture a verified failed check for human review. Resolving an item closes the review
            only; it does not mean the agent behavior is fixed.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {failedCases.length} eligible failures loaded
          {unavailableFailureCount > 0
            ? ` · ${unavailableFailureCount} without current context`
            : ""}
        </p>
      </div>

      {canReview ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-foreground">From failed test history</p>
          {failedCases.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
              {unavailableFailureCount > 0
                ? "These failures are from older runs or edited tests without matching run-time context. Run the current suite again to create a review item."
                : "No eligible failures in the loaded history. Run the suite to record verified context."}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {failedCases.map((failedCase) => (
                <article
                  key={`${failedCase.runId}:${failedCase.caseId}`}
                  className="min-w-0 rounded-lg border bg-background p-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">{failedCase.title}</p>
                      <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">
                        {failedCase.prompt}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatOutcome(failedCase.expectedOutcome)} · Failed{" "}
                        <time dateTime={failedCase.failedAt}>
                          {new Date(failedCase.failedAt).toLocaleString()}
                        </time>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full shrink-0 sm:w-auto"
                      onClick={() => setSelectedFailure(failedCase)}
                    >
                      Propose improvement
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <fieldset className="mt-5 flex flex-wrap gap-2">
        <legend className="sr-only">Review queue status</legend>
        {filters.map((filter) => (
          <Button
            key={filter.status}
            size="sm"
            variant={status === filter.status ? "secondary" : "ghost"}
            aria-pressed={status === filter.status}
            onClick={() => setStatus(filter.status)}
          >
            {filter.label}
          </Button>
        ))}
      </fieldset>

      {reviewImprovement.isError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {reviewImprovement.error.message}
        </p>
      ) : null}

      {improvementsQuery.isLoading ? (
        <p
          className="mt-3 rounded-lg border px-3 py-4 text-sm text-muted-foreground"
          aria-live="polite"
        >
          Loading improvement reviews…
        </p>
      ) : improvementsQuery.isError && !improvementsQuery.data ? (
        <div className="mt-3 flex flex-col gap-3 rounded-lg border px-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">The review queue couldn’t be loaded.</p>
          <Button
            size="sm"
            variant="outline"
            disabled={improvementsQuery.isFetching}
            onClick={() => void improvementsQuery.refetch()}
          >
            {improvementsQuery.isFetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : improvementsQuery.isError ? (
        <output className="mt-3 block text-xs text-muted-foreground">
          The queue couldn’t refresh. Showing the last loaded items.
        </output>
      ) : items.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
          {status === "OPEN"
            ? "No open improvement reviews yet."
            : `No ${status.toLowerCase()} items.`}
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="min-w-0 rounded-lg border bg-background p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">{item.caseSnapshot.title}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {item.caseSnapshot.prompt}
                  </p>
                  <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-foreground">Expected behavior</dt>
                      <dd className="mt-0.5 text-muted-foreground">
                        {formatOutcome(item.caseSnapshot.expectedOutcome)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Expected sources</dt>
                      <dd className="mt-0.5 break-all text-muted-foreground">
                        {item.caseSnapshot.expectedSourceIds.length
                          ? item.caseSnapshot.expectedSourceIds.join(", ")
                          : "None specified"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Model at failure</dt>
                      <dd className="mt-0.5 break-words text-muted-foreground">
                        {item.evaluationReferences.modelProvider} ·{" "}
                        {item.evaluationReferences.modelName}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="font-medium text-foreground">Configuration fingerprint</dt>
                      <dd className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">
                        {item.evaluationReferences.configFingerprint}
                      </dd>
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <dt className="font-medium text-foreground">Retrieved source revisions</dt>
                      <dd className="mt-0.5 text-muted-foreground">
                        {item.evaluationReferences.sources.length ? (
                          <ul className="mt-1 grid gap-1">
                            {item.evaluationReferences.sources.map((source, index) => (
                              <li
                                key={`${source.documentId}:${source.revisionId ?? "current"}:${index}`}
                                className="break-all font-mono text-[11px]"
                              >
                                Document {source.documentId} ·{" "}
                                {source.revisionId
                                  ? `revision ${source.revisionNumber} (${source.revisionId})`
                                  : "unversioned source"}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "No sources retrieved"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Rationale</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap break-words text-muted-foreground">
                        {item.rationale}
                      </dd>
                    </div>
                  </dl>
                  {item.reviewNote ? (
                    <p className="mt-3 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      Review note: {item.reviewNote}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Added{" "}
                    <time dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString()}
                    </time>
                    {item.reviewedAt ? (
                      <>
                        {" · "}Reviewed{" "}
                        <time dateTime={item.reviewedAt}>
                          {new Date(item.reviewedAt).toLocaleString()}
                        </time>
                      </>
                    ) : null}
                  </p>
                </div>
                {canReview && item.status === "OPEN" ? (
                  <div className="flex w-full shrink-0 flex-col gap-2 sm:w-48">
                    <Textarea
                      aria-label={`Review note for ${item.caseSnapshot.title}`}
                      value={reviewNoteById[item.id] ?? ""}
                      onChange={(event) =>
                        setReviewNoteById((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="Optional review note"
                      maxLength={2_000}
                      rows={2}
                    />
                    <Button
                      size="sm"
                      disabled={reviewImprovement.isPending}
                      onClick={() =>
                        reviewImprovement.mutate({
                          id: item.id,
                          status: "RESOLVED",
                          reviewNote: reviewNoteById[item.id]?.trim() || null,
                        })
                      }
                    >
                      Resolve review
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reviewImprovement.isPending}
                      onClick={() =>
                        reviewImprovement.mutate({
                          id: item.id,
                          status: "DISMISSED",
                          reviewNote: reviewNoteById[item.id]?.trim() || null,
                        })
                      }
                    >
                      Dismiss
                    </Button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={selectedFailure !== null}
        onOpenChange={(open) => {
          if (!open && !createImprovement.isPending) {
            setSelectedFailure(null);
            setRationale("");
          }
        }}
      >
        <DialogContent>
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Propose an agent improvement</DialogTitle>
              <DialogDescription>
                This adds a human review item from the saved failed test. It won’t change or replay
                the agent.
              </DialogDescription>
            </DialogHeader>
            {selectedFailure ? (
              <div className="mt-4 rounded-lg border bg-muted/20 p-3">
                <p className="text-sm font-medium">{selectedFailure.title}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {selectedFailure.prompt}
                </p>
              </div>
            ) : null}
            <label className="mt-4 block text-sm font-medium" htmlFor="improvement-rationale">
              What should be investigated?
            </label>
            <Textarea
              id="improvement-rationale"
              className="mt-2 min-h-28"
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
              placeholder="Describe what the failed check suggests and what a reviewer should look at."
              maxLength={2_000}
              required
            />
            {createImprovement.isError ? (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {createImprovement.error.message}
              </p>
            ) : null}
            <DialogFooter className="mt-4 flex-col-reverse sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={createImprovement.isPending}
                onClick={() => setSelectedFailure(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!rationale.trim() || createImprovement.isPending}>
                {createImprovement.isPending ? "Adding…" : "Add to review queue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
