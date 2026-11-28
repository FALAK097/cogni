import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";

import { widgetModelOptions } from "@/features/widget/domain";
import {
  createWidgetPublicationSnapshot,
  parseWidgetPublicationSnapshot,
  toWidgetDraftStorageValues,
  type WidgetPublicationSnapshot,
} from "@/features/widget/publication";
import { runDbWriteOperation, type Db } from "@/lib/db/client";
import { widget, widgetPublication } from "@/lib/db/schema";
import {
  AgentTestPublishCheckError,
  assertAgentTestPublishCheckCurrent,
  resolveAgentTestPublishDraftIdentity,
} from "@/features/agent-tests/server/publish-checks";
import { toWidgetBookingConfig, toWidgetSettings } from "@/features/widget/server/widget-service";

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
  publishCheckId?: string,
): Promise<PublishWidgetDraftResult> {
  const transactionResult: PublishTransactionResult = await runDbWriteOperation(db, async (tx) => {
    const [saved] = await tx
      .select()
      .from(widget)
      .where(eq(widget.workspaceId, workspaceId))
      .limit(1);
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

    if (restoreVersion === undefined) {
      try {
        await assertAgentTestPublishCheckCurrent(
          {
            workspaceId,
            widgetId: saved.id,
            checkId: publishCheckId,
            publishedVersion: saved.publishedVersion,
            candidateFingerprint: resolveAgentTestPublishDraftIdentity(saved).configFingerprint,
          },
          tx as unknown as Db,
        );
      } catch (error) {
        if (error instanceof AgentTestPublishCheckError) {
          return { error: error.message, status: 409 } as const;
        }
        throw error;
      }
    }

    const version = saved.publishedVersion + 1;
    const publicationId = randomUUID();
    const publishedAt = new Date().toISOString();
    const [insertedPublications, updatedWidgets] = await tx.batch([
      tx
        .insert(widgetPublication)
        .select(
          sql`select ${publicationId}, ${version}, ${JSON.stringify(snapshot)}, ${publishedAt}, ${saved.id}, ${userId} where exists (select 1 from "widget" where "id" = ${saved.id} and "workspaceId" = ${workspaceId} and "publishedVersion" = ${saved.publishedVersion})`,
        )
        .returning({ id: widgetPublication.id }),
      tx
        .update(widget)
        .set({
          publishedVersion: version,
          ...(restoreVersion !== undefined
            ? { ...toWidgetDraftStorageValues(snapshot.config), updatedAt: publishedAt }
            : {}),
        })
        .where(
          and(
            eq(widget.id, saved.id),
            eq(widget.workspaceId, workspaceId),
            eq(widget.publishedVersion, saved.publishedVersion),
          ),
        )
        .returning({ id: widget.id }),
    ]);
    if (insertedPublications.length === 0 || updatedWidgets.length === 0) {
      return {
        error: "Agent configuration changed while publishing. Try again.",
        status: 409,
      } as const;
    }
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
