import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { runDbWriteOperation, type Db } from "@/lib/db/client";
import { contact, visitorSession } from "@/lib/db/schema";

type CaptureInput = {
  db: Db;
  visitorSessionId: string;
  workspaceId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  conversationSummary?: string | null;
  triggerType: string;
  triggerValue?: string | null;
  messageCount: number;
};

export async function submitWidgetLeadCapture(input: CaptureInput) {
  return runDbWriteOperation(input.db, async (tx) => {
    const session = await tx.query.visitorSession.findFirst({
      where: (fields, { eq }) => eq(fields.id, input.visitorSessionId),
      with: { widget: { columns: { workspaceId: true } } },
    });
    if (!session || session.widget.workspaceId !== input.workspaceId) {
      throw new Error("Session not found");
    }

    const capturedAt = new Date().toISOString();
    const existing = input.email
      ? await tx.query.contact.findFirst({
          where: (fields, { and, eq }) =>
            and(eq(fields.workspaceId, input.workspaceId), eq(fields.email, input.email!)),
        })
      : null;
    const captureContext = JSON.stringify({
      triggerType: input.triggerType,
      triggerValue: input.triggerValue ?? null,
      messageCount: input.messageCount,
      conversationSummary: input.conversationSummary ?? null,
    });

    const [savedContact] = existing
      ? await tx
          .update(contact)
          .set({
            name: input.name || existing.name,
            phone: input.phone ?? existing.phone,
            source: "WIDGET",
            capturedAt,
            captureContext,
            updatedAt: capturedAt,
          })
          .where(and(eq(contact.id, existing.id), eq(contact.workspaceId, input.workspaceId)))
          .returning()
      : await tx
          .insert(contact)
          .values({
            id: randomUUID(),
            workspaceId: input.workspaceId,
            name: input.name || "Visitor",
            email: input.email ?? null,
            phone: input.phone ?? null,
            source: "WIDGET",
            capturedAt,
            captureContext,
            updatedAt: capturedAt,
          })
          .returning();
    if (!savedContact) throw new Error("Contact capture failed");

    await tx
      .update(visitorSession)
      .set({
        contactId: savedContact.id,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        leadCapturedAt: capturedAt,
        updatedAt: capturedAt,
      })
      .where(eq(visitorSession.id, input.visitorSessionId));

    return { contact: savedContact };
  });
}

export async function detectLeadCaptureTrigger({
  db,
  visitorSessionId,
  enableLeadCapture,
  leadCaptureKeywords,
  leadCaptureMinutesThreshold,
  leadCaptureMessageThreshold,
  currentMessage,
  messageCount,
  sessionStartedAt,
}: {
  db: Db;
  visitorSessionId: string;
  enableLeadCapture: boolean;
  leadCaptureKeywords: string[];
  leadCaptureMinutesThreshold: number;
  leadCaptureMessageThreshold: number;
  currentMessage?: string;
  messageCount: number;
  sessionStartedAt: Date;
}) {
  if (!enableLeadCapture) return { triggered: false, reason: "Lead capture disabled" };
  const session = await db.query.visitorSession.findFirst({
    where: (fields, { eq }) => eq(fields.id, visitorSessionId),
    columns: { leadCapturedAt: true },
  });
  if (session?.leadCapturedAt) {
    return { triggered: false, reason: "Contact already captured in this session" };
  }
  if (currentMessage) {
    const lowered = currentMessage.toLowerCase();
    const keyword = leadCaptureKeywords.find((item) => lowered.includes(item.toLowerCase()));
    if (keyword) {
      return { triggered: true, reason: "keyword", triggerType: "keyword", triggerValue: keyword };
    }
  }
  const minutesElapsed = (Date.now() - sessionStartedAt.getTime()) / 60_000;
  if (minutesElapsed >= leadCaptureMinutesThreshold) {
    return {
      triggered: true,
      reason: "time",
      triggerType: "time",
      triggerValue: String(leadCaptureMinutesThreshold),
    };
  }
  if (messageCount >= leadCaptureMessageThreshold) {
    return {
      triggered: true,
      reason: "messages",
      triggerType: "messages",
      triggerValue: String(leadCaptureMessageThreshold),
    };
  }
  return { triggered: false, reason: "No trigger conditions met" };
}
