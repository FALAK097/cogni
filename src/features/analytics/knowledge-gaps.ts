import { createHash } from "node:crypto";

import type { KnowledgeGapSignal, UnansweredQuestionItem } from "@/features/analytics/types";

export type KnowledgeGapReview = {
  questionHash: string;
  status: "OPEN" | "RESOLVED" | "IGNORED";
  updatedAt: string;
};

export type KnowledgeGapObservation = Omit<UnansweredQuestionItem, "count"> & {
  signal: KnowledgeGapSignal;
};

type AggregatedKnowledgeGap = UnansweredQuestionItem & { signals: KnowledgeGapSignal[] };

export function normalizeKnowledgeGapQuestion(question: string): string {
  return question
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function hashKnowledgeGapQuestion(question: string): string {
  return createHash("sha256").update(normalizeKnowledgeGapQuestion(question)).digest("hex");
}

/** Group exact repeat questions while ignoring case, spacing, and punctuation. */
export function aggregateKnowledgeGaps(
  items: (Omit<KnowledgeGapObservation, "signal"> & { signal?: KnowledgeGapSignal })[],
): AggregatedKnowledgeGap[] {
  const grouped = new Map<string, AggregatedKnowledgeGap>();

  for (const item of items) {
    const signal = item.signal ?? "UNANSWERED";
    const key = normalizeKnowledgeGapQuestion(item.question);
    if (!key) continue;

    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        conversationId: item.conversationId,
        question: item.question.trim(),
        askedAt: item.askedAt,
        count: 1,
        signals: [signal],
      });
      continue;
    }

    grouped.set(key, {
      ...existing,
      signals: [...new Set([...existing.signals, signal])],
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

export function buildKnowledgeGapSummary(
  items: AggregatedKnowledgeGap[],
  reviews: KnowledgeGapReview[],
  limit = 3,
) {
  const reviewByHash = new Map(reviews.map((review) => [review.questionHash, review]));
  const mutable = {
    OPEN: [] as (AggregatedKnowledgeGap & { status: "OPEN" })[],
    RESOLVED: [] as (AggregatedKnowledgeGap & { status: "RESOLVED" })[],
    IGNORED: [] as (AggregatedKnowledgeGap & { status: "IGNORED" })[],
  };

  for (const item of items) {
    const review = reviewByHash.get(hashKnowledgeGapQuestion(item.question));
    let status = review?.status ?? "OPEN";
    if (
      review &&
      status === "RESOLVED" &&
      Date.parse(item.askedAt) > Date.parse(review.updatedAt)
    ) {
      status = "OPEN";
    }
    if (status === "OPEN") mutable.OPEN.push({ ...item, status: "OPEN" });
    else if (status === "RESOLVED") mutable.RESOLVED.push({ ...item, status: "RESOLVED" });
    else mutable.IGNORED.push({ ...item, status: "IGNORED" });
  }

  const counts = {
    OPEN: mutable.OPEN.length,
    RESOLVED: mutable.RESOLVED.length,
    IGNORED: mutable.IGNORED.length,
  };

  return {
    open: mutable.OPEN.slice(0, limit),
    resolved: mutable.RESOLVED.slice(0, limit),
    ignored: mutable.IGNORED.slice(0, limit),
    counts: {
      open: counts.OPEN,
      resolved: counts.RESOLVED,
      ignored: counts.IGNORED,
    },
  };
}
