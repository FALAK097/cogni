import { z } from "zod";

export const agentTestCaseInputSchema = z.object({
  title: z.string().trim().min(1).max(80),
  prompt: z.string().trim().min(1).max(1_000),
  expectedOutcome: z.enum(["grounded_answer", "no_evidence", "human_handoff"]),
});

export type AgentTestCaseInput = z.infer<typeof agentTestCaseInputSchema>;
export type AgentTestExpectedOutcome = AgentTestCaseInput["expectedOutcome"];

export function matchesAgentTestOutcome(
  expected: AgentTestExpectedOutcome,
  evidence: { outcome: "answer" | "handoff" | "error"; grounded: boolean },
) {
  if (evidence.outcome === "error") return false;
  if (expected === "human_handoff") return evidence.outcome === "handoff";
  if (evidence.outcome !== "answer") return false;
  return expected === "grounded_answer" ? evidence.grounded : !evidence.grounded;
}
