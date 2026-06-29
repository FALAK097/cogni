import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { AcceptInviteForm } from "@/features/workspaces/components/accept-invite-form";
import { getWorkspaceInviteByToken } from "@/features/workspaces/server/members";
import { getAuth } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";

export const metadata: Metadata = {
  title: "Workspace invite",
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const [{ token }, session] = await Promise.all([
    params,
    getAuth().api.getSession({
      headers: await headers(),
    }),
  ]);
  const invite = await getWorkspaceInviteByToken(getDb(), token);
  const now = new Date();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl items-center p-4">
      <section className="w-full rounded-3xl border p-6 sm:p-8">
        <p className="text-sm text-muted-foreground">workspace invite</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Join workspace</h1>

        {!invite ? (
          <p className="mt-4 text-sm text-destructive">This invite does not exist.</p>
        ) : invite.acceptedAt ? (
          <p className="mt-4 text-sm text-destructive">This invite has already been accepted.</p>
        ) : new Date(invite.expiresAt) <= now ? (
          <p className="mt-4 text-sm text-destructive">This invite has expired.</p>
        ) : (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              <strong>{invite.email}</strong> has been invited to{" "}
              <strong>{invite.workspace.name}</strong> as <strong>{invite.role}</strong>.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Expires on {new Date(invite.expiresAt).toLocaleString()}.
            </p>
            {!session ? (
              <p className="mt-5 text-sm text-muted-foreground">
                Sign in with <strong>{invite.email}</strong> to accept this invite.
              </p>
            ) : (
              <div className="mt-5">
                <AcceptInviteForm token={invite.token} />
              </div>
            )}
          </>
        )}

        <Link
          href="/"
          className="mt-6 inline-block text-sm text-primary underline-offset-2 hover:underline"
        >
          Back to home
        </Link>
      </section>
    </main>
  );
}
