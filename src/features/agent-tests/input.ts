import { z } from "zod";

export const agentTestCaseInputSchema = z.object({
  title: z.string().trim().min(1).max(80),
  prompt: z.string().trim().min(1).max(1_000),
  expectedOutcome: z.enum(["grounded_answer", "no_evidence", "human_handoff"]),
});

export type AgentTestCaseInput = z.infer<typeof agentTestCaseInputSchema>;
export type AgentTestExpectedOutcome = AgentTestCaseInput["expectedOutcome"];

export const agentTestRunInputSchema = z.object({
  runId: z.string().uuid(),
  suiteVersion: z.string().min(2).max(500_000),
  results: z
    .array(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["passed", "mismatch", "error", "not_run"]),
      }),
    )
    .min(1)
    .max(5_000)
    .refine((results) => new Set(results.map((result) => result.id)).size === results.length),
});

export type AgentTestRunInput = z.infer<typeof agentTestRunInputSchema>;

export type AgentTestRunSummary = {
  caseCount: number;
  passedCount: number;
  mismatchCount: number;
  errorCount: number;
  notRunCount: number;
};

export type AgentTestRunHistoryItem = AgentTestRunSummary & {
  id: string;
  createdAt: string;
  suiteDigest: string | null;
};

export type AgentTestRunHistory = {
  runs: AgentTestRunHistoryItem[];
  hasAnyRuns: boolean;
};

export function getAgentTestSuiteVersion(cases: readonly { id: string; updatedAt: string }[]) {
  return JSON.stringify(
    [...cases]
      .map(({ id, updatedAt }) => [id, updatedAt] as const)
      .sort(([leftId], [rightId]) => leftId.localeCompare(rightId)),
  );
}

export function summarizeAgentTestRun(results: AgentTestRunInput["results"]): AgentTestRunSummary {
  return {
    caseCount: results.length,
    passedCount: results.filter((result) => result.status === "passed").length,
    mismatchCount: results.filter((result) => result.status === "mismatch").length,
    errorCount: results.filter((result) => result.status === "error").length,
    notRunCount: results.filter((result) => result.status === "not_run").length,
  };
}

export function matchesAgentTestOutcome(
  expected: AgentTestExpectedOutcome,
  evidence: { outcome: "answer" | "handoff" | "error"; grounded: boolean },
) {
  if (evidence.outcome === "error") return false;
  if (expected === "human_handoff") return evidence.outcome === "handoff";
  if (evidence.outcome !== "answer") return false;
  return expected === "grounded_answer" ? evidence.grounded : !evidence.grounded;
}
