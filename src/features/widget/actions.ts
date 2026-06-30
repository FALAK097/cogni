"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { eq } from "drizzle-orm";
import { widget as widgetTable } from "@/lib/db/schema";
import {
  normalizeHostname,
  normalizeLauncherSize,
  normalizePosition,
  stringifyJsonArray,
  widgetModelOptions,
  type WidgetModelProvider,
} from "@/features/widget/domain";
import { ensureWorkspaceWidget } from "@/features/widget/server/widget-service";
import { requireAuth, requireDashboardContext } from "@/lib/auth/dashboard-context";

export type WidgetActionState = {
  error?: string;
  savedAt?: number;
};

export type WidgetAgentActionState = {
  error?: string;
  savedAt?: number;
};

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hex color.");

const widgetWidgetSettingsSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  welcomeMessage: z.string().trim().min(1).max(240),
  inputPlaceholder: z.string().trim().min(1).max(80),
  primaryColor: hexColor,
  userBubbleColor: hexColor,
  userBubbleTextColor: hexColor,
  botBubbleColor: hexColor,
  botBubbleTextColor: hexColor,
  headerGradientFrom: hexColor.optional(),
  headerGradientTo: hexColor.optional(),
  backgroundColor: hexColor.optional(),
  textColor: hexColor.optional(),
  theme: z.enum(["light", "dark"]).optional(),
  position: z.enum(["bottom-left", "bottom-right", "LEFT", "RIGHT"]).optional(),
  launcherSize: z.enum(["sm", "md", "lg", "SMALL", "MEDIUM", "LARGE"]).optional(),
  logoUrl: z.union([z.literal(""), z.url()]).optional(),
  instructions: z.string().trim().min(1).max(4_000).optional(),
  escalationKeywords: z.string().trim().min(1).max(500).optional(),
  modelProvider: z.enum(["OPENAI", "GOOGLE"]).optional(),
  modelName: z.string().trim().min(1).max(80).optional(),
  isEnabled: z.boolean().optional(),
  authorizedDomains: z.string().optional(),
  suggestions: z.string().optional(),
  previewMessages: z.string().optional(),
  leadCaptureKeywords: z.string().optional(),
  privacyPolicyUrl: z.string().trim().min(1).max(500).optional(),
  brochureSuggestionText: z.string().trim().min(1).max(120).optional(),
  enableLeadCapture: z.boolean().optional(),
  enableBrochure: z.boolean().optional(),
  showBranding: z.boolean().optional(),
  leadCaptureMinutesThreshold: z.coerce.number().int().min(1).max(120).optional(),
  leadCaptureMessageThreshold: z.coerce.number().int().min(1).max(100).optional(),
});

function formBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function linesToArray(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return [
    ...new Set(
      value
        .split(/[\n,]/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ];
}

export async function saveWidgetWidgetSettingsAction(
  _previousState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  await requireAuth();
  const { db, workspace } = await requireDashboardContext();

  const parsed = widgetWidgetSettingsSchema.safeParse({
    displayName: formData.get("displayName"),
    welcomeMessage: formData.get("welcomeMessage"),
    inputPlaceholder: formData.get("inputPlaceholder"),
    primaryColor: formData.get("primaryColor"),
    userBubbleColor: formData.get("userBubbleColor"),
    userBubbleTextColor: formData.get("userBubbleTextColor"),
    botBubbleColor: formData.get("botBubbleColor"),
    botBubbleTextColor: formData.get("botBubbleTextColor"),
    theme: formData.get("theme"),
    position: formData.get("position"),
    launcherSize: formData.get("launcherSize"),
    logoUrl: formData.get("logoUrl"),
    instructions: formData.get("instructions"),
    modelProvider: formData.get("modelProvider"),
    modelName: formData.get("modelName"),
    isEnabled: formBoolean(formData.get("isEnabled")),
    authorizedDomains: formData.get("authorizedDomains"),
    suggestions: formData.get("suggestions"),
    previewMessages: formData.get("previewMessages"),
    leadCaptureKeywords: formData.get("leadCaptureKeywords"),
    privacyPolicyUrl: formData.get("privacyPolicyUrl"),
    brochureSuggestionText: formData.get("brochureSuggestionText"),
    enableLeadCapture: formBoolean(formData.get("enableLeadCapture")),
    enableBrochure: formBoolean(formData.get("enableBrochure")),
    showBranding: formBoolean(formData.get("showBranding")),
    leadCaptureMinutesThreshold: formData.get("leadCaptureMinutesThreshold"),
    leadCaptureMessageThreshold: formData.get("leadCaptureMessageThreshold"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the widget settings." };
  }

  const provider = (parsed.data.modelProvider ?? "OPENAI") as WidgetModelProvider;
  const modelName = parsed.data.modelName ?? "gpt-5-mini";
  const allowedModels = widgetModelOptions[provider].map((option) => option.value);
  if (!allowedModels.includes(modelName)) {
    return { error: "Choose a supported model for the selected provider." };
  }

  const domains = linesToArray(formData.get("authorizedDomains"))
    .map(normalizeHostname)
    .filter((domain): domain is string => Boolean(domain));

  const widget = await ensureWorkspaceWidget(db, workspace.id);

  await db
    .update(widgetTable)
    .set({
      displayName: parsed.data.displayName,
      welcomeMessage: parsed.data.welcomeMessage,
      inputPlaceholder: parsed.data.inputPlaceholder,
      primaryColor: parsed.data.primaryColor,
      userBubbleColor: parsed.data.userBubbleColor,
      userBubbleTextColor: parsed.data.userBubbleTextColor,
      botBubbleColor: parsed.data.botBubbleColor,
      botBubbleTextColor: parsed.data.botBubbleTextColor,
      theme: parsed.data.theme ?? widget.theme,
      position: normalizePosition(parsed.data.position ?? widget.position),
      launcherSize: normalizeLauncherSize(parsed.data.launcherSize ?? widget.launcherSize),
      logoUrl: parsed.data.logoUrl || null,
      instructions: parsed.data.instructions ?? widget.instructions,
      modelProvider: provider,
      modelName,
      isEnabled: parsed.data.isEnabled ?? widget.isEnabled,
      suggestions: stringifyJsonArray(linesToArray(formData.get("suggestions"))),
      previewMessages: stringifyJsonArray(linesToArray(formData.get("previewMessages"))),
      leadCaptureKeywords: stringifyJsonArray(linesToArray(formData.get("leadCaptureKeywords"))),
      privacyPolicyUrl: parsed.data.privacyPolicyUrl ?? widget.privacyPolicyUrl,
      brochureSuggestionText: parsed.data.brochureSuggestionText ?? widget.brochureSuggestionText,
      enableLeadCapture: parsed.data.enableLeadCapture ?? widget.enableLeadCapture,
      enableBrochure: parsed.data.enableBrochure ?? widget.enableBrochure,
      showBranding: parsed.data.showBranding ?? widget.showBranding,
      leadCaptureMinutesThreshold:
        parsed.data.leadCaptureMinutesThreshold ?? widget.leadCaptureMinutesThreshold,
      leadCaptureMessageThreshold:
        parsed.data.leadCaptureMessageThreshold ?? widget.leadCaptureMessageThreshold,
      authorizedDomains: JSON.stringify(domains),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(widgetTable.id, widget.id));

  revalidatePath("/dashboard/widget");
  return { savedAt: Date.now() };
}

export async function saveWidgetSettingsAction(
  previousState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  await requireAuth();
  return saveWidgetWidgetSettingsAction(previousState, formData);
}

const widgetAgentSettingsSchema = z.object({
  instructions: z.string().trim().min(1).max(4_000),
  escalationKeywords: z.string().trim().min(1).max(500),
});

export async function saveWidgetAgentSettingsAction(
  _previousState: WidgetAgentActionState,
  formData: FormData,
): Promise<WidgetAgentActionState> {
  await requireAuth();
  const { db, workspace } = await requireDashboardContext();

  const parsed = widgetAgentSettingsSchema.safeParse({
    instructions: formData.get("instructions"),
    escalationKeywords: formData.get("escalationKeywords"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the agent settings." };
  }
  const widget = await ensureWorkspaceWidget(db, workspace.id);

  await db
    .update(widgetTable)
    .set({
      instructions: parsed.data.instructions,
      escalationKeywords: parsed.data.escalationKeywords,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(widgetTable.id, widget.id));

  revalidatePath("/dashboard/agent");
  revalidatePath("/dashboard/widget");
  return { savedAt: Date.now() };
}
