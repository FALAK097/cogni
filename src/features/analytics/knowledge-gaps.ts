import type { UnansweredQuestionItem } from "@/features/analytics/types";

/** Group exact repeat questions while ignoring case, spacing, and punctuation. */
export function aggregateKnowledgeGaps(
  items: Omit<UnansweredQuestionItem, "count">[],
): UnansweredQuestionItem[] {
  const grouped = new Map<string, UnansweredQuestionItem>();

  for (const item of items) {
    const key = item.question
      .normalize("NFKC")
      .toLocaleLowerCase("en-US")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim();
    if (!key) continue;

    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...item, question: item.question.trim(), count: 1 });
      continue;
    }

    grouped.set(key, {
      ...existing,
      ...(item.askedAt.localeCompare(existing.askedAt) > 0
        ? {
            conversationId: item.conversationId,
            question: item.question.trim(),
            askedAt: item.askedAt,
          }
        : {}),
      count: existing.count + 1,
    });
  }

  return [...grouped.values()].sort(
    (a, b) => b.count - a.count || b.askedAt.localeCompare(a.askedAt),
  );
}
