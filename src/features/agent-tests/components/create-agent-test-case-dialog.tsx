"use client";

import { useId, useState, type FormEvent } from "react";
import { AlertCircle, FileText, Loader2, Sparkles } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useKnowledgeBaseSources, useSaveAgentTestCase, type AgentTestCase } from "@/hooks/query";
import {
  type AgentTestExpectedOutcome,
  buildAgentTestCaseFromQuestion,
} from "@/features/agent-tests/input";
import { useToast } from "@/components/ui/use-toast";

export type CreateAgentTestCaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPrompt?: string;
  defaultTitle?: string;
  defaultExpectedOutcome?: AgentTestExpectedOutcome;
  defaultExpectedSourceIds?: string[];
  contextLabel?: string;
  onCreated?: (testCase: AgentTestCase) => void;
};

export function CreateAgentTestCaseDialog({
  open,
  onOpenChange,
  defaultPrompt = "",
  defaultTitle = "",
  defaultExpectedOutcome = "grounded_answer",
  defaultExpectedSourceIds = [],
  contextLabel,
  onCreated,
}: CreateAgentTestCaseDialogProps) {
  const { toast } = useToast();
  const saveCase = useSaveAgentTestCase();

  const titleId = useId();
  const promptId = useId();
  const outcomeId = useId();

  const initialDraft = buildAgentTestCaseFromQuestion(defaultPrompt, {
    title: defaultTitle,
    expectedOutcome: defaultExpectedOutcome,
    expectedSourceIds: defaultExpectedSourceIds,
  });

  const [title, setTitle] = useState(initialDraft.title);
  const [prompt, setPrompt] = useState(initialDraft.prompt);
  const [expectedOutcome, setExpectedOutcome] = useState<AgentTestExpectedOutcome>(
    initialDraft.expectedOutcome,
  );
  const [expectedSourceIds, setExpectedSourceIds] = useState<string[]>(
    initialDraft.expectedSourceIds,
  );
  const [error, setError] = useState<string | null>(null);

  const sourcesQuery = useKnowledgeBaseSources(null, {
    enabled: open && expectedOutcome === "grounded_answer",
  });

  const readySources = (sourcesQuery.data?.sources ?? []).filter(
    (source) => source.status === "ready",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError("Please enter a question or prompt for this test case.");
      return;
    }

    const payload = buildAgentTestCaseFromQuestion(trimmedPrompt, {
      title: title.trim(),
      expectedOutcome,
      expectedSourceIds: expectedOutcome === "grounded_answer" ? expectedSourceIds : [],
    });

    try {
      const saved = await saveCase.mutateAsync(payload);
      toast.success("Test case saved to Agent suite", {
        description: "You can run this test against your draft agent in Agent > Test.",
      });
      onCreated?.(saved);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to create agent test case.");
    }
  }

  const isOutcomeGrounded = expectedOutcome === "grounded_answer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" aria-hidden="true" />
            </div>
            <DialogTitle>Create agent test case</DialogTitle>
          </div>
          <DialogDescription>
            {contextLabel
              ? `Turn this inquiry from ${contextLabel} into a repeatable regression test.`
              : "Turn real customer inquiries into reproducible regression tests for your agent."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={titleId}>Test title</Label>
            <Input
              id={titleId}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Return policy timeline"
              maxLength={80}
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor={promptId}>Question / Prompt</Label>
              <span className="text-[11px] text-muted-foreground">{prompt.length}/1000</span>
            </div>
            <Textarea
              id={promptId}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What question should the agent be tested with?"
              className="min-h-24 leading-relaxed"
              maxLength={1_000}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Tip: Edit or redact any private visitor information (names, emails, account numbers)
              before saving.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={outcomeId}>Expected agent behavior</Label>
            <Select
              value={expectedOutcome}
              onValueChange={(val) => {
                if (val === "grounded_answer" || val === "no_evidence" || val === "human_handoff") {
                  setExpectedOutcome(val);
                }
              }}
            >
              <SelectTrigger id={outcomeId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grounded_answer">
                  Grounded answer (requires source evidence)
                </SelectItem>
                <SelectItem value="no_evidence">
                  Missing knowledge (admits no evidence found)
                </SelectItem>
                <SelectItem value="human_handoff">
                  Human handoff (escalates or offers team handover)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isOutcomeGrounded ? (
            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">
                  Required knowledge sources{" "}
                  <span className="font-normal text-muted-foreground">(optional, max 4)</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  {expectedSourceIds.length}/4 selected
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                If selected, the agent must retrieve all chosen sources to pass this test.
              </p>

              {sourcesQuery.isLoading ? (
                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  Loading sources…
                </div>
              ) : readySources.length === 0 ? (
                <p className="py-1 text-xs text-muted-foreground">
                  No indexed knowledge sources available yet. Add sources in Agent &gt; Knowledge
                  Base.
                </p>
              ) : (
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-border/50 bg-background/80 p-2">
                  {readySources.map((source) => {
                    const isChecked = expectedSourceIds.includes(source.id);
                    const isDisabled = !isChecked && expectedSourceIds.length >= 4;
                    return (
                      <label
                        key={source.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isDisabled}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (expectedSourceIds.length < 4) {
                                setExpectedSourceIds((prev) => [...prev, source.id]);
                              }
                            } else {
                              setExpectedSourceIds((prev) => prev.filter((id) => id !== source.id));
                            }
                          }}
                          className="size-3.5 rounded border-border text-primary accent-primary"
                        />
                        <FileText
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="truncate text-foreground">{source.displayName}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveCase.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saveCase.isPending || !prompt.trim()} className="gap-2">
              {saveCase.isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="size-3.5" aria-hidden="true" />
              )}
              Save test case
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
