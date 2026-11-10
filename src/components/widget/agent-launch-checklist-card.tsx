"use client";

import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Dot,
  ChevronRight,
  Sparkles,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type AgentLaunchChecklist, type ReadinessStep } from "@/features/widget/agent-readiness";
import type { AgentTab } from "@/features/navigation/app-routes";

export function AgentLaunchChecklistCard({
  checklist,
  onNavigateTab,
  onPublish,
  onResume,
  onFocusDomain,
  compact = false,
  canManage = true,
}: {
  checklist: AgentLaunchChecklist;
  onNavigateTab?: (tab: AgentTab) => void;
  onPublish?: () => void;
  onResume?: () => void;
  onFocusDomain?: () => void;
  compact?: boolean;
  canManage?: boolean;
}) {
  const currentStep = checklist.currentStep;

  const handleStepAction = (step: ReadinessStep) => {
    if (!canManage) return;
    if (step.actionType === "publish") {
      onPublish?.();
    } else if (step.actionType === "resume") {
      onResume?.();
    } else if (step.actionType === "domain") {
      onFocusDomain?.();
    } else if (step.targetTab) {
      onNavigateTab?.(step.targetTab);
    }
  };

  if (compact) {
    if (checklist.complete) return null;

    return (
      <section
        aria-labelledby="insights-launch-readiness-title"
        className="rounded-xl border border-primary/20 bg-primary/5 p-4 transition-colors"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-3.5" aria-hidden="true" />
              </span>
              <h2
                id="insights-launch-readiness-title"
                className="text-sm font-semibold text-foreground"
              >
                Launch readiness: {checklist.completedCount} of {checklist.totalCount} steps
                complete
              </h2>
            </div>
            {currentStep ? (
              <p className="text-xs text-muted-foreground">
                <strong className="font-medium text-foreground">{currentStep.title}:</strong>{" "}
                {currentStep.description}
              </p>
            ) : null}
          </div>

          {currentStep && currentStep.actionLabel ? (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => handleStepAction(currentStep)}
                disabled={!canManage}
              >
                <span>{currentStep.actionLabel}</span>
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </div>

        {/* Progress bar */}
        <progress
          value={checklist.percent}
          max={100}
          className="sr-only"
          aria-label={`Launch readiness progress: ${checklist.percent}%`}
        />
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-primary/15"
          aria-hidden="true"
        >
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${checklist.percent}%` }}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="agent-launch-checklist-title"
      className="space-y-4 rounded-xl border border-border/70 bg-card p-4 sm:p-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3
              id="agent-launch-checklist-title"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              Launch readiness checklist
            </h3>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                checklist.complete
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-primary/10 text-primary",
              )}
            >
              {checklist.completedCount}/{checklist.totalCount} complete
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {checklist.complete
              ? "All launch requirements satisfied. Your agent is ready to serve website visitors."
              : "Complete these steps before driving live visitor traffic to your support agent."}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full sm:w-40">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Progress</span>
            <span className="font-medium text-foreground">{checklist.percent}%</span>
          </div>
          <progress
            value={checklist.percent}
            max={100}
            className="sr-only"
            aria-label={`Launch readiness: ${checklist.percent}%`}
          />
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className={cn(
                "h-full transition-all duration-300",
                checklist.complete ? "bg-emerald-500" : "bg-primary",
              )}
              style={{ width: `${checklist.percent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/50 rounded-lg border border-border/60 bg-muted/20">
        {checklist.steps.map((step, idx) => {
          const isComplete = step.status === "complete";
          const isInProgress = step.status === "in_progress";
          const isActionRequired = step.status === "action_required";

          return (
            <div
              key={step.id}
              className={cn(
                "flex flex-col gap-2 p-3 transition-colors sm:flex-row sm:items-center sm:justify-between sm:p-3.5",
                isActionRequired && "bg-primary/5",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
                    isComplete && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                    isInProgress && "bg-primary/15 text-primary",
                    isActionRequired && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    step.status === "pending" && "bg-muted text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {isComplete ? (
                    <CheckCircle2 className="size-4" />
                  ) : isInProgress ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : isActionRequired ? (
                    <AlertCircle className="size-4" />
                  ) : (
                    <Dot className="size-4" />
                  )}
                </span>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Step {idx + 1}
                    </span>
                    <h4 className="text-sm font-medium text-foreground">{step.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>

              {step.actionLabel && canManage ? (
                <Button
                  type="button"
                  variant={isActionRequired ? "default" : "outline"}
                  size="sm"
                  className="h-8 shrink-0 self-start text-xs sm:self-center"
                  onClick={() => handleStepAction(step)}
                >
                  {step.actionLabel}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
