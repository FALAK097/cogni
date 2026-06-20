import "server-only";

import type { UIMessage } from "ai";
import { convertToModelMessages, streamText } from "ai";

import type { WidgetModelProvider } from "@/features/widget/domain";
import { getWidgetModel } from "@/lib/ai/providers";

type WidgetAgentConfig = {
  displayName: string;
  instructions: string;
  modelProvider: WidgetModelProvider;
  modelName: string;
  workspaceName: string;
};

export async function streamWidgetAgent({
  config,
  messages,
  onError,
  onFinish,
}: {
  config: WidgetAgentConfig;
  messages: UIMessage[];
  onError: (error: unknown) => void;
  onFinish: (result: {
    text: string;
    inputTokens: number | undefined;
    outputTokens: number | undefined;
  }) => Promise<void>;
}) {
  return streamText({
    model: getWidgetModel(config.modelProvider, config.modelName),
    system: [
      `You are ${config.displayName}, the AI support assistant for ${config.workspaceName}.`,
      config.instructions,
      "Be concise and helpful.",
      "Do not invent company policies or facts.",
      "If the available context is insufficient, say you do not know and suggest contacting a human.",
    ].join("\n"),
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text, totalUsage }) => {
      await onFinish({
        text,
        inputTokens: totalUsage.inputTokens,
        outputTokens: totalUsage.outputTokens,
      });
    },
    onError: ({ error }) => {
      onError(error);
    },
  });
}
