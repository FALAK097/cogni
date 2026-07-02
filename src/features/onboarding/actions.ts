"use server";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { processDocument } from "@/features/knowledge/server/process-document";
import { AGENT_SETUP_COOKIE } from "@/features/onboarding/agent-setup-cookie";
import { normalizeHostname } from "@/features/widget/domain";
import { ensureWorkspaceWidget } from "@/features/widget/server/widget-service";
import { requireAuth, requireDashboardContext } from "@/lib/auth/dashboard-context";
import {
  contact,
  document as documentTable,
  workspace,
  widget as widgetTable,
} from "@/lib/db/schema";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { saveObject, isAllowedKnowledgeUpload } from "@/lib/storage/index";

import { buildLeadTags, calculateLeadScore } from "./lead-scoring";
import { ONBOARDING_COMPLETED_EVENT } from "./queries";
import type { OnboardingData } from "./types";

export type OnboardingActionState = {
  error?: string;
  success?: boolean;
};

export async function startAgentSetupAction(): Promise<void> {
  await requireAuth();
  await requireDashboardContext();

  const cookieStore = await cookies();
  cookieStore.set(AGENT_SETUP_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  redirect("/onboarding");
}

export async function cancelAgentSetupAction(): Promise<void> {
  await requireAuth();
  await requireDashboardContext();

  const cookieStore = await cookies();
  cookieStore.delete(AGENT_SETUP_COOKIE);

  redirect("/backstage");
}

const onboardingSchema = z.object({
  referralSource: z.string().optional(),
  companySize: z.enum(["startup", "small", "midmarket", "enterprise"]).optional(),
  website: z.string().optional(),
  instructions: z.string().optional(),
  agentType: z.enum(["customer-support", "sales-agent", "shopping-assistant"]).optional(),
  tools: z.array(z.string()).optional(),
  deploymentChannels: z.array(z.string()).optional(),
  hasKnowledgeSources: z.boolean().optional(),
});

function extractDomainName(website: string): string {
  const cleaned =
    website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0] ?? "";
  const base = cleaned.split(".")[0] ?? "";
  if (!base) return "Agent";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function normalizeWebsiteUrl(website: string): string {
  const trimmed = website.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

export async function addWebsiteSourceAction(
  _previous: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  await requireAuth();
  const { db, workspace: ws } = await requireDashboardContext();

  const website = formData.get("website");
  if (typeof website !== "string" || !website.trim()) {
    return { error: "Enter a valid website URL." };
  }

  const sourceUrl = normalizeWebsiteUrl(website);
  const hostname = normalizeHostname(sourceUrl);
  if (!hostname) {
    return { error: "Enter a valid website URL." };
  }

  const [document] = await db
    .insert(documentTable)
    .values({
      id: randomUUID(),
      workspaceId: ws.id,
      title: hostname,
      sourceType: "URL",
      sourceUrl,
      status: "PROCESSING",
      updatedAt: new Date().toISOString(),
    })
    .returning();

  try {
    await processDocument({
      db,
      workspaceId: ws.id,
      documentId: document.id,
      idempotencyKey: `document:onboarding:url:${document.id}`,
    });
    await emitDomainEvent({
      db,
      workspaceId: ws.id,
      type: "document.ready",
      entityId: document.id,
    });
  } catch {
    return { error: "Could not process that website." };
  }

  const widget = await ensureWorkspaceWidget(db, ws.id);
  const domains = JSON.parse(widget.authorizedDomains || "[]") as string[];
  if (!domains.includes(hostname)) {
    domains.push(hostname);
    await db
      .update(widgetTable)
      .set({
        authorizedDomains: JSON.stringify(domains),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(widgetTable.id, widget.id));
  }

  return { success: true };
}

export async function uploadOnboardingFileAction(
  formData: FormData,
): Promise<OnboardingActionState> {
  await requireAuth();
  const { db, workspace: ws } = await requireDashboardContext();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Select a file to upload." };
  }

  const title = file.name.replace(/\.[^.]+$/, "") || "Uploaded document";
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";

  if (!isAllowedKnowledgeUpload(mimeType, bytes.length)) {
    return { error: "Unsupported file type. Use PDF, DOCX, or TXT." };
  }

  const sourceType =
    mimeType === "application/pdf"
      ? "PDF"
      : mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ? "DOCX"
        : "TXT";

  const saved = await saveObject({
    workspaceId: ws.id,
    filename: file.name,
    mimeType,
    bytes,
  });

  const [document] = await db
    .insert(documentTable)
    .values({
      id: randomUUID(),
      workspaceId: ws.id,
      title,
      sourceType,
      storageKey: saved.storageKey,
      mimeType,
      status: "PROCESSING",
      updatedAt: new Date().toISOString(),
    })
    .returning();

  try {
    await processDocument({
      db,
      workspaceId: ws.id,
      documentId: document.id,
      idempotencyKey: `document:onboarding:upload:${document.id}`,
    });
    await emitDomainEvent({
      db,
      workspaceId: ws.id,
      type: "document.ready",
      entityId: document.id,
    });
  } catch {
    return { error: "Could not process that file." };
  }

  return { success: true };
}

export async function completeOnboardingAction(
  _previous: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  await requireAuth();
  const { db, workspace: ws, session } = await requireDashboardContext();

  const raw = formData.get("data");
  if (typeof raw !== "string") {
    return { error: "Missing onboarding data." };
  }

  let parsed: z.infer<typeof onboardingSchema>;
  try {
    const json = JSON.parse(raw) as unknown;
    const result = onboardingSchema.safeParse(json);
    if (!result.success) {
      return { error: "Invalid onboarding data." };
    }
    parsed = result.data;
  } catch {
    return { error: "Invalid onboarding data." };
  }

  const data: OnboardingData = {
    referralSource: parsed.referralSource as OnboardingData["referralSource"],
    companySize: parsed.companySize,
    website: parsed.website,
    instructions: parsed.instructions,
    agentType: parsed.agentType,
    tools: parsed.tools,
    deploymentChannels: parsed.deploymentChannels as OnboardingData["deploymentChannels"],
    hasKnowledgeSources: parsed.hasKnowledgeSources,
  };

  const { score, category } = calculateLeadScore(data);
  const tags = buildLeadTags(data, score, category);
  const now = new Date().toISOString();

  const widget = await ensureWorkspaceWidget(db, ws.id);
  const agentName = data.website ? `${extractDomainName(data.website)} Agent` : widget.displayName;

  const domains = data.website
    ? [normalizeHostname(normalizeWebsiteUrl(data.website))].filter(Boolean)
    : (JSON.parse(widget.authorizedDomains || "[]") as string[]);

  await db
    .update(widgetTable)
    .set({
      displayName: agentName,
      instructions: data.instructions ?? widget.instructions,
      authorizedDomains: JSON.stringify(domains),
      updatedAt: now,
    })
    .where(eq(widgetTable.id, widget.id));

  if (data.website) {
    const companyName = extractDomainName(data.website);
    await db
      .update(workspace)
      .set({
        name: companyName,
        updatedAt: now,
      })
      .where(eq(workspace.id, ws.id));
  }

  const existingContact = await db.query.contact.findFirst({
    where: (fields, { and, eq: eqFn }) =>
      and(eqFn(fields.workspaceId, ws.id), eqFn(fields.email, session.user.email)),
  });

  if (existingContact) {
    await db
      .update(contact)
      .set({
        tags: JSON.stringify(tags),
        updatedAt: now,
      })
      .where(eq(contact.id, existingContact.id));
  } else {
    await db.insert(contact).values({
      id: randomUUID(),
      workspaceId: ws.id,
      name: session.user.name,
      email: session.user.email,
      tags: JSON.stringify(tags),
      updatedAt: now,
    });
  }

  await emitDomainEvent({
    db,
    workspaceId: ws.id,
    type: ONBOARDING_COMPLETED_EVENT,
    entityId: session.user.id,
    payload: {
      ...data,
      leadScore: score,
      leadCategory: category,
      completedAt: now,
    },
  });

  revalidatePath("/agents");
  revalidatePath("/backstage");

  const cookieStore = await cookies();
  cookieStore.delete(AGENT_SETUP_COOKIE);

  return { success: true };
}
