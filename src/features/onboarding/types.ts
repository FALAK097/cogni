export type ReferralSource =
  | "google-search"
  | "online-community"
  | "linkedin"
  | "x-twitter"
  | "youtube"
  | "friend-colleague"
  | "ai-recommendation"
  | "other";

export type CompanySize = "startup" | "small" | "midmarket" | "enterprise";

export type AgentType = "customer-support" | "sales-agent" | "shopping-assistant";

export type DeploymentChannel =
  | "chat-widget"
  | "agent-page"
  | "whatsapp"
  | "messenger"
  | "instagram"
  | "shopify"
  | "email"
  | "slack"
  | "zendesk"
  | "salesforce"
  | "phone";

export type LeadCategory = "hot" | "warm" | "nurture" | "cold";

export type OnboardingData = {
  referralSource?: ReferralSource;
  companySize?: CompanySize;
  website?: string;
  instructions?: string;
  agentType?: AgentType;
  tools?: string[];
  deploymentChannels?: DeploymentChannel[];
  hasKnowledgeSources?: boolean;
};

export type OnboardingPayload = OnboardingData & {
  leadScore: number;
  leadCategory: LeadCategory;
  completedAt: string;
};
