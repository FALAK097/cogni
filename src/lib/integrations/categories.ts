import type { CategoryDefinition } from "./types";

export const INTEGRATION_CATEGORIES: CategoryDefinition[] = [
  {
    id: "COMMUNICATION",
    label: "Communication",
    description: "Connect channels to engage with your leads across voice and chat.",
    order: 1,
  },
  {
    id: "LEAD_SOURCES_FILES",
    label: "Lead Sources & Files",
    description: "Import leads, files, and data from Meta, Google, Microsoft, and other platforms.",
    order: 2,
  },
  {
    id: "CRM",
    label: "CRM",
    description: "Sync leads, contacts, and deals with your CRM platform.",
    order: 4,
  },
  {
    id: "SCHEDULING",
    label: "Scheduling",
    description: "Book meetings, demos, and appointments through your scheduling tools.",
    order: 5,
  },
  {
    id: "EMAIL",
    label: "Email",
    description: "Send emails, run campaigns, and manage email workflows.",
    order: 6,
  },
  {
    id: "FORMS",
    label: "Forms",
    description: "Capture form submissions and convert them into leads automatically.",
    order: 7,
  },
  {
    id: "PAYMENTS",
    label: "Payments & Pricing",
    description: "Accept payments, manage subscriptions, and configure pricing plans.",
    order: 8,
  },
];

export const getCategoryById = (id: string): CategoryDefinition | undefined => {
  return INTEGRATION_CATEGORIES.find((c) => c.id === id);
};
