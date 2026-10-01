export type WorkflowStepProgress = {
  id: string;
  position: number;
  status: string;
};

export type WorkflowProgression<TStep extends WorkflowStepProgress> =
  | { kind: "ready"; step: TStep }
  | { kind: "blocked"; step: TStep }
  | { kind: "out-of-order"; step: TStep }
  | { kind: "complete" };

export function getWorkflowProgression<TStep extends WorkflowStepProgress>(
  steps: readonly TStep[],
  requestedStepId?: string,
): WorkflowProgression<TStep> {
  const firstIncompleteStep = [...steps]
    .sort((left, right) => left.position - right.position)
    .find((step) => step.status !== "COMPLETED");

  if (!firstIncompleteStep) return { kind: "complete" };
  if (firstIncompleteStep.status !== "PENDING") {
    return { kind: "blocked", step: firstIncompleteStep };
  }
  if (requestedStepId && requestedStepId !== firstIncompleteStep.id) {
    return { kind: "out-of-order", step: firstIncompleteStep };
  }
  return { kind: "ready", step: firstIncompleteStep };
}
