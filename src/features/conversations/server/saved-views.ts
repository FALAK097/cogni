import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";

import { getDb, type Db } from "@/lib/db/client";
import { inboxSavedView, workspaceMember } from "@/lib/db/schema";

export interface CreateInboxSavedViewInput {
  name: string;
  filter: string;
  channel: string | null;
  assigneeFilter: string;
}

export class InboxSavedViewNameConflictError extends Error {
  constructor() {
    super("A saved view with that name already exists in this workspace.");
    this.name = "InboxSavedViewNameConflictError";
  }
}

export class InboxSavedViewAssigneeError extends Error {
  constructor() {
    super("That teammate is not in this workspace.");
    this.name = "InboxSavedViewAssigneeError";
  }
}

function hasErrorCode(error: unknown, code: string, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === code) return true;
  return "cause" in error && hasErrorCode(error.cause, code, depth + 1);
}

export async function listInboxSavedViews(workspaceId: string, db: Db = getDb()) {
  return db.query.inboxSavedView.findMany({
    where: eq(inboxSavedView.workspaceId, workspaceId),
    columns: {
      id: true,
      name: true,
      filter: true,
      channel: true,
      assigneeFilter: true,
      createdByMembershipId: true,
    },
    orderBy: [asc(inboxSavedView.name)],
  });
}

export async function createInboxSavedView(
  workspaceId: string,
  membershipId: string,
  input: CreateInboxSavedViewInput,
  db: Db = getDb(),
) {
  if (input.assigneeFilter !== "all" && input.assigneeFilter !== "unassigned") {
    const assignedMember = await db.query.workspaceMember.findFirst({
      where: and(
        eq(workspaceMember.id, input.assigneeFilter),
        eq(workspaceMember.workspaceId, workspaceId),
      ),
      columns: { id: true },
    });
    if (!assignedMember) throw new InboxSavedViewAssigneeError();
  }

  try {
    const [view] = await db
      .insert(inboxSavedView)
      .values({
        id: randomUUID(),
        name: input.name,
        filter: input.filter,
        channel: input.channel,
        assigneeFilter: input.assigneeFilter,
        workspaceId,
        createdByMembershipId: membershipId,
        updatedAt: new Date().toISOString(),
      })
      .returning({
        id: inboxSavedView.id,
        name: inboxSavedView.name,
        filter: inboxSavedView.filter,
        channel: inboxSavedView.channel,
        assigneeFilter: inboxSavedView.assigneeFilter,
        createdByMembershipId: inboxSavedView.createdByMembershipId,
      });

    return view;
  } catch (error) {
    if (hasErrorCode(error, "23505")) {
      throw new InboxSavedViewNameConflictError();
    }
    throw error;
  }
}

export async function deleteInboxSavedView(
  workspaceId: string,
  viewId: string,
  membershipId: string,
  canManageWorkspace: boolean,
  db: Db = getDb(),
) {
  const deleted = await db
    .delete(inboxSavedView)
    .where(
      and(
        eq(inboxSavedView.id, viewId),
        eq(inboxSavedView.workspaceId, workspaceId),
        ...(canManageWorkspace ? [] : [eq(inboxSavedView.createdByMembershipId, membershipId)]),
      ),
    )
    .returning({ id: inboxSavedView.id });

  return deleted.length > 0;
}
