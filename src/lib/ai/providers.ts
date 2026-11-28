import "server-only";

import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

import type { WidgetModelProvider } from "@/features/widget/domain";
import { env } from "@/lib/env/server";

function getOpenAIProvider() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return createOpenAI({ apiKey: env.OPENAI_API_KEY });
}

function getGoogleProvider() {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return createGoogle({ apiKey: env.GEMINI_API_KEY });
}

export function getWidgetModel(provider: WidgetModelProvider, modelName: string) {
  const identity = resolveWidgetModelIdentity(provider, modelName);

  return identity.modelProvider === "GOOGLE"
    ? getGoogleProvider()(identity.modelName)
    : getOpenAIProvider()(identity.modelName);
}

/** Mirrors the provider/model identity used by getWidgetModel, including workspace overrides. */
export function resolveWidgetModelIdentity(provider: WidgetModelProvider, modelName: string) {
  return {
    modelProvider: env.WIDGET_MODEL_PROVIDER ?? provider,
    modelName: env.WIDGET_MODEL_NAME ?? modelName,
  };
}
