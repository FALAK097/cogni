import type { CompanySize, LeadCategory, OnboardingData } from "./types";

const SIZE_SCORES: Record<CompanySize, number> = {
  startup: 20,
  small: 40,
  midmarket: 70,
  enterprise: 95,
};

export function calculateLeadScore(data: OnboardingData): {
  score: number;
  category: LeadCategory;
} {
  let score = 0;

  if (data.companySize) {
    score += SIZE_SCORES[data.companySize];
  }

  if (data.website?.trim()) {
    score += 10;
  }

  if (data.hasKnowledgeSources) {
    score += 8;
  }

  const tools = data.tools ?? [];
  score += Math.min(tools.length * 5, 15);

  const channels = data.deploymentChannels ?? [];
  score += Math.min(channels.length * 3, 12);

  if (data.instructions && data.instructions.length > 80) {
    score += 5;
  }

  const category: LeadCategory =
    score >= 75 ? "hot" : score >= 50 ? "warm" : score >= 25 ? "nurture" : "cold";

  return { score: Math.min(score, 100), category };
}

export function formatLeadCategory(category: LeadCategory): string {
  const labels: Record<LeadCategory, string> = {
    hot: "Hot Lead",
    warm: "Warm Lead",
    nurture: "Nurture",
    cold: "Cold Lead",
  };
  return labels[category];
}

export function buildLeadTags(
  data: OnboardingData,
  score: number,
  category: LeadCategory,
): string[] {
  const tags: string[] = [`score:${score}`, `category:${category}`];

  if (data.referralSource) tags.push(`referral:${data.referralSource}`);
  if (data.companySize) tags.push(`size:${data.companySize}`);
  if (data.agentType) tags.push(`agent:${data.agentType}`);

  for (const tool of data.tools ?? []) {
    tags.push(`tool:${tool}`);
  }

  for (const channel of data.deploymentChannels ?? []) {
    tags.push(`deploy:${channel}`);
  }

  return tags;
}
