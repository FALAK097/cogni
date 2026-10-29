import { z } from "zod";

export const CONVERSATION_QA_WORKFLOW_NAME = "conversation.qa.score";
export const CONVERSATION_QA_MAX_ATTEMPTS = 3;
export const CONVERSATION_QA_WORKFLOW_INPUT_SCHEMA_VERSION = 1;

export const QA_TOPICS = [
  "account_access",
  "billing",
  "integrations",
  "pricing",
  "product_usage",
  "technical_issue",
  "cancellation",
  "other",
] as const;

export const QA_REASON_CODES = [
  "ANSWER_UNCLEAR",
  "FACT_UNSUPPORTED",
  "QUESTION_UNANSWERED",
  "ESCALATION_MISSED",
  "TONE_MISMATCH",
  "GOOD_RESOLUTION",
  "INSUFFICIENT_CONTEXT",
] as const;

export const conversationQaResultSchema = z
  .object({
    helpfulness: z.number().int().min(1).max(5),
    grounding: z.number().int().min(1).max(5),
    sentiment: z.enum(["positive", "neutral", "negative", "mixed"]),
    topics: z.array(z.enum(QA_TOPICS)).max(3),
    escalationOutcome: z.enum(["NONE", "RESOLVED", "PENDING", "MISSED", "NOT_APPLICABLE"]),
    reasonCodes: z.array(z.enum(QA_REASON_CODES)).max(4),
  })
  .strict();

export type ConversationQaResult = z.infer<typeof conversationQaResultSchema>;

export function buildQaWorkflowIdempotencyKey(conversationId: string, version: number) {
  return `${conversationId}:qa:${version}`;
}

export function buildQaWorkflowInput(evaluationId: string, version: number) {
  return {
    schemaVersion: CONVERSATION_QA_WORKFLOW_INPUT_SCHEMA_VERSION as 1,
    evaluationId,
    version,
  };
}

export function getQaFailureStatus(attempts: number, maxAttempts: number) {
  return attempts >= Math.min(maxAttempts, CONVERSATION_QA_MAX_ATTEMPTS) ? "DEAD" : "FAILED";
}

const transcriptMessageSchema = z.object({
  body: z.string().max(100_000),
  authorType: z.enum(["VISITOR", "AI", "TEAM"]),
  visibility: z.enum(["PUBLIC", "INTERNAL"]).optional(),
  createdAt: z.string().datetime({ offset: true }),
  retrievalOutcome: z.enum(["SOURCES_FOUND", "NO_MATCH"]).optional(),
  citations: z
    .array(
      z.object({
        title: z.string().max(240),
        excerpt: z.string().max(2_000),
      }),
    )
    .max(4)
    .optional(),
});

export type PublicQaMessage = {
  body: string;
  authorType: "VISITOR" | "AI" | "TEAM";
  createdAt: string;
  retrievalOutcome?: "SOURCES_FOUND" | "NO_MATCH";
  citations?: { title: string; excerpt: string }[];
};

/** Parses only the public text fields consumed by the scorer; no attachments or notes are retained. */
export function parsePublicQaMessages(value: string): PublicQaMessage[] {
  const raw: unknown = JSON.parse(value || "[]");
  const items = z.array(z.unknown()).parse(raw);
  return items.flatMap((item) => {
    if (
      typeof item === "object" &&
      item !== null &&
      "visibility" in item &&
      item.visibility === "INTERNAL"
    ) {
      return [];
    }
    const message = transcriptMessageSchema.parse(item);
    return [
      {
        body: message.body,
        authorType: message.authorType,
        createdAt: message.createdAt,
        ...(message.retrievalOutcome ? { retrievalOutcome: message.retrievalOutcome } : {}),
        ...(message.citations
          ? {
              citations: message.citations.map(({ title, excerpt }) => ({
                title: title.slice(0, 120),
                excerpt: excerpt.slice(0, 1_000),
              })),
            }
          : {}),
      },
    ];
  });
}

export function latestPublicMessageAt(messages: readonly PublicQaMessage[]) {
  return messages.reduce<string | null>((latest, message) => {
    if (!latest || Date.parse(message.createdAt) > Date.parse(latest)) return message.createdAt;
    return latest;
  }, null);
}

export function isConversationQaEligible({
  status,
  latestPublicAt,
  now,
}: {
  status: string;
  latestPublicAt: string | null;
  now: number;
}) {
  if (!latestPublicAt || !Number.isFinite(Date.parse(latestPublicAt))) return false;
  if (status === "CLOSED") return true;
  if (!["OPEN", "ASSIGNED", "ESCALATED"].includes(status)) return false;
  return now - Date.parse(latestPublicAt) >= 24 * 60 * 60 * 1000;
}

export function nextConversationQaVersion({
  currentVersion,
  latestVersion,
  latestPublicAt,
  currentPublicAt,
}: {
  currentVersion: number;
  latestVersion: number | null;
  latestPublicAt: string | null;
  currentPublicAt: string;
}) {
  if (
    latestVersion === null ||
    currentVersion > latestVersion ||
    (latestPublicAt !== null && Date.parse(latestPublicAt) === Date.parse(currentPublicAt))
  ) {
    return currentVersion;
  }
  return latestVersion + 1;
}

export function isConversationQaLowScore(
  result: Pick<ConversationQaResult, "helpfulness" | "grounding" | "escalationOutcome">,
) {
  return (
    result.grounding < 3 ||
    result.escalationOutcome === "MISSED" ||
    (result.helpfulness + result.grounding) / 2 < 3
  );
}

export function buildQaTranscript(messages: readonly PublicQaMessage[]) {
  const selected = messages.slice(-100).map((message) => {
    const retrieval = message.retrievalOutcome ? `\nRetrieval: ${message.retrievalOutcome}` : "";
    const citations =
      message.citations && message.citations.length > 0
        ? `\nCited source excerpts:\n${message.citations
            .map(({ title, excerpt }) => `- ${title}: ${excerpt}`)
            .join("\n")}`
        : "";
    return `${message.authorType} (${message.createdAt}): ${message.body}${retrieval}${citations}`;
  });
  return selected.join("\n").slice(-40_000);
}
