import { streamText } from "ai";

import type { WidgetModelProvider } from "@/features/widget/domain";
import { retrieveKnowledgeContext } from "@/features/knowledge/server/retrieval";
import { getWidgetModel } from "@/lib/ai/providers";

type WidgetAgentConfig = {
  displayName: string;
  instructions: string;
  escalationKeywords: string;
  modelProvider: WidgetModelProvider;
  modelName: string;
  workspaceName: string;
  workspaceId: string;
  latestUserMessage: string;
  memoryContext?: string;
};

export async function streamWidgetAgent({
  config,
  messages,
  onError,
  onFinish,
}: {
  config: WidgetAgentConfig;
  messages: import("ai").UIMessage[];
  onError: (error: unknown) => void;
  onFinish: (result: {
    text: string;
    inputTokens: number | undefined;
    outputTokens: number | undefined;
    sources: { documentId: string; title: string }[];
  }) => Promise<void>;
}) {
  const sources = await retrieveKnowledgeContext(config.workspaceId, config.latestUserMessage);
  const sourceBlock =
    sources.length > 0
      ? sources
          .map(
            (source, index) =>
              `[Source ${index + 1}: ${source.title}]\n${source.content.slice(0, 1200)}`,
          )
          .join("\n\n")
      : "No knowledge sources matched this question.";

  const { convertToModelMessages } = await import("ai");

  return streamText({
    model: getWidgetModel(config.modelProvider, config.modelName),
    system: [
      `You are ${config.displayName}, the AI support assistant for ${config.workspaceName}.`,
      config.instructions,
      "Use retrieved knowledge when it is relevant. Cite sources inline like [Source: Title].",
      "If knowledge is insufficient, say you do not know and offer human help.",
      "Be concise and helpful.",
      config.memoryContext ? `\nConversation memory:\n${config.memoryContext}` : "",
      `\nRetrieved knowledge:\n${sourceBlock}`,
    ]
      .filter(Boolean)
      .join("\n"),
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text, totalUsage }) => {
      const citationSuffix =
        sources.length > 0
          ? `\n\nSources:\n${sources.map((source) => `- ${source.title}`).join("\n")}`
          : "";
      const finalText = text.includes("Sources:") ? text : `${text}${citationSuffix}`;

      await onFinish({
        text: finalText,
        inputTokens: totalUsage.inputTokens,
        outputTokens: totalUsage.outputTokens,
        sources: sources.map((source) => ({
          documentId: source.documentId,
          title: source.title,
        })),
      });
    },
    onError: ({ error }) => {
      onError(error);
    },
  });
}

export async function streamHandoffMessage({
  config,
  text,
  onFinish,
}: {
  config: Pick<WidgetAgentConfig, "modelProvider" | "modelName">;
  text: string;
  onFinish: (result: { text: string }) => Promise<void>;
}) {
  const result = streamText({
    model: getWidgetModel(config.modelProvider, config.modelName),
    system: "Repeat the user-provided message exactly. Do not add anything else.",
    prompt: text,
    onFinish: async ({ text: output }) => {
      await onFinish({ text: output });
    },
  });

  return result;
}
