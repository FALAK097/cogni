import "server-only";

import { and, eq } from "drizzle-orm";

import { runDbWriteOperation, type Db } from "@/lib/db/client";
import {
  workspace as workspaceTable,
  workspaceMember as workspaceMemberTable,
} from "@/lib/db/schema";

async function lockWorkspace(db: Db, workspaceId: string) {
  await db
    .select({ id: workspaceTable.id })
    .from(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId))
    .for("update");
}

async function isCurrentOwner(db: Db, workspaceId: string, membershipId: string) {
  const [owner] = await db
    .select({ id: workspaceMemberTable.id })
    .from(workspaceMemberTable)
    .where(
      and(
        eq(workspaceMemberTable.id, membershipId),
        eq(workspaceMemberTable.workspaceId, workspaceId),
        eq(workspaceMemberTable.role, "OWNER"),
      ),
    )
    .limit(1);

  return owner !== undefined;
}

async function countWorkspaceOwners(db: Db, workspaceId: string) {
  const owners = await db
    .select({ id: workspaceMemberTable.id })
    .from(workspaceMemberTable)
    .where(
      and(
        eq(workspaceMemberTable.workspaceId, workspaceId),
        eq(workspaceMemberTable.role, "OWNER"),
      ),
    );

  return owners.length;
}

export async function updateWorkspaceMemberRole(
  db: Db,
  workspaceId: string,
  actorMembershipId: string,
  targetMembershipId: string,
  role: "OWNER" | "MEMBER",
) {
  return runDbWriteOperation(db, async (transaction) => {
    await lockWorkspace(transaction, workspaceId);

    if (!(await isCurrentOwner(transaction, workspaceId, actorMembershipId))) return false;

    const [target] = await transaction
      .select({ id: workspaceMemberTable.id, role: workspaceMemberTable.role })
      .from(workspaceMemberTable)
      .where(
        and(
          eq(workspaceMemberTable.id, targetMembershipId),
          eq(workspaceMemberTable.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!target || (target.id === actorMembershipId && role !== "OWNER")) return false;

    if (target.role === "OWNER" && role !== "OWNER") {
      if ((await countWorkspaceOwners(transaction, workspaceId)) <= 1) return false;
    }

    await transaction
      .update(workspaceMemberTable)
      .set({ role, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(workspaceMemberTable.id, target.id),
          eq(workspaceMemberTable.workspaceId, workspaceId),
        ),
      );

    return true;
  });
}

export async function removeWorkspaceMember(
  db: Db,
  workspaceId: string,
  actorMembershipId: string,
  targetMembershipId: string,
) {
  return runDbWriteOperation(db, async (transaction) => {
    await lockWorkspace(transaction, workspaceId);

    if (!(await isCurrentOwner(transaction, workspaceId, actorMembershipId))) return false;

    const [target] = await transaction
      .select({ id: workspaceMemberTable.id, role: workspaceMemberTable.role })
      .from(workspaceMemberTable)
      .where(
        and(
          eq(workspaceMemberTable.id, targetMembershipId),
          eq(workspaceMemberTable.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!target || target.id === actorMembershipId) return false;

    if (target.role === "OWNER" && (await countWorkspaceOwners(transaction, workspaceId)) <= 1) {
      return false;
    }

    await transaction
      .delete(workspaceMemberTable)
      .where(
        and(
          eq(workspaceMemberTable.id, target.id),
          eq(workspaceMemberTable.workspaceId, workspaceId),
        ),
      );

    return true;
  });
}

export async function transferWorkspaceOwnership(
  db: Db,
  workspaceId: string,
  actorMembershipId: string,
  targetMembershipId: string,
) {
  return runDbWriteOperation(db, async (transaction) => {
    await lockWorkspace(transaction, workspaceId);

    if (!(await isCurrentOwner(transaction, workspaceId, actorMembershipId))) return false;

    const [target] = await transaction
      .select({ id: workspaceMemberTable.id })
      .from(workspaceMemberTable)
      .where(
        and(
          eq(workspaceMemberTable.id, targetMembershipId),
          eq(workspaceMemberTable.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!target || target.id === actorMembershipId) return false;

    const updatedAt = new Date().toISOString();
    await transaction
      .update(workspaceMemberTable)
      .set({ role: "MEMBER", updatedAt })
      .where(
        and(
          eq(workspaceMemberTable.id, actorMembershipId),
          eq(workspaceMemberTable.workspaceId, workspaceId),
        ),
      );

    await transaction
      .update(workspaceMemberTable)
      .set({ role: "OWNER", updatedAt })
      .where(
        and(
          eq(workspaceMemberTable.id, target.id),
          eq(workspaceMemberTable.workspaceId, workspaceId),
        ),
      );

    return true;
  });
}
