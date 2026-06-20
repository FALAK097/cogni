"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  normalizeHostname,
  widgetModelOptions,
  type WidgetLauncherSize,
  type WidgetModelProvider,
  type WidgetPosition,
} from "@/features/widget/domain";
import { ensureWorkspaceWidget } from "@/features/widget/server/widget-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export type WidgetActionState = {
  error?: string;
  savedAt?: number;
};

export type WidgetAgentActionState = {
  error?: string;
  savedAt?: number;
};

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hex color.");
const widgetSettingsSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  welcomeMessage: z.string().trim().min(1).max(240),
  inputPlaceholder: z.string().trim().min(1).max(80),
  primaryColor: hexColor,
  backgroundColor: hexColor,
  textColor: hexColor,
  position: z.enum(["LEFT", "RIGHT"]),
  launcherSize: z.enum(["SMALL", "MEDIUM", "LARGE"]),
  panelWidth: z.coerce.number().int().min(320).max(520),
  panelHeight: z.coerce.number().int().min(480).max(800),
  borderRadius: z.coerce.number().int().min(0).max(32),
  logoUrl: z.union([z.literal(""), z.url()]),
  instructions: z.string().trim().min(1).max(4_000),
  escalationKeywords: z.string().trim().min(1).max(500).optional(),
  modelProvider: z.enum(["OPENAI", "GOOGLE"]),
  modelName: z.string().trim().min(1).max(80),
  isEnabled: z.boolean(),
  authorizedDomains: z.string(),
});

function formBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

export async function saveWidgetSettingsAction(
  _previousState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  const parsed = widgetSettingsSchema.safeParse({
    displayName: formData.get("displayName"),
    welcomeMessage: formData.get("welcomeMessage"),
    inputPlaceholder: formData.get("inputPlaceholder"),
    primaryColor: formData.get("primaryColor"),
    backgroundColor: formData.get("backgroundColor"),
    textColor: formData.get("textColor"),
    position: formData.get("position"),
    launcherSize: formData.get("launcherSize"),
    panelWidth: formData.get("panelWidth"),
    panelHeight: formData.get("panelHeight"),
    borderRadius: formData.get("borderRadius"),
    logoUrl: formData.get("logoUrl"),
    instructions: formData.get("instructions"),
    escalationKeywords: formData.get("escalationKeywords"),
    modelProvider: formData.get("modelProvider"),
    modelName: formData.get("modelName"),
    isEnabled: formBoolean(formData.get("isEnabled")),
    authorizedDomains: formData.get("authorizedDomains"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the widget settings." };
  }

  const provider = parsed.data.modelProvider as WidgetModelProvider;
  const allowedModels = widgetModelOptions[provider].map((option) => option.value);

  if (!allowedModels.includes(parsed.data.modelName)) {
    return { error: "Choose a supported model for the selected provider." };
  }

  const domains = [
    ...new Set(
      parsed.data.authorizedDomains
        .split(/[\n,]/)
        .map(normalizeHostname)
        .filter((domain): domain is string => Boolean(domain)),
    ),
  ];

  const { db, workspace } = await requireDashboardContext();
  const widget = await ensureWorkspaceWidget(db, workspace.id);

  await db.widget.update({
    where: { id: widget.id },
    data: {
      displayName: parsed.data.displayName,
      welcomeMessage: parsed.data.welcomeMessage,
      inputPlaceholder: parsed.data.inputPlaceholder,
      primaryColor: parsed.data.primaryColor,
      backgroundColor: parsed.data.backgroundColor,
      textColor: parsed.data.textColor,
      position: parsed.data.position as WidgetPosition,
      launcherSize: parsed.data.launcherSize as WidgetLauncherSize,
      panelWidth: parsed.data.panelWidth,
      panelHeight: parsed.data.panelHeight,
      borderRadius: parsed.data.borderRadius,
      logoUrl: parsed.data.logoUrl || null,
      instructions: parsed.data.instructions,
      escalationKeywords: parsed.data.escalationKeywords ?? widget.escalationKeywords,
      modelProvider: provider,
      modelName: parsed.data.modelName,
      isEnabled: parsed.data.isEnabled,
      authorizedDomains: {
        deleteMany: {},
        create: domains.map((hostname) => ({ hostname })),
      },
    },
  });

  console.info("widget.settings.updated", {
    workspaceId: workspace.id,
    widgetId: widget.id,
    authorizedDomainCount: domains.length,
  });

  revalidatePath("/dashboard/widget");
  return { savedAt: Date.now() };
}

const widgetAgentSettingsSchema = z.object({
  instructions: z.string().trim().min(1).max(4_000),
  escalationKeywords: z.string().trim().min(1).max(500),
});

export async function saveWidgetAgentSettingsAction(
  _previousState: WidgetAgentActionState,
  formData: FormData,
): Promise<WidgetAgentActionState> {
  const parsed = widgetAgentSettingsSchema.safeParse({
    instructions: formData.get("instructions"),
    escalationKeywords: formData.get("escalationKeywords"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the agent settings." };
  }

  const { db, workspace } = await requireDashboardContext();
  const widget = await ensureWorkspaceWidget(db, workspace.id);

  await db.widget.update({
    where: { id: widget.id },
    data: {
      instructions: parsed.data.instructions,
      escalationKeywords: parsed.data.escalationKeywords,
    },
  });

  revalidatePath("/dashboard/agent");
  revalidatePath("/dashboard/widget");
  return { savedAt: Date.now() };
}
