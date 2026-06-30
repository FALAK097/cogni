import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Sign In",
  description: "Sign in to your Widget workspace with Google.",
};

export default function SignInPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with Google to access your workspace.
        </p>
      </div>

      <AuthForm mode="sign-in" />

      <p className="text-center text-sm text-muted-foreground lg:text-left">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
