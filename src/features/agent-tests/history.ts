import type { AgentTestRunHistoryItem } from "./input";

export const AGENT_TEST_HISTORY_VIEWS = ["all", "latest-suite"] as const;

/** History arrives oldest first and is already capped/date-scoped by the server. */
export function selectAgentTestRunHistory(
  runs: readonly AgentTestRunHistoryItem[],
  view: (typeof AGENT_TEST_HISTORY_VIEWS)[number],
) {
  const latestSuiteDigest = runs.findLast((run) => run.suiteDigest !== null)?.suiteDigest ?? null;
  return {
    runs:
      view === "all"
        ? [...runs]
        : latestSuiteDigest === null
          ? []
          : runs.filter((run) => run.suiteDigest === latestSuiteDigest),
    latestSuiteDigest,
    versionCount: new Set(
      runs.flatMap((run) => (run.suiteDigest === null ? [] : [run.suiteDigest])),
    ).size,
    unversionedCount: runs.filter((run) => run.suiteDigest === null).length,
  };
}
