import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db/client";
import { eq, type SQL } from "drizzle-orm";
import {
  contact as contactTable,
  lead as leadTable,
  visitorSession as visitorSessionTable,
  widgetLeadCapture as widgetLeadCaptureTable,
} from "@/lib/db/schema";

export async function submitWidgetLeadCapture({
  db,
  visitorSessionId,
  workspaceId,
  name,
  email,
  phone,
  conversationSummary,
  triggerType,
  triggerValue,
  messageCount,
}: {
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
}) {
  return (db as any).transaction(async (tx: any) => {
    const session = await tx.query.visitorSession.findFirst({
      where: (fields: any, { eq }: any) => eq(fields.id, visitorSessionId),
    });
    if (!session) {
      throw new Error("Session not found");
    }

    let contact = email
      ? await tx.query.contact.findFirst({
          where: (fields: any, { eq, and }: any) =>
            and(eq(fields.workspaceId, workspaceId), eq(fields.email, email)),
        })
      : null;

    if (!contact) {
      const [newContact] = await tx
        .insert(contactTable)
        .values({
          id: randomUUID(),
          workspaceId,
          name: name || "Visitor",
          email: email ?? null,
          updatedAt: new Date().toISOString(),
        })
        .returning();
      contact = newContact;
    } else if (name && contact.name !== name) {
      const [updatedContact] = await tx
        .update(contactTable)
        .set({ name, updatedAt: new Date().toISOString() })
        .where(eq(contactTable.id, contact.id))
        .returning();
      contact = updatedContact;
    }

    let lead: typeof leadTable.$inferSelect | null | undefined = null;
    const orConds: SQL[] = [
      email ? eq(leadTable.email, email) : undefined,
      phone ? eq(leadTable.phone, phone) : undefined,
    ].filter((cond): cond is SQL => cond !== undefined);

    if (orConds.length > 0) {
      lead = await tx.query.lead.findFirst({
        where: (fields: any, { eq, and, or }: any) =>
          and(eq(fields.workspaceId, workspaceId), or(...orConds)),
      });
    }

    if (!lead) {
      const [newLead] = await tx
        .insert(leadTable)
        .values({
          id: randomUUID(),
          workspaceId,
          contactId: contact.id,
          name: name || contact.name,
          email: email ?? contact.email,
          phone: phone ?? null,
          source: "WIDGET",
          status: "new",
          capturedFromChat: true,
          chatSessionId: session.browserSessionId,
          chatSummary: conversationSummary ?? null,
          updatedAt: new Date().toISOString(),
        })
        .returning();
      lead = newLead;
    } else {
      const [updatedLead] = await tx
        .update(leadTable)
        .set({
          contactId: contact.id,
          source: "WIDGET",
          name: name || lead.name,
          email: email ?? lead.email,
          phone: phone ?? lead.phone,
          capturedFromChat: true,
          chatSessionId: session.browserSessionId,
          chatSummary: conversationSummary ?? lead.chatSummary,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(leadTable.id, lead.id))
        .returning();
      lead = updatedLead;
    }

    if (!lead) {
      throw new Error("Failed to create or find lead");
    }

    await tx
      .update(visitorSessionTable)
      .set({
        contactId: contact.id,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(visitorSessionTable.id, visitorSessionId));

    const [capture] = await tx
      .insert(widgetLeadCaptureTable)
      .values({
        id: randomUUID(),
        visitorSessionId,
        leadId: lead!.id,
        triggerType,
        triggerValue: triggerValue ?? null,
        formSubmittedAt: new Date().toISOString(),
        abandoned: false,
        messageCountAtCapture: messageCount,
        conversationSummary: conversationSummary ?? null,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: widgetLeadCaptureTable.visitorSessionId,
        set: {
          leadId: lead!.id,
          triggerType,
          triggerValue: triggerValue ?? null,
          formSubmittedAt: new Date().toISOString(),
          abandoned: false,
          messageCountAtCapture: messageCount,
          conversationSummary: conversationSummary ?? null,
          updatedAt: new Date().toISOString(),
        },
      })
      .returning();

    return { lead, contact, capture };
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
  if (!enableLeadCapture) {
    return { triggered: false, reason: "Lead capture disabled" };
  }

  const existing = await db.query.widgetLeadCapture.findFirst({
    where: (fields, { eq }) => eq(fields.visitorSessionId, visitorSessionId),
  });

  if (existing?.formSubmittedAt) {
    return { triggered: false, reason: "Lead already captured in this session" };
  }

  if (currentMessage && leadCaptureKeywords.length > 0) {
    const lowered = currentMessage.toLowerCase();
    const keyword = leadCaptureKeywords.find((item) => lowered.includes(item.toLowerCase()));
    if (keyword) {
      return { triggered: true, reason: "keyword", triggerType: "keyword", triggerValue: keyword };
    }
  }

  const minutesElapsed = (Date.now() - sessionStartedAt.getTime()) / (1000 * 60);
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
