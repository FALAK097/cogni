import "server-only";

import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  hostnameMatches,
  type WidgetLauncherSize,
  type WidgetModelProvider,
  type WidgetPosition,
  type WidgetSettings,
} from "@/features/widget/domain";

const visitorSessionDurationMs = 1000 * 60 * 60 * 24 * 30;

export async function ensureWorkspaceWidget(db: PrismaClient, workspaceId: string) {
  return db.widget.upsert({
    where: { workspaceId },
    update: {},
    create: {
      workspaceId,
    },
    include: {
      authorizedDomains: {
        orderBy: { hostname: "asc" },
      },
    },
  });
}

export function toWidgetSettings(
  widget: Awaited<ReturnType<typeof ensureWorkspaceWidget>>,
): WidgetSettings {
  return {
    publicKey: widget.publicKey,
    displayName: widget.displayName,
    welcomeMessage: widget.welcomeMessage,
    inputPlaceholder: widget.inputPlaceholder,
    primaryColor: widget.primaryColor,
    backgroundColor: widget.backgroundColor,
    textColor: widget.textColor,
    position: widget.position as WidgetPosition,
    launcherSize: widget.launcherSize as WidgetLauncherSize,
    panelWidth: widget.panelWidth,
    panelHeight: widget.panelHeight,
    borderRadius: widget.borderRadius,
    logoUrl: widget.logoUrl,
    instructions: widget.instructions,
    modelProvider: widget.modelProvider as WidgetModelProvider,
    modelName: widget.modelName,
    isEnabled: widget.isEnabled,
    authorizedDomains: widget.authorizedDomains.map((domain) => domain.hostname),
  };
}

export async function getPublicWidget(db: PrismaClient, publicKey: string) {
  return db.widget.findUnique({
    where: { publicKey },
    include: {
      authorizedDomains: true,
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export function isHostnameAuthorized(hostname: string, authorizedDomains: { hostname: string }[]) {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, "");
  return authorizedDomains.some((domain) => hostnameMatches(normalizedHostname, domain.hostname));
}

export async function createVisitorSession(db: PrismaClient, widgetId: string, hostname: string) {
  return db.visitorSession.create({
    data: {
      widgetId,
      hostname,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + visitorSessionDurationMs),
    },
  });
}

export async function resolveVisitorSession({
  db,
  widgetId,
  hostname,
  token,
}: {
  db: PrismaClient;
  widgetId: string;
  hostname: string;
  token?: string | null;
}) {
  const now = new Date();

  if (token) {
    const existing = await db.visitorSession.findFirst({
      where: {
        token,
        widgetId,
        expiresAt: { gt: now },
      },
    });

    if (existing) {
      return db.visitorSession.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: now,
          expiresAt: new Date(Date.now() + visitorSessionDurationMs),
        },
      });
    }
  }

  return createVisitorSession(db, widgetId, hostname);
}
