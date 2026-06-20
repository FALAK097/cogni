export const WORKSPACE_LIMIT_REACHED_MESSAGE = "Workspace limit reached.";

export function getPlanLimits(_planType?: string | null) {
  return {
    workspaces: Number.POSITIVE_INFINITY,
    knowledgeBases: Number.POSITIVE_INFINITY,
    documents: Number.POSITIVE_INFINITY,
    knowledgeBaseSources: Number.POSITIVE_INFINITY,
  };
}

export function isUnlimited(limit: number) {
  return !Number.isFinite(limit);
}

export function knowledgeBaseLimitMessage(limit: number) {
  return `You can create up to ${limit} knowledge bases on your plan.`;
}

export function knowledgeBaseSourceLimitMessage(limit: number) {
  return `You can add up to ${limit} sources per knowledge base on your plan.`;
}
