export type AgentTestPromptRunResult<T> =
  | { status: "completed"; evidence: T }
  | { status: "reset_failed" }
  | { status: "run_failed" };

export async function runAgentTestCase<T>({
  resetPreview,
  runPrompt,
  isErrorResult,
}: {
  resetPreview: () => Promise<boolean>;
  runPrompt: () => Promise<T | null>;
  isErrorResult: (evidence: T) => boolean;
}): Promise<AgentTestPromptRunResult<T>> {
  try {
    if (!(await resetPreview())) return { status: "reset_failed" };
  } catch {
    return { status: "reset_failed" };
  }

  try {
    const evidence = await runPrompt();
    if (evidence === null || isErrorResult(evidence)) return { status: "run_failed" };
    return { status: "completed", evidence };
  } catch {
    return { status: "run_failed" };
  }
}
