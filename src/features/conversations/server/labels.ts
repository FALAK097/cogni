import "server-only";

import { and, eq } from "drizzle-orm";

import { runDbWriteOperation, type Db } from "@/lib/db/client";
import { conversation } from "@/lib/db/schema";
import { conversationLabelSchema } from "@/features/conversations/inbox-pagination";
import { recordConversationEvent } from "@/features/conversations/server/conversation-service";

export function parseConversationLabels(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed
          .filter((label): label is string => typeof label === "string")
          .map((label) => label.trim().toLowerCase())
          .filter((label) => conversationLabelSchema.safeParse(label).success),
      ),
    ].slice(0, 50);
  } catch {
    return [];
  }
}

export type ConversationLabelUpdateResult =
  | { kind: "updated"; labels: string[] }
  | { kind: "not-found" }
  | { kind: "limit" };

export async function changeConversationLabel({
  db,
  workspaceId,
  conversationId,
  action,
  label: rawLabel,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  action: "add" | "remove";
  label: string;
}): Promise<ConversationLabelUpdateResult> {
  const parsedLabel = conversationLabelSchema.safeParse(rawLabel);
  if (!parsedLabel.success) throw new Error("Enter a valid conversation label.");
  const label = parsedLabel.data.toLowerCase();

  return runDbWriteOperation(db, async (transaction): Promise<ConversationLabelUpdateResult> => {
    const [conversationRow] = await transaction
      .select({ labels: conversation.labels })
      .from(conversation)
      .where(and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspaceId)))
      .for("update");

    if (!conversationRow) return { kind: "not-found" };
    const currentLabels = parseConversationLabels(conversationRow.labels);
    const hasLabel = currentLabels.includes(label);
    if (action === "add" && !hasLabel && currentLabels.length >= 50) {
      return { kind: "limit" };
    }

    const nextLabels =
      action === "add"
        ? hasLabel
          ? currentLabels
          : [...currentLabels, label]
        : currentLabels.filter((existingLabel) => existingLabel !== label);

    if (
      nextLabels.length !== currentLabels.length ||
      nextLabels.some((entry, index) => entry !== currentLabels[index])
    ) {
      await transaction
        .update(conversation)
        .set({ labels: JSON.stringify(nextLabels), updatedAt: new Date().toISOString() })
        .where(and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspaceId)));
      await recordConversationEvent(transaction, workspaceId, conversationId, "state");
    }

    return { kind: "updated", labels: nextLabels };
  });
}
