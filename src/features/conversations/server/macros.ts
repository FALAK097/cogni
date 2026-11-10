import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";

import { getDb, type Db } from "@/lib/db/client";
import { inboxMacro } from "@/lib/db/schema";

export interface InboxMacroInput {
  name: string;
  content: string;
}

export class InboxMacroNameConflictError extends Error {
  constructor() {
    super("A saved reply with that name already exists in this workspace.");
    this.name = "InboxMacroNameConflictError";
  }
}

function hasErrorCode(error: unknown, code: string, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === code) return true;
  return "cause" in error && hasErrorCode(error.cause, code, depth + 1);
}

export async function listInboxMacros(workspaceId: string, db: Db = getDb()) {
  return db.query.inboxMacro.findMany({
    where: eq(inboxMacro.workspaceId, workspaceId),
    columns: {
      id: true,
      name: true,
      content: true,
      createdByMembershipId: true,
    },
    orderBy: [asc(inboxMacro.name)],
  });
}

export async function createInboxMacro(
  workspaceId: string,
  membershipId: string,
  input: InboxMacroInput,
  db: Db = getDb(),
) {
  try {
    const [macro] = await db
      .insert(inboxMacro)
      .values({
        id: randomUUID(),
        name: input.name.trim(),
        content: input.content.trim(),
        workspaceId,
        createdByMembershipId: membershipId,
        updatedAt: new Date().toISOString(),
      })
      .returning({
        id: inboxMacro.id,
        name: inboxMacro.name,
        content: inboxMacro.content,
        createdByMembershipId: inboxMacro.createdByMembershipId,
      });

    return macro;
  } catch (error) {
    if (hasErrorCode(error, "23505")) throw new InboxMacroNameConflictError();
    throw error;
  }
}

export async function updateInboxMacro(
  workspaceId: string,
  macroId: string,
  membershipId: string,
  canManageWorkspace: boolean,
  input: InboxMacroInput,
  db: Db = getDb(),
) {
  try {
    const [macro] = await db
      .update(inboxMacro)
      .set({
        name: input.name.trim(),
        content: input.content.trim(),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(inboxMacro.id, macroId),
          eq(inboxMacro.workspaceId, workspaceId),
          ...(canManageWorkspace ? [] : [eq(inboxMacro.createdByMembershipId, membershipId)]),
        ),
      )
      .returning({
        id: inboxMacro.id,
        name: inboxMacro.name,
        content: inboxMacro.content,
        createdByMembershipId: inboxMacro.createdByMembershipId,
      });

    return macro ?? null;
  } catch (error) {
    if (hasErrorCode(error, "23505")) throw new InboxMacroNameConflictError();
    throw error;
  }
}

export async function deleteInboxMacro(
  workspaceId: string,
  macroId: string,
  membershipId: string,
  canManageWorkspace: boolean,
  db: Db = getDb(),
) {
  const deleted = await db
    .delete(inboxMacro)
    .where(
      and(
        eq(inboxMacro.id, macroId),
        eq(inboxMacro.workspaceId, workspaceId),
        ...(canManageWorkspace ? [] : [eq(inboxMacro.createdByMembershipId, membershipId)]),
      ),
    )
    .returning({ id: inboxMacro.id });

  return deleted.length > 0;
}
