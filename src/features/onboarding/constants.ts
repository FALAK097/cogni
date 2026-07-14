import type { Hugeicon } from "@/components/icons";
import {
  Bot,
  Briefcase,
  Building2,
  Globe,
  MessageCircle,
  MessageSquare,
  Phone,
  Sparkles,
  UserPlus,
  Users,
} from "@/components/icons";

import type { AgentType, CompanySize, DeploymentChannel, ReferralSource } from "./types";
import { BRAND_ICONS } from "@/lib/brand-icons";

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  icon?: Hugeicon;
  logo?: string;
};

export const REFERRAL_OPTIONS: SelectOption<ReferralSource>[] = [
  { value: "google-search", label: "Google search", logo: BRAND_ICONS.google },
  { value: "online-community", label: "Online community", icon: Users },
  { value: "linkedin", label: "LinkedIn", logo: BRAND_ICONS.linkedin },
  { value: "x-twitter", label: "X (formerly Twitter)", logo: BRAND_ICONS.x },
  { value: "youtube", label: "Youtube", logo: BRAND_ICONS.youtube },
  { value: "friend-colleague", label: "A friend or colleague", icon: UserPlus },
  { value: "ai-recommendation", label: "AI recommendation", icon: Sparkles },
  { value: "other", label: "Other", icon: MessageSquare },
];

export const COMPANY_SIZE_OPTIONS: SelectOption<CompanySize>[] = [
  { value: "startup", label: "Startup (1-9)", icon: Briefcase },
  { value: "small", label: "Small business (10-49)", icon: Building2 },
  { value: "midmarket", label: "Mid-market (50-499)", icon: Building2 },
  { value: "enterprise", label: "Enterprise (500+)", icon: Building2 },
];

export const AGENT_TYPE_OPTIONS: {
  value: AgentType;
  label: string;
  description: string;
  icon: Hugeicon;
}[] = [
  {
    value: "customer-support",
    label: "Customer support",
    description: "Answer questions and resolve issues",
    icon: MessageCircle,
  },
  {
    value: "sales-agent",
    label: "Sales agent",
    description: "Qualify leads and drive conversions",
    icon: Briefcase,
  },
  {
    value: "shopping-assistant",
    label: "Shopping assistant",
    description: "Help customers find and buy products",
    icon: Bot,
  },
];

export const DEFAULT_INSTRUCTIONS: Record<AgentType, string> = {
  "customer-support":
    "Answer customer questions clearly and concisely. Stay polite and professional. Escalate billing or account issues to a human agent when unsure.",
  "sales-agent":
    "Qualify leads by understanding their needs and budget. Highlight product benefits clearly. Schedule demos when appropriate.",
  "shopping-assistant":
    "Help customers find products that match their needs. Provide sizing, availability, and shipping information. Suggest complementary items.",
};

export const TOOL_OPTIONS = {
  actions: [
    { value: "stripe", label: "Stripe", logo: BRAND_ICONS.stripe },
    { value: "shopify", label: "Shopify", logo: BRAND_ICONS.shopify },
    { value: "cal", label: "Cal", logo: BRAND_ICONS.cal },
    { value: "calendly", label: "Calendly", logo: BRAND_ICONS.calendly },
    { value: "slack", label: "Slack", logo: BRAND_ICONS.slack },
    { value: "twilio", label: "Twilio", logo: BRAND_ICONS.twilio },
  ],
  helpdesk: [
    { value: "widget", label: "Widget", icon: MessageCircle },
    { value: "zendesk", label: "Zendesk", logo: BRAND_ICONS.zendesk },
    { value: "sunshine", label: "Sunshine", icon: Sparkles },
    { value: "salesforce", label: "Salesforce", logo: BRAND_ICONS.salesforce },
    { value: "intercom", label: "Intercom", logo: BRAND_ICONS.intercom },
    { value: "hubspot", label: "HubSpot", logo: BRAND_ICONS.hubspot },
    { value: "freshdesk", label: "Freshdesk", logo: BRAND_ICONS.freshdesk },
    { value: "zoho-desk", label: "Zoho Desk", logo: BRAND_ICONS.zoho },
    { value: "help-scout", label: "Help Scout", logo: BRAND_ICONS.helpscout },
  ],
};

export const DEPLOYMENT_OPTIONS: SelectOption<DeploymentChannel>[] = [
  { value: "chat-widget", label: "Chat widget", icon: MessageCircle },
  { value: "agent-page", label: "Agent page", icon: Globe },
  { value: "whatsapp", label: "WhatsApp", logo: BRAND_ICONS.whatsapp },
  { value: "messenger", label: "Messenger", logo: BRAND_ICONS.messenger },
  { value: "instagram", label: "Instagram", logo: BRAND_ICONS.instagram },
  { value: "shopify", label: "Shopify", logo: BRAND_ICONS.shopify },
  { value: "email", label: "Email", logo: BRAND_ICONS.gmail },
  { value: "slack", label: "Slack", logo: BRAND_ICONS.slack },
  { value: "zendesk", label: "Zendesk", logo: BRAND_ICONS.zendesk },
  { value: "salesforce", label: "Salesforce", logo: BRAND_ICONS.salesforce },
  { value: "phone", label: "Phone", icon: Phone },
];

export const ONBOARDING_STEP_COUNT = 7;

export const TESTIMONIALS = [
  {
    company: "JUMIA",
    quote:
      "We went from agents waiting in a human support queue to getting instant answers on WhatsApp, and half our inbound inquiries now never reach our team at all.",
    author: "LT Jacquin",
    role: "Group Head of J Force, Jumia",
  },
  {
    company: "LES MILLS",
    quote:
      "The chatbots are user-friendly, easy to customize, and have been effectively serving our customers for nearly two years.",
    author: "Brent Nathan",
    role: "Head Of Technology, Les Mills",
  },
  {
    company: "Sage",
    quote:
      "The chatbots are user-friendly, easy to customize, and have been effectively serving our customers for nearly two years.",
    author: "Ann Donie",
    role: "Product Owner, Sage",
  },
  {
    company: "Blanko",
    quote:
      "We deploy agents across municipal websites to help residents access reliable information. Custom actions now deliver real-time data — cutting repetitive inquiries significantly.",
    author: "Beverly St-André",
    role: "Artificial Intelligence and Data Science, Blanko",
  },
  {
    company: "Chuck E. Cheese",
    quote:
      "Since launching, guests report strong satisfaction with the answers they receive, and the system has been easy for our team to maintain.",
    author: "Mark",
    role: "CMO, Chuck E. Cheese",
  },
];

export const PRICING_PLANS = [
  {
    id: "hobby",
    name: "Hobby",
    price: 32,
    credits: "500 msg credits /m",
    savings: "Save $96 yearly",
    borderColor: "border-t-primary",
    features: [
      "Access to advanced models",
      "2 members",
      "10 MB per AI agent",
      "5 enabled AI Actions per AI agent",
      "Integrations",
      "Basic analytics",
      "Attachments",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    price: 120,
    credits: "4,000 msg credits /m",
    savings: "Save $360 yearly",
    borderColor: "border-t-purple-600",
    popular: true,
    features: [
      "Everything in Hobby, plus",
      "3 members",
      "20 MB per AI agent",
      "8 enabled AI Actions per AI agent",
      "Advanced integrations",
      "API access",
      "Personalization",
      "Auto retrain agents",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 400,
    credits: "15,000 msg credits /m",
    savings: "Save $1200 yearly",
    borderColor: "border-t-orange-500",
    features: [
      "Everything in Standard, plus",
      "5 members",
      "40 MB per AI agent",
      "12 enabled AI Actions per AI agent",
      "Advanced analytics",
      "Sources suggestions",
      "Tickets as a source",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    credits: null,
    savings: null,
    borderColor: "border-t-sky-400",
    features: [
      "Everything in Pro, plus",
      "Higher limits",
      "Custom roles & permissions",
      "SSO",
      "White-labeling",
      "Audit logs",
      "HIPAA-eligible",
      "Priority support",
    ],
  },
];
