"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuth, requireDashboardContext } from "@/lib/auth/dashboard-context";
import { getAuth } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import {
  removeWorkspaceMember,
  transferWorkspaceOwnership,
  updateWorkspaceMemberRole,
} from "@/features/workspaces/server/owner-management";
import {
  acceptWorkspaceInviteMembership,
  getWorkspaceInviteByToken,
  upsertWorkspaceInvite,
} from "@/features/workspaces/server/members";

export type MemberActionState = {
  error?: string;
  savedAt?: number;
};

const inviteMemberSchema = z.object({
  email: z.email("Enter a valid email address.").transform((value) => value.toLowerCase().trim()),
  role: z.enum(["OWNER", "MEMBER"]).default("MEMBER"),
});

const updateMemberRoleSchema = z.object({
  membershipId: z.string().min(1),
  role: z.enum(["OWNER", "MEMBER"]),
});

const removeMemberSchema = z.object({
  membershipId: z.string().min(1),
});

const acceptInviteSchema = z.object({
  token: z.string().trim().min(1, "Invite token is required."),
});

const switchWorkspaceSchema = z.object({
  workspaceId: z.string().trim().min(1),
  returnTo: z.string().optional(),
});

const transferOwnershipSchema = z.object({
  membershipId: z.string().min(1),
});

function activeWorkspaceCookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  };
}

function safeReturnPath(returnTo: string | undefined) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/insights";
  }

  return returnTo;
}

export async function inviteMemberAction(
  _previousState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  await requireAuth();
  const context = await requireDashboardContext();

  if (context.membership.role !== "OWNER") {
    return { error: "Only workspace owners can manage members." };
  }

  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role") ?? "MEMBER",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the invite details." };
  }

  const { db, workspace } = context;

  const targetUser = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, parsed.data.email),
    columns: { id: true },
  });

  if (targetUser) {
    const existingMembership = await db.query.workspaceMember.findFirst({
      where: (member, { eq, and }) =>
        and(eq(member.workspaceId, workspace.id), eq(member.userId, targetUser.id)),
      columns: { id: true },
    });

    if (existingMembership) {
      return { error: "This email is already a member of the workspace." };
    }
  }

  await upsertWorkspaceInvite(db, {
    workspaceId: workspace.id,
    email: parsed.data.email,
    role: parsed.data.role,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/members");
  return { savedAt: Date.now() };
}

export async function updateMemberRoleAction(formData: FormData) {
  await requireAuth();
  const context = await requireDashboardContext();

  if (context.membership.role !== "OWNER") {
    return;
  }

  const parsed = updateMemberRoleSchema.safeParse({
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return;
  }

  const { db, membership, workspace } = context;
  const changed = await updateWorkspaceMemberRole(
    db,
    workspace.id,
    membership.id,
    parsed.data.membershipId,
    parsed.data.role,
  );

  if (!changed) return;

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/members");
}

export async function removeMemberAction(formData: FormData) {
  await requireAuth();
  const context = await requireDashboardContext();

  if (context.membership.role !== "OWNER") {
    return;
  }

  const parsed = removeMemberSchema.safeParse({
    membershipId: formData.get("membershipId"),
  });

  if (!parsed.success) {
    return;
  }

  const { db, membership, workspace } = context;

  if (parsed.data.membershipId === membership.id) {
    return;
  }

  const changed = await removeWorkspaceMember(
    db,
    workspace.id,
    membership.id,
    parsed.data.membershipId,
  );

  if (!changed) return;

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/members");
}

export async function acceptInviteAction(
  _previousState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Sign in to accept this invite." };
  }

  const parsed = acceptInviteSchema.safeParse({
    token: formData.get("token"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invite token." };
  }

  const db = getDb();
  const invite = await getWorkspaceInviteByToken(db, parsed.data.token);
  const now = new Date();

  if (!invite) {
    return { error: "This invite does not exist." };
  }

  if (invite.acceptedAt) {
    return { error: "This invite has already been accepted." };
  }

  if (invite.expiresAt <= now.toISOString()) {
    return { error: "This invite has expired." };
  }

  if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return { error: "This invite belongs to a different email address." };
  }

  const acceptedAt = now.toISOString();
  const accepted = await acceptWorkspaceInviteMembership(db, {
    inviteId: invite.id,
    workspaceId: invite.workspaceId,
    userId: session.user.id,
    email: session.user.email,
    acceptedAt,
  });

  if (!accepted) return { error: "This invite has already been accepted or expired." };

  const cookieStore = await cookies();
  cookieStore.set("active_workspace_id", invite.workspaceId, activeWorkspaceCookieOptions());
  revalidatePath("/dashboard");
  redirect("/insights");
}

export async function transferOwnershipAction(formData: FormData) {
  await requireAuth();
  const context = await requireDashboardContext();

  if (context.membership.role !== "OWNER") {
    return;
  }

  const parsed = transferOwnershipSchema.safeParse({
    membershipId: formData.get("membershipId"),
  });

  if (!parsed.success) {
    return;
  }

  const { db, membership, workspace } = context;
  const transferred = await transferWorkspaceOwnership(
    db,
    workspace.id,
    membership.id,
    parsed.data.membershipId,
  );

  if (!transferred) return;

  revalidatePath("/dashboard/settings/members");
}

export async function switchWorkspaceAction(formData: FormData) {
  await requireAuth();
  const { db, session } = await requireDashboardContext();

  const parsed = switchWorkspaceSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    returnTo: formData.get("returnTo"),
  });

  if (!parsed.success) {
    return;
  }

  const membership = await db.query.workspaceMember.findFirst({
    where: (member, { eq, and }) =>
      and(eq(member.userId, session.user.id), eq(member.workspaceId, parsed.data.workspaceId)),
    columns: {
      id: true,
    },
  });

  if (!membership) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set("active_workspace_id", parsed.data.workspaceId, activeWorkspaceCookieOptions());
  revalidatePath("/dashboard");
  redirect(safeReturnPath(parsed.data.returnTo));
}
