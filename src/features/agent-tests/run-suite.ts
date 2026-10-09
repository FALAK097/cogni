import { matchesAgentTestOutcome, type AgentTestExpectedOutcome } from "./input";

export type AgentTestSuiteCase = {
  id: string;
  title: string;
  prompt: string;
  expectedOutcome: AgentTestExpectedOutcome;
  expectedSourceIds?: string[];
};

export type AgentTestSuiteEvidence = {
  outcome: "answer" | "handoff" | "error";
  grounded: boolean;
  sources?: { documentId?: string }[];
};

export type AgentTestSuiteResult = {
  id: string;
  status: "passed" | "mismatch" | "error" | "not_run";
  evidence?: AgentTestSuiteEvidence;
};

export async function runAgentTestSuite(
  cases: readonly AgentTestSuiteCase[],
  options: {
    resetPreview: () => Promise<boolean>;
    runPrompt: (testCase: AgentTestSuiteCase) => Promise<AgentTestSuiteEvidence | null>;
    onCaseStart?: (testCase: AgentTestSuiteCase, index: number) => void;
    onResult?: (result: AgentTestSuiteResult) => void;
  },
): Promise<AgentTestSuiteResult[]> {
  const results: AgentTestSuiteResult[] = [];

  for (let index = 0; index < cases.length; index += 1) {
    const testCase = cases[index];
    if (!testCase) continue;
    options.onCaseStart?.(testCase, index);

    let reset = false;
    try {
      reset = await options.resetPreview();
    } catch {
      reset = false;
    }

    if (!reset) {
      for (const [remainingIndex, remainingCase] of cases.entries()) {
        if (remainingIndex < index || !remainingCase) continue;
        const result: AgentTestSuiteResult = {
          id: remainingCase.id,
          status: remainingIndex === index ? "error" : "not_run",
        };
        results.push(result);
        options.onResult?.(result);
      }
      break;
    }

    let evidence: AgentTestSuiteEvidence | null = null;
    try {
      evidence = await options.runPrompt(testCase);
    } catch {
      evidence = null;
    }

    const result: AgentTestSuiteResult = {
      id: testCase.id,
      status:
        !evidence || evidence.outcome === "error"
          ? "error"
          : matchesAgentTestOutcome(
                testCase.expectedOutcome,
                evidence,
                testCase.expectedSourceIds ?? [],
              )
            ? "passed"
            : "mismatch",
      ...(evidence ? { evidence } : {}),
    };
    results.push(result);
    options.onResult?.(result);
  }

  return results;
}
