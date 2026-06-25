import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

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
  db: PrismaClient;
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
  return db.$transaction(async (tx) => {
    const session = await tx.visitorSession.findUnique({
      where: { id: visitorSessionId },
    });
    if (!session) {
      throw new Error("Session not found");
    }

    let contact = email
      ? await tx.contact.findFirst({
          where: {
            workspaceId,
            email,
          },
        })
      : null;

    if (!contact) {
      contact = await tx.contact.create({
        data: {
          workspaceId,
          name: name || "Visitor",
          email: email ?? null,
        },
      });
    } else if (name && contact.name !== name) {
      contact = await tx.contact.update({
        where: { id: contact.id },
        data: { name },
      });
    }

    let lead = await tx.lead.findFirst({
      where: {
        workspaceId,
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
    });

    if (!lead) {
      lead = await tx.lead.create({
        data: {
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
        },
      });
    } else {
      lead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          contactId: contact.id,
          source: "WIDGET",
          name: name || lead.name,
          email: email ?? lead.email,
          phone: phone ?? lead.phone,
          capturedFromChat: true,
          chatSessionId: session.browserSessionId,
          chatSummary: conversationSummary ?? lead.chatSummary,
        },
      });
    }

    await tx.visitorSession.update({
      where: { id: visitorSessionId },
      data: { contactId: contact.id },
    });

    const capture = await tx.widgetLeadCapture.upsert({
      where: { visitorSessionId },
      update: {
        leadId: lead.id,
        triggerType,
        triggerValue: triggerValue ?? null,
        formSubmittedAt: new Date(),
        abandoned: false,
        messageCountAtCapture: messageCount,
        conversationSummary: conversationSummary ?? null,
      },
      create: {
        visitorSessionId,
        leadId: lead.id,
        triggerType,
        triggerValue: triggerValue ?? null,
        formSubmittedAt: new Date(),
        messageCountAtCapture: messageCount,
        conversationSummary: conversationSummary ?? null,
      },
    });

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
  db: PrismaClient;
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

  const existing = await db.widgetLeadCapture.findUnique({
    where: { visitorSessionId },
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
