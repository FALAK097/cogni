import "server-only";

import { and, eq } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import { domainEvent } from "@/lib/db/schema";

import type { OnboardingPayload } from "./types";

export const ONBOARDING_COMPLETED_EVENT = "onboarding.completed";

export async function isOnboardingComplete(db: Db, workspaceId: string): Promise<boolean> {
  const event = await db.query.domainEvent.findFirst({
    where: and(
      eq(domainEvent.workspaceId, workspaceId),
      eq(domainEvent.type, ONBOARDING_COMPLETED_EVENT),
    ),
  });

  return Boolean(event);
}

export async function getOnboardingPayload(
  db: Db,
  workspaceId: string,
): Promise<OnboardingPayload | null> {
  const event = await db.query.domainEvent.findFirst({
    where: and(
      eq(domainEvent.workspaceId, workspaceId),
      eq(domainEvent.type, ONBOARDING_COMPLETED_EVENT),
    ),
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
  });

  if (!event) return null;

  try {
    return JSON.parse(event.payload) as OnboardingPayload;
  } catch {
    return null;
  }
}
