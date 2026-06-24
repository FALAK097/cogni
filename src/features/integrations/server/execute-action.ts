import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

import { randomUUID } from "node:crypto";
import { generateText, stepCountIs } from "ai";

import { getComposioToolsForProvider } from "@/features/integrations/server/composio";
import type { WidgetModelProvider } from "@/features/widget/domain";
import { getWidgetModel } from "@/lib/ai/providers";

function normalizeModelProvider(provider: string): WidgetModelProvider {
  return provider === "GOOGLE" ? "GOOGLE" : "OPENAI";
}

function buildIntegrationPrompt({
  provider,
  actionType,
  payload,
}: {
  provider: string;
  actionType: string;
  payload: Record<string, unknown>;
}) {
  return [
    `Provider: ${provider}`,
    `Action: ${actionType}`,
    "Execute this workspace integration action using the available tool.",
    "Use only values present in the payload. Do not invent recipients, channels, dates, or message content.",
    "If required values are missing, explain what is missing and do not call a tool.",
    `Payload JSON:\n${JSON.stringify(payload)}`,
  ].join("\n");
}

export async function executeIntegrationAction({
  db,
  workspaceId,
  provider,
  actionType,
  payload,
  requestedById,
  idempotencyKey = randomUUID(),
}: {
  db: PrismaClient;
  workspaceId: string;
  provider: string;
  actionType: string;
  payload: Record<string, unknown>;
  requestedById?: string;
  idempotencyKey?: string;
}) {
  const existing = await db.integrationAction.findUnique({ where: { idempotencyKey } });
  if (existing) return existing;

  const integration = await db.integration.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId,
        provider,
      },
    },
  });

  if (!integration || integration.status !== "CONNECTED") {
    return db.integrationAction.create({
      data: {
        workspaceId,
        provider,
        actionType,
        idempotencyKey,
        requestedById,
        status: "FAILED",
        payload: JSON.stringify(payload),
        errorMessage: `${provider} is not connected.`,
      },
    });
  }

  const tools = await getComposioToolsForProvider({
    workspaceId,
    provider,
  });
  if (Object.keys(tools).length > 0) {
    const widget = await db.widget.findUnique({
      where: { workspaceId },
      select: { modelProvider: true, modelName: true },
    });

    if (!widget) {
      return db.integrationAction.create({
        data: {
          workspaceId,
          provider,
          actionType,
          idempotencyKey,
          requestedById,
          status: "FAILED",
          payload: JSON.stringify(payload),
          errorMessage: "Widget model configuration was not found.",
        },
      });
    }

    try {
      const result = await generateText({
        model: getWidgetModel(normalizeModelProvider(widget.modelProvider), widget.modelName),
        tools,
        prompt: buildIntegrationPrompt({ provider, actionType, payload }),
        stopWhen: stepCountIs(5),
      });

      return db.integrationAction.create({
        data: {
          workspaceId,
          provider,
          actionType,
          idempotencyKey,
          requestedById,
          payload: JSON.stringify(payload),
          status: "COMPLETED",
          result: JSON.stringify({
            message: result.text,
            simulated: false,
          }),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Composio action failed.";
      return db.integrationAction.create({
        data: {
          workspaceId,
          provider,
          actionType,
          idempotencyKey,
          requestedById,
          status: "FAILED",
          payload: JSON.stringify(payload),
          errorMessage: message,
        },
      });
    }
  }

  const action = await db.integrationAction.create({
    data: {
      workspaceId,
      provider,
      actionType,
      idempotencyKey,
      requestedById,
      payload: JSON.stringify(payload),
      status: "COMPLETED",
      result: JSON.stringify({
        message: `${actionType} queued for ${provider}.`,
        simulated: true,
      }),
    },
  });

  return action;
}
