import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { AcceptInviteForm } from "@/features/workspaces/components/accept-invite-form";
import { SwitchInviteAccountButton } from "@/features/workspaces/components/switch-invite-account-button";
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
  // Invite validity is intentionally evaluated against this request's current time.
  // oxlint-disable-next-line react/purity -- This server page is request-scoped and is not memoized.
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
              <div className="mt-5 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sign in with <strong>{invite.email}</strong> to accept this invite.
                </p>
                <Link
                  href={`/sign-in?callbackURL=${encodeURIComponent(`/invite/${token}`)}`}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  Sign in with Google
                </Link>
              </div>
            ) : session.user.email.toLowerCase() !== invite.email.toLowerCase() ? (
              <div className="mt-5 space-y-2">
                <p role="alert" className="text-sm text-destructive">
                  This invite is for {invite.email}, but you’re signed in as {session.user.email}.
                </p>
                <SwitchInviteAccountButton returnTo={`/invite/${token}`} />
              </div>
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
