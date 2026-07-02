import "server-only";

import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

import type { WidgetModelProvider } from "@/features/widget/domain";
import { env } from "@/lib/env/server";

let openAIProvider: ReturnType<typeof createOpenAI> | undefined;
let googleProvider: ReturnType<typeof createGoogle> | undefined;

function getOpenAIProvider() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  openAIProvider ??= createOpenAI({ apiKey: env.OPENAI_API_KEY });
  return openAIProvider;
}

function getGoogleProvider() {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  googleProvider ??= createGoogle({ apiKey: env.GEMINI_API_KEY });
  return googleProvider;
}

export function getWidgetModel(provider: WidgetModelProvider, modelName: string) {
  return provider === "GOOGLE" ? getGoogleProvider()(modelName) : getOpenAIProvider()(modelName);
}
