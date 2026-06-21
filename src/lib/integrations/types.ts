/**
 * Integration types for the integrations system.
 */

export type IntegrationCategory =
  | "COMMUNICATION"
  | "LEAD_SOURCES_FILES"
  | "CRM"
  | "SCHEDULING"
  | "EMAIL"
  | "FORMS"
  | "PAYMENTS";

export type IntegrationAuthType = "oauth" | "api_key" | "credentials" | "internal";

export type IntegrationStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

export type IntegrationMetadataField = {
  label: string;
  type: "text" | "password" | "select" | "url";
  required: boolean;
  placeholder?: string;
  help?: string;
  options?: { label: string; value: string }[];
};

export type IntegrationManifest = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  category: IntegrationCategory;
  icon: string;
  iconDark?: string;
  iconBg?: string;
  auth: {
    type: IntegrationAuthType;
    provider?: string;
    scopes?: string[];
  };
  metadata?: Record<string, IntegrationMetadataField>;
  features: string[];
  permissions: string[];
  content: {
    whatItDoes: string[];
    useCases: string[];
    setupGuideUrl?: string;
  };
  isComingSoon?: boolean;
  docsUrl?: string;
};

export type CategoryDefinition = {
  id: IntegrationCategory;
  label: string;
  description: string;
  order: number;
};

export type WorkspaceIntegration = {
  id: string;
  integrationId: string;
  slug: string;
  isConnected: boolean;
  status: IntegrationStatus;
  connectedAt?: string;
  lastSyncedAt?: string;
  connectedAccount?: string;
  metadata?: Record<string, string | number | boolean>;
};
