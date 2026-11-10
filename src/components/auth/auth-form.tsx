"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  callbackURL?: string;
};

export function AuthForm({ mode, callbackURL = "/insights" }: AuthFormProps) {
  const [activeMode, setActiveMode] = useState<"sign-in" | "sign-up">(mode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();

  const isLocalDevAuth =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_LOCAL_DEV_EMAIL_PASSWORD_AUTH === "true";

  async function continueWithGoogle() {
    setError(undefined);
    setIsPending(true);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });

      if (result?.error) {
        setError(result.error.message ?? "Unable to continue with Google.");
        setIsPending(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue with Google.");
      setIsPending(false);
    }
  }

  async function handleEmailAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsPending(true);

    try {
      if (activeMode === "sign-up") {
        const result = await authClient.signUp.email({
          name: name.trim() || "User",
          email: email.trim(),
          password,
          callbackURL,
        });

        if (result?.error) {
          setError(result.error.message ?? "Unable to create account.");
          setIsPending(false);
          return;
        }
      } else {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL,
        });

        if (result?.error) {
          setError(result.error.message ?? "Unable to sign in.");
          setIsPending(false);
          return;
        }
      }

      window.location.assign(callbackURL);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
      setIsPending(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 w-full gap-3 rounded-full border-input bg-card text-[15px] font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed"
        disabled={isPending}
        onClick={continueWithGoogle}
      >
        <GoogleLogo />
        {isPending
          ? "Redirecting…"
          : activeMode === "sign-up"
            ? "Continue with Google"
            : "Sign in with Google"}
      </Button>

      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative bg-white px-3 text-xs uppercase tracking-wider text-gray-500">
          Or continue with email
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        {isLocalDevAuth && (
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
              Email &amp; Password Auth
            </span>
            <div className="flex gap-1" aria-label="Authentication mode">
              <Button
                type="button"
                size="sm"
                variant={activeMode === "sign-in" ? "default" : "ghost"}
                className="h-7 text-xs"
                onClick={() => {
                  setActiveMode("sign-in");
                  setError(undefined);
                }}
              >
                Sign In
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeMode === "sign-up" ? "default" : "ghost"}
                className="h-7 text-xs"
                onClick={() => {
                  setActiveMode("sign-up");
                  setError(undefined);
                }}
              >
                Sign Up
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="grid gap-3.5">
          {activeMode === "sign-up" && (
            <div className="grid gap-1.5">
              <Label htmlFor="auth-name" className="text-xs font-medium text-gray-700">
                Full Name
              </Label>
              <Input
                id="auth-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                className="rounded-xl border-gray-200 bg-white"
              />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="auth-email" className="text-xs font-medium text-gray-700">
              Email address
            </Label>
            <Input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              className="rounded-xl border-gray-200 bg-white"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="auth-password" className="text-xs font-medium text-gray-700">
              Password
            </Label>
            <Input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={activeMode === "sign-up" ? "new-password" : "current-password"}
              required
              minLength={8}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
              className="rounded-xl border-gray-200 bg-white"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="mt-1 h-11 w-full rounded-xl"
            disabled={isPending}
          >
            {isPending ? "Working…" : activeMode === "sign-up" ? "Create Account" : "Sign In"}
          </Button>
        </form>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
        <div>
          {activeMode === "sign-in" ? (
            <p>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setActiveMode("sign-up");
                  setError(undefined);
                }}
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setActiveMode("sign-in");
                  setError(undefined);
                }}
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

        <p className="leading-relaxed">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy-policy"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
