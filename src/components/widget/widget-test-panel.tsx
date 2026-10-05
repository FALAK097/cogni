import Link from "next/link";

import { useState, type FormEvent } from "react";

import {
  BookOpen,
  CheckCircle2,
  MessageCircle,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { agentHref } from "@/features/navigation/app-routes";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { runAgentTestSuite, type AgentTestSuiteResult } from "@/features/agent-tests/run-suite";
import {
  useAgentTestCases,
  useDeleteAgentTestCase,
  useSaveAgentTestCase,
  type AgentTestCase,
} from "@/hooks/query";
import {
  matchesAgentTestOutcome,
  type AgentTestExpectedOutcome,
} from "@/features/agent-tests/input";

export type WidgetPreviewEvidence = {
  outcome: "answer" | "handoff" | "error";
  grounded: boolean;
  sources: { title: string }[];
  prompt?: string;
};

function getHandoffTerms(value: string) {
  return value
    .split(/[\n,]+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function WidgetTestResult({
  evidence,
  error,
  retryPrompt,
  busy,
  onRetry,
}: {
  evidence: WidgetPreviewEvidence | null;
  error: string | null;
  retryPrompt: string | null;
  busy: boolean;
  onRetry: (prompt: string) => void;
}) {
  return (
    <>
      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3"
        >
          <p className="min-w-0 flex-1 text-sm text-destructive">{error}</p>
          {retryPrompt ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-10 shrink-0"
              disabled={busy}
              onClick={() => onRetry(retryPrompt)}
            >
              Retry preview
            </Button>
          ) : null}
        </div>
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
            {evidence.prompt ? (
              <Button
                type="button"
                variant="outline"
                className="mt-3 min-h-10"
                disabled={busy}
                onClick={() => onRetry(evidence.prompt ?? "")}
              >
                Retry this question
              </Button>
            ) : null}
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
    </>
  );
}

export function WidgetTestPanel({
  escalationKeywords,
  suggestions,
  evidence,
  sendingPrompt,
  canManage,
  onTryPrompt,
  onResetPreview,
}: {
  escalationKeywords: string;
  suggestions: string[];
  evidence: WidgetPreviewEvidence | null;
  sendingPrompt: string | null;
  canManage: boolean;
  onTryPrompt: (prompt: string) => Promise<WidgetPreviewEvidence | null>;
  onResetPreview: () => Promise<boolean>;
}) {
  const [tryError, setTryError] = useState<string | null>(null);
  const [retryPrompt, setRetryPrompt] = useState<string | null>(null);
  const [editingCase, setEditingCase] = useState<AgentTestCase | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [expectedOutcome, setExpectedOutcome] =
    useState<AgentTestExpectedOutcome>("grounded_answer");
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [resettingCaseId, setResettingCaseId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{
    index: number;
    total: number;
    title: string;
  } | null>(null);
  const [batchResults, setBatchResults] = useState<Record<string, AgentTestSuiteResult>>({});
  const casesQuery = useAgentTestCases();
  const saveCase = useSaveAgentTestCase();
  const deleteCase = useDeleteAgentTestCase();
  const handoffTerms = getHandoffTerms(escalationKeywords);
  const visibleTerms = handoffTerms.slice(0, 5);
  const visibleSuggestions = [...new Set(suggestions.map((suggestion) => suggestion.trim()))]
    .filter((suggestion) => suggestion.length > 0 && suggestion.length <= 500)
    .slice(0, 3);
  const isBusy = sendingPrompt !== null || resettingCaseId !== null || batchProgress !== null;

  const tryPrompt = async (prompt: string) => {
    if (isBusy) return null;
    setTryError(null);
    setRetryPrompt(prompt);
    try {
      const previewEvidence = await onTryPrompt(prompt);
      if (!previewEvidence) {
        setTryError(
          "No test result arrived. Check the preview and model connection, then try again.",
        );
      } else {
        setRetryPrompt(null);
      }
      return previewEvidence;
    } catch {
      setTryError("Couldn't send that test. Retry the preview and try again.");
      return null;
    }
  };

  const openCreate = () => {
    setEditingCase(null);
    setTitle("");
    setPrompt("");
    setExpectedOutcome("grounded_answer");
    setShowForm(true);
  };

  const openEdit = (testCase: AgentTestCase) => {
    setEditingCase(testCase);
    setTitle(testCase.title);
    setPrompt(testCase.prompt);
    setExpectedOutcome(testCase.expectedOutcome);
    setShowForm(true);
  };

  const runCase = async (testCase: AgentTestCase) => {
    if (isBusy) return;
    setTryError(null);
    setBatchResults({});
    setActiveCaseId(testCase.id);
    setResettingCaseId(testCase.id);
    const reset = await onResetPreview().catch(() => false);
    setResettingCaseId(null);
    if (!reset) {
      setTryError("The preview couldn't reset. Retry the preview, then run this test again.");
      setActiveCaseId(null);
      return;
    }
    const result = await onTryPrompt(testCase.prompt).catch(() => null);
    if (!result) {
      setTryError("Couldn't complete this test. Retry the preview, then run it again.");
      setActiveCaseId(null);
    }
  };

  const runAllCases = async () => {
    const savedCases = casesQuery.data?.cases ?? [];
    if (savedCases.length < 2 || isBusy) return;
    setTryError(null);
    setActiveCaseId(null);
    setBatchResults({});
    const results = await runAgentTestSuite(savedCases, {
      resetPreview: onResetPreview,
      runPrompt: (testCase) => onTryPrompt(testCase.prompt),
      onCaseStart: (testCase, index) =>
        setBatchProgress({ index: index + 1, total: savedCases.length, title: testCase.title }),
      onResult: (result) => setBatchResults((current) => ({ ...current, [result.id]: result })),
    });
    setBatchProgress(null);
    if (results.some((result) => result.status === "error" || result.status === "not_run")) {
      setTryError(
        "Some tests couldn't run because the preview did not complete. Review each result.",
      );
    }
  };

  const submitCase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await saveCase.mutateAsync({
        ...(editingCase ? { id: editingCase.id } : {}),
        title,
        prompt,
        expectedOutcome,
      });
      setShowForm(false);
      setTryError(null);
    } catch (error) {
      setTryError(error instanceof Error ? error.message : "Couldn't save this test.");
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

      <section
        aria-labelledby="preview-guidance-heading"
        className="space-y-4 rounded-xl border border-border/70 bg-card p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="preview-guidance-heading" className="text-sm font-semibold">
              Try a scenario
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Send a prompt from the preview beside this panel. These examples run there directly.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-foreground">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            Safe preview
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Grounded answer</p>
          {visibleSuggestions.length > 0 ? (
            <ul className="space-y-2" aria-label="Suggested grounded questions">
              {visibleSuggestions.map((suggestion) => (
                <li key={suggestion}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-10 w-full justify-between gap-3 whitespace-normal rounded-lg px-3 py-2 text-left text-sm font-normal"
                    onClick={() => void tryPrompt(suggestion)}
                    disabled={isBusy}
                    aria-label={`Run preview question: ${suggestion}`}
                  >
                    <span className="line-clamp-2 min-w-0">{suggestion}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {sendingPrompt === suggestion ? "Sending…" : "Run"}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add a suggested question in{" "}
              <Link
                href={agentHref()}
                className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Agent
              </Link>{" "}
              under Deploy, then return here to test a prompt tailored to your agent.
            </p>
          )}
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2.5">
          <p className="text-xs font-medium text-foreground">No-evidence check</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Ask about a topic your sources do not cover to check how the agent handles missing
            evidence.
          </p>
        </div>

        <div className="space-y-2 border-t border-border/70 pt-3">
          <p className="text-xs font-medium text-muted-foreground">Human handoff</p>
          {visibleTerms.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Configured handoff terms">
              {visibleTerms.map((term) => (
                <li key={term}>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-9 rounded-lg px-3 text-sm"
                    onClick={() => void tryPrompt(term)}
                    disabled={isBusy}
                    aria-label={`Run handoff preview using ${term}`}
                  >
                    {sendingPrompt === term ? "Sending…" : term}
                  </Button>
                </li>
              ))}
              {handoffTerms.length > visibleTerms.length ? (
                <li className="self-center px-1 text-xs text-muted-foreground">
                  +{handoffTerms.length - visibleTerms.length} more configured
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              No handoff terms yet. Add them in Build to test escalation.
            </p>
          )}
        </div>
      </section>
      <WidgetTestResult
        evidence={evidence}
        error={tryError}
        retryPrompt={retryPrompt}
        busy={isBusy}
        onRetry={(prompt) => void tryPrompt(prompt)}
      />
      {sendingPrompt ? (
        <output
          className="flex items-center gap-2 text-sm text-muted-foreground"
          aria-live="polite"
        >
          <span className="size-2 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
          Waiting for the agent response. This can take up to about a minute.
        </output>
      ) : null}

      <section
        aria-labelledby="saved-tests-heading"
        className="space-y-3 rounded-xl border border-border/70 bg-card p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 id="saved-tests-heading" className="text-sm font-semibold">
              Saved tests
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Reusable prompts; each run stays in preview.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canManage && (casesQuery.data?.cases.length ?? 0) > 1 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-lg"
                onClick={() => void runAllCases()}
                disabled={isBusy}
              >
                <Play className="size-3.5" aria-hidden="true" /> Run all
              </Button>
            ) : null}
            {canManage ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-lg"
                onClick={openCreate}
                disabled={isBusy}
              >
                <Plus className="size-4" aria-hidden="true" /> Add test
              </Button>
            ) : null}
          </div>
        </div>
        {casesQuery.isLoading ? (
          <output aria-busy="true" aria-label="Loading saved tests" className="space-y-2">
            <div aria-hidden="true" className="space-y-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-border/60 p-3">
                  <Skeleton className="h-4 w-40 max-w-[70%]" />
                  <Skeleton className="mt-2 h-3 w-3/4" />
                  <Skeleton className="mt-3 h-7 w-24 rounded-md" />
                </div>
              ))}
            </div>
          </output>
        ) : null}
        {casesQuery.isError ? (
          <div
            role={casesQuery.data ? undefined : "alert"}
            aria-live={casesQuery.data ? "polite" : undefined}
            className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/30 px-3.5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-muted-foreground">
              {casesQuery.data
                ? "Couldn’t refresh saved tests. Showing the last loaded results."
                : "Saved tests could not be loaded. Try again."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-9 shrink-0"
              onClick={() => void casesQuery.refetch()}
              disabled={casesQuery.isFetching}
            >
              {casesQuery.isFetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        ) : null}
        {casesQuery.data?.cases.length === 0 ? (
          <EmptyState
            title="No saved tests yet"
            className="min-h-[120px] rounded-lg bg-muted/20 p-4 sm:p-4"
            description={
              canManage
                ? "Add a reusable prompt to rerun an important agent check."
                : "A workspace owner can add reusable checks for the team."
            }
          />
        ) : null}
        {batchProgress ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Running {batchProgress.index} of {batchProgress.total}: {batchProgress.title}
          </p>
        ) : null}
        {batchResults && Object.keys(batchResults).length > 0 && !batchProgress ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Latest run:{" "}
            {Object.values(batchResults).filter((result) => result.status === "passed").length}{" "}
            passed ·{" "}
            {Object.values(batchResults).filter((result) => result.status === "mismatch").length}{" "}
            need review ·{" "}
            {Object.values(batchResults).filter((result) => result.status === "error").length}{" "}
            couldn’t run
            {Object.values(batchResults).filter((result) => result.status === "not_run").length > 0
              ? ` · ${Object.values(batchResults).filter((result) => result.status === "not_run").length} not run`
              : ""}
          </p>
        ) : null}
        <ul className="space-y-2">
          {casesQuery.data?.cases.map((testCase) => {
            const outcomeLabel =
              testCase.expectedOutcome === "grounded_answer"
                ? "Grounded answer"
                : testCase.expectedOutcome === "no_evidence"
                  ? "No evidence"
                  : "Human handoff";
            const suiteResult = batchResults[testCase.id];
            const evaluated =
              suiteResult?.evidence ??
              (activeCaseId === testCase.id && evidence && evidence.prompt === testCase.prompt
                ? evidence
                : null);
            const passed = evaluated
              ? matchesAgentTestOutcome(testCase.expectedOutcome, evaluated)
              : false;
            return (
              <li key={testCase.id} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">{testCase.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{outcomeLabel}</p>
                    <p className="mt-2 line-clamp-2 break-words text-sm text-muted-foreground">
                      {testCase.prompt}
                    </p>
                    {suiteResult?.status === "not_run" ? (
                      <p className="mt-2 text-xs text-muted-foreground">Not run</p>
                    ) : suiteResult?.status === "error" && !evaluated ? (
                      <p className="mt-2 text-xs font-medium text-destructive">
                        Run didn’t complete; try again
                      </p>
                    ) : evaluated ? (
                      <p
                        className={`mt-2 text-xs font-medium ${passed ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {evaluated.outcome === "error"
                          ? "Run didn’t complete; try again"
                          : passed
                            ? "Passed"
                            : "Result differs from expectation"}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Run ${testCase.title}`}
                      disabled={isBusy}
                      onClick={() => void runCase(testCase)}
                    >
                      {resettingCaseId === testCase.id ? (
                        "…"
                      ) : (
                        <Play className="size-4" aria-hidden="true" />
                      )}
                    </Button>
                    {canManage ? (
                      <>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Edit ${testCase.title}`}
                          disabled={isBusy}
                          onClick={() => openEdit(testCase)}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Delete ${testCase.title}`}
                          disabled={deleteCase.isPending || isBusy}
                          onClick={() =>
                            void deleteCase
                              .mutateAsync(testCase.id)
                              .catch((error: unknown) =>
                                setTryError(
                                  error instanceof Error
                                    ? error.message
                                    : "Couldn't delete this test.",
                                ),
                              )
                          }
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {showForm ? (
          <form
            className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3"
            onSubmit={(event) => void submitCase(event)}
          >
            <label htmlFor="agent-test-title" className="block space-y-1.5 text-sm font-medium">
              Test name
              <Input
                id="agent-test-title"
                maxLength={80}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                placeholder="Billing question"
              />
            </label>
            <label htmlFor="agent-test-prompt" className="block space-y-1.5 text-sm font-medium">
              Prompt
              <Textarea
                id="agent-test-prompt"
                maxLength={1_000}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                required
                placeholder="How do I update my billing details?"
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              Expected result
              <select
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                value={expectedOutcome}
                onChange={(event) =>
                  setExpectedOutcome(event.target.value as AgentTestExpectedOutcome)
                }
              >
                <option value="grounded_answer">Grounded answer</option>
                <option value="no_evidence">No evidence</option>
                <option value="human_handoff">Human handoff</option>
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saveCase.isPending}>
                {saveCase.isPending ? "Saving…" : editingCase ? "Save changes" : "Save test"}
              </Button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}
