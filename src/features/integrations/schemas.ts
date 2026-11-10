import { z } from "zod";

export const workspaceIntegrationSchema = z.object({
  id: z.string().uuid(),
  integrationSlug: z.string().min(1),
  slug: z.string().min(1),
  provider: z.string().min(1),
  status: z.string().min(1),
  connectedAt: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()),
});

export const integrationDetailResponseSchema = z.object({
  integration: z.object({
    id: z.string().uuid(),
    slug: z.string().min(1),
    provider: z.string().min(1),
    status: z.string().min(1),
    providerStatus: z.string().nullable(),
    toolkit: z.string().min(1),
    connectedAt: z.string().min(1),
    lastHealthCheckAt: z.string().nullable(),
    lastError: z.string().nullable(),
    inboundWebhookUrl: z.url().nullable(),
    capabilities: z.array(
      z.object({
        actionType: z.string().min(1),
        label: z.string().min(1),
        riskLevel: z.string().min(1),
        requiresApproval: z.boolean(),
      }),
    ),
  }),
  actions: z.array(
    z.object({
      id: z.string().uuid(),
      actionType: z.string().min(1),
      status: z.string().min(1),
      errorMessage: z.string().nullable(),
      createdAt: z.string().min(1),
      updatedAt: z.string().min(1),
    }),
  ),
});

export type WorkspaceIntegration = z.infer<typeof workspaceIntegrationSchema>;
export type IntegrationDetailResponse = z.infer<typeof integrationDetailResponseSchema>;
