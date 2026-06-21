"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { getAuth } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import {
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
    return "/dashboard";
  }

  return returnTo;
}

async function ownerGuard() {
  const context = await requireDashboardContext();
  if (context.membership.role !== "OWNER") {
    return { context, error: "Only workspace owners can manage members." } as const;
  }

  return { context, error: null } as const;
}

export async function inviteMemberAction(
  _previousState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role") ?? "MEMBER",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the invite details." };
  }

  const { context, error } = await ownerGuard();
  if (error) {
    return { error };
  }

  const { db, workspace } = context;
  const existingMembership = await db.workspaceMember.findFirst({
    where: {
      workspaceId: workspace.id,
      user: {
        email: parsed.data.email,
      },
    },
    select: { id: true },
  });

  if (existingMembership) {
    return { error: "This email is already a member of the workspace." };
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
  const parsed = updateMemberRoleSchema.safeParse({
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return;
  }

  const { context, error } = await ownerGuard();
  if (error) {
    return;
  }

  const { db, membership, workspace } = context;
  const targetMembership = await db.workspaceMember.findFirst({
    where: {
      id: parsed.data.membershipId,
      workspaceId: workspace.id,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!targetMembership) {
    return;
  }

  if (targetMembership.id === membership.id && parsed.data.role !== "OWNER") {
    return;
  }

  if (targetMembership.role === "OWNER" && parsed.data.role !== "OWNER") {
    const ownerCount = await db.workspaceMember.count({
      where: {
        workspaceId: workspace.id,
        role: "OWNER",
      },
    });

    if (ownerCount <= 1) {
      return;
    }
  }

  await db.workspaceMember.update({
    where: { id: targetMembership.id },
    data: { role: parsed.data.role },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/members");
}

export async function removeMemberAction(formData: FormData) {
  const parsed = removeMemberSchema.safeParse({
    membershipId: formData.get("membershipId"),
  });

  if (!parsed.success) {
    return;
  }

  const { context, error } = await ownerGuard();
  if (error) {
    return;
  }

  const { db, membership, workspace } = context;

  if (parsed.data.membershipId === membership.id) {
    return;
  }

  const targetMembership = await db.workspaceMember.findFirst({
    where: {
      id: parsed.data.membershipId,
      workspaceId: workspace.id,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!targetMembership) {
    return;
  }

  if (targetMembership.role === "OWNER") {
    const ownerCount = await db.workspaceMember.count({
      where: {
        workspaceId: workspace.id,
        role: "OWNER",
      },
    });

    if (ownerCount <= 1) {
      return;
    }
  }

  await db.workspaceMember.delete({
    where: { id: targetMembership.id },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/members");
}

export async function acceptInviteAction(
  _previousState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const parsed = acceptInviteSchema.safeParse({
    token: formData.get("token"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invite token." };
  }

  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Sign in to accept this invite." };
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

  if (invite.expiresAt <= now) {
    return { error: "This invite has expired." };
  }

  if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return { error: "This invite belongs to a different email address." };
  }

  await db.$transaction([
    db.workspaceMember.upsert({
      where: {
        userId_workspaceId: {
          userId: session.user.id,
          workspaceId: invite.workspaceId,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        workspaceId: invite.workspaceId,
        role: invite.role,
      },
    }),
    db.workspaceInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: now },
    }),
  ]);

  const cookieStore = await cookies();
  cookieStore.set("active_workspace_id", invite.workspaceId, activeWorkspaceCookieOptions());
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

const transferOwnershipSchema = z.object({
  membershipId: z.string().min(1),
});

export async function transferOwnershipAction(formData: FormData) {
  const parsed = transferOwnershipSchema.safeParse({
    membershipId: formData.get("membershipId"),
  });

  if (!parsed.success) {
    return;
  }

  const { context, error } = await ownerGuard();
  if (error) {
    return;
  }

  const { db, membership, workspace } = context;
  const target = await db.workspaceMember.findFirst({
    where: {
      id: parsed.data.membershipId,
      workspaceId: workspace.id,
    },
    select: { id: true, userId: true },
  });

  if (!target || target.id === membership.id) {
    return;
  }

  await db.$transaction([
    db.workspaceMember.update({
      where: { id: membership.id },
      data: { role: "MEMBER" },
    }),
    db.workspaceMember.update({
      where: { id: target.id },
      data: { role: "OWNER" },
    }),
  ]);

  revalidatePath("/dashboard/settings/members");
}

export async function switchWorkspaceAction(formData: FormData) {
  const parsed = switchWorkspaceSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    returnTo: formData.get("returnTo"),
  });

  if (!parsed.success) {
    return;
  }

  const { db, session } = await requireDashboardContext();
  const membership = await db.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
    },
    select: { id: true },
  });

  if (!membership) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set("active_workspace_id", parsed.data.workspaceId, activeWorkspaceCookieOptions());
  revalidatePath("/dashboard");
  redirect(safeReturnPath(parsed.data.returnTo));
}
