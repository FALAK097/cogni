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
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sign in</h1>
        <p className="text-[15px] text-gray-500">Access your workspace with your Google account.</p>
      </div>

      <AuthForm mode="sign-in" callbackURL={callbackURL} />
    </div>
  );
}
