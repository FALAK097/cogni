import "server-only";

import { and, eq } from "drizzle-orm";

import { runDbWriteOperation, type Db } from "@/lib/db/client";
import { contact } from "@/lib/db/schema";

export function parseContactTags(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      ),
    ].slice(0, 50);
  } catch {
    return [];
  }
}

export type ContactTagUpdateResult =
  | { kind: "updated"; tags: string[] }
  | { kind: "not-found" }
  | { kind: "limit" };

export async function changeContactTag({
  db,
  workspaceId,
  contactId,
  action,
  tag: rawTag,
}: {
  db: Db;
  workspaceId: string;
  contactId: string;
  action: "add" | "remove";
  tag: string;
}): Promise<ContactTagUpdateResult> {
  const tag = rawTag.trim().toLowerCase();
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,49}$/u.test(tag)) {
    throw new Error(
      "Contact tags must be 1–50 letters, numbers, spaces, periods, underscores or hyphens.",
    );
  }

  return runDbWriteOperation(db, async (transaction): Promise<ContactTagUpdateResult> => {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const [contactRow] = await transaction
        .select({ tags: contact.tags })
        .from(contact)
        .where(and(eq(contact.id, contactId), eq(contact.workspaceId, workspaceId)))
        .limit(1);

      if (!contactRow) return { kind: "not-found" };
      const currentTags = parseContactTags(contactRow.tags);
      const hasTag = currentTags.includes(tag);
      if (action === "add" && !hasTag && currentTags.length >= 50) {
        return { kind: "limit" };
      }

      const nextTags =
        action === "add"
          ? hasTag
            ? currentTags
            : [...currentTags, tag]
          : currentTags.filter((existingTag) => existingTag !== tag);

      if (
        nextTags.length !== currentTags.length ||
        nextTags.some((entry, index) => entry !== currentTags[index])
      ) {
        const updated = await transaction
          .update(contact)
          .set({ tags: JSON.stringify(nextTags), updatedAt: new Date().toISOString() })
          .where(
            and(
              eq(contact.id, contactId),
              eq(contact.workspaceId, workspaceId),
              eq(contact.tags, contactRow.tags),
            ),
          )
          .returning({ id: contact.id });
        if (updated.length === 0) continue;
      }

      return { kind: "updated", tags: nextTags };
    }
    throw new Error("Contact tags were updated concurrently. Try again.");
  });
}
