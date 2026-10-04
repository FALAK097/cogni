"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

function GoogleLogo() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
};

export function AuthForm({ mode }: AuthFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();

  async function continueWithGoogle() {
    setError(undefined);
    setIsPending(true);

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/insights",
    });

    if (result?.error) {
      setError(result.error.message ?? "Unable to continue with Google.");
      setIsPending(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 w-full gap-3 rounded-xl border-gray-200 bg-white text-[15px] font-medium text-gray-900 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-900 disabled:opacity-100 dark:border-gray-200 dark:bg-white dark:text-gray-900 dark:hover:border-gray-300 dark:hover:bg-gray-50 dark:hover:text-gray-900 dark:disabled:text-gray-900"
        disabled={isPending}
        onClick={continueWithGoogle}
      >
        <GoogleLogo />
        {isPending
          ? "Redirecting…"
          : mode === "sign-up"
            ? "Continue with Google"
            : "Sign in with Google"}
      </Button>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy-policy" className="underline underline-offset-4 hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
