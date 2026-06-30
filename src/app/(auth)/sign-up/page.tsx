import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Sign Up",
  description: "Create your Widget workspace with Google.",
};

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Get started in seconds with your Google account.
        </p>
      </div>

      <AuthForm mode="sign-up" />

      <p className="text-center text-sm text-muted-foreground lg:text-left">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
