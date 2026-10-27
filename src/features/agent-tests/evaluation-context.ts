import { createHash } from "node:crypto";

import type { WidgetModelProvider } from "@/features/widget/domain";

export const AGENT_TEST_EVALUATION_CONTEXT_BASIS = "widget-draft-revision-v1" as const;

/**
 * Fingerprints the widget's persisted draft revision and effective model identity. The source
 * revision is updated by every dashboard widget-settings mutation; private instructions and
 * source content are deliberately excluded to prevent the digest from exposing low-entropy text.
 */
export function resolveAgentTestModelIdentity(
  widget: {
    id: string;
    updatedAt: string | number;
    modelProvider: WidgetModelProvider;
    modelName: string;
  },
  overrides: { provider?: WidgetModelProvider; modelName?: string },
) {
  const modelProvider = overrides.provider ?? widget.modelProvider;
  const modelName = overrides.modelName ?? widget.modelName;
  const configFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        basis: AGENT_TEST_EVALUATION_CONTEXT_BASIS,
        widgetId: widget.id,
        widgetUpdatedAt: widget.updatedAt,
        modelProvider,
        modelName,
      }),
    )
    .digest("hex");

  return { modelProvider, modelName, configFingerprint };
}
