import "server-only";

import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

import { env } from "@/lib/env/server";

export async function embedText(text: string) {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  const normalized = text.trim().slice(0, 8_000);
  if (!normalized) {
    return null;
  }

  const result = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: normalized,
  });

  return result.embedding;
}
