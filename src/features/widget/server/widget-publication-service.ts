import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { widgetModelOptions } from "@/features/widget/domain";
import {
  createWidgetPublicationSnapshot,
  parseWidgetPublicationSnapshot,
  toWidgetDraftStorageValues,
  type WidgetPublicationSnapshot,
} from "@/features/widget/publication";
import type { Db } from "@/lib/db/client";
import { widget, widgetPublication } from "@/lib/db/schema";
import {
  getWidgetPublicationStatus,
  toWidgetBookingConfig,
  toWidgetSettings,
} from "@/features/widget/server/widget-service";

type PublishWidgetDraftResult =
  | { ok: true; widget: NonNullable<Awaited<ReturnType<typeof getWidgetRecord>>> }
  | { ok: false; status: number; error: string };
type PublishTransactionResult =
  | { error: string; status: number }
  | { widgetId: string; version: number };

async function getWidgetRecord(db: Db, workspaceId: string) {
  return db.query.widget.findFirst({
    where: (fields, { eq }) => eq(fields.workspaceId, workspaceId),
  });
}

export async function publishWidgetDraft(
  db: Db,
  workspaceId: string,
  userId: string,
  restoreVersion?: number,
): Promise<PublishWidgetDraftResult> {
  const transactionResult: PublishTransactionResult = await db.transaction(async (tx) => {
    const [saved] = await tx
      .select()
      .from(widget)
      .where(eq(widget.workspaceId, workspaceId))
      .limit(1)
      .for("update");
    if (!saved) return { error: "Agent configuration was not found.", status: 404 } as const;

    let snapshot: WidgetPublicationSnapshot;
    if (restoreVersion !== undefined) {
      if (restoreVersion >= saved.publishedVersion) {
        return { error: "Choose an earlier published version to restore.", status: 400 } as const;
      }
      const [historical] = await tx
        .select({ config: widgetPublication.config })
        .from(widgetPublication)
        .where(
          and(
            eq(widgetPublication.widgetId, saved.id),
            eq(widgetPublication.version, restoreVersion),
          ),
        )
        .limit(1);
      const historicalSnapshot = parseWidgetPublicationSnapshot(historical?.config);
      if (!historicalSnapshot) {
        return { error: "That published version is unavailable.", status: 404 } as const;
      }
      snapshot = historicalSnapshot;
    } else {
      try {
        snapshot = createWidgetPublicationSnapshot(
          toWidgetSettings(saved),
          toWidgetBookingConfig(saved),
        );
      } catch {
        return {
          error:
            "Check the agent name, instructions, model, and widget settings before publishing.",
          status: 422,
        } as const;
      }
      const allowedModels = widgetModelOptions[snapshot.config.modelProvider];
      if (!allowedModels.some((option) => option.value === snapshot.config.modelName)) {
        return {
          error: "Choose a supported model for the selected provider before publishing.",
          status: 422,
        } as const;
      }
    }

    const version = saved.publishedVersion + 1;
    await tx.insert(widgetPublication).values({
      id: randomUUID(),
      widgetId: saved.id,
      version,
      config: snapshot,
      createdByUserId: userId,
    });
    await tx
      .update(widget)
      .set({
        publishedVersion: version,
        ...(restoreVersion !== undefined
          ? { ...toWidgetDraftStorageValues(snapshot.config), updatedAt: new Date().toISOString() }
          : {}),
      })
      .where(and(eq(widget.id, saved.id), eq(widget.workspaceId, workspaceId)));
    return { widgetId: saved.id, version } as const;
  });

  if (!("widgetId" in transactionResult)) {
    return {
      ok: false,
      status: transactionResult.status,
      error: transactionResult.error,
    };
  }
  const savedWidget = await db.query.widget.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, transactionResult.widgetId), eq(fields.workspaceId, workspaceId)),
  });
  if (!savedWidget) return { ok: false, status: 404, error: "Agent configuration was not found." };
  return { ok: true, widget: savedWidget };
}

export async function getDashboardWidgetPublicationStatus(db: Db, workspaceId: string) {
  const savedWidget = await getWidgetRecord(db, workspaceId);
  return savedWidget ? getWidgetPublicationStatus(db, savedWidget) : null;
}
