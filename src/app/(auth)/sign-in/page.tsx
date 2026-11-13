import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { isEmailPasswordAuthEnabled } from "@/lib/auth/server";
import { safeReturnPath } from "@/lib/auth/return-path";

export const metadata = {
  title: "Sign In",
  description: "Sign in to your cogni workspace with Google.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const callbackURL = safeReturnPath(
    typeof params.callbackURL === "string" ? params.callbackURL : undefined,
  );
  const allowEmailPassword = isEmailPasswordAuthEnabled();

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <h1 className="font-display text-5xl tracking-tight text-foreground">Welcome back.</h1>
        <p className="text-[15px] leading-7 text-muted-foreground">
          Access your workspace with your Google account.
        </p>
      </div>

      <AuthForm mode="sign-in" callbackURL={callbackURL} allowEmailPassword={allowEmailPassword} />
      <p className="text-center text-xs text-muted-foreground">
        Trouble signing in?{" "}
        <Link
          href="/help#google-auth"
          className="underline underline-offset-2 hover:text-foreground"
        >
          View Google auth setup guide
        </Link>
      </p>
    </div>
  );
}
