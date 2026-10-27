import { AuthForm } from "@/components/auth/auth-form";
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

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <h1 className="font-display text-5xl tracking-tight text-foreground">Welcome back.</h1>
        <p className="text-[15px] leading-7 text-muted-foreground">
          Access your workspace with your Google account.
        </p>
      </div>

      <AuthForm mode="sign-in" callbackURL={callbackURL} />
    </div>
  );
}
