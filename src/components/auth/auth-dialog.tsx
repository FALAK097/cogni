"use client";

import Link from "next/link";
import { useState } from "react";
import { GoogleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

type AuthDialogProps = {
  label?: string;
  className?: string;
} & VariantProps<typeof buttonVariants>;

export function AuthDialog({
  label = "Continue to cogni",
  variant = "default",
  size = "default",
  className,
}: AuthDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isLocalDevAuth =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_LOCAL_DEV_EMAIL_PASSWORD_AUTH === "true";

  async function continueWithGoogle() {
    setError(undefined);
    setIsPending(true);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
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
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          name: name.trim() || "User",
          email: email.trim(),
          password,
          callbackURL: "/dashboard",
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
          callbackURL: "/dashboard",
        });

        if (result?.error) {
          setError(result.error.message ?? "Unable to sign in.");
          setIsPending(false);
          return;
        }
      }

      setOpen(false);
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} size={size} className={cn(className)} />}>
        {label}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Continue to cogni</DialogTitle>
          <DialogDescription>
            Access or create your workspace with Google or email.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2"
            disabled={isPending}
            onClick={continueWithGoogle}
          >
            <HugeiconsIcon icon={GoogleIcon} data-icon="inline-start" />
            {isPending ? "Connecting…" : "Continue with Google"}
          </Button>

          {isLocalDevAuth && (
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                  Email &amp; Password
                </span>
                <div className="flex gap-1" aria-label="Local auth mode">
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === "signin" ? "default" : "ghost"}
                    className="h-7 text-xs"
                    onClick={() => {
                      setMode("signin");
                      setError(undefined);
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === "signup" ? "default" : "ghost"}
                    className="h-7 text-xs"
                    onClick={() => {
                      setMode("signup");
                      setError(undefined);
                    }}
                  >
                    Sign Up
                  </Button>
                </div>
              </div>

              <form onSubmit={handleEmailAuth} className="grid gap-3">
                {mode === "signup" && (
                  <div className="grid gap-1">
                    <Label htmlFor="dialog-auth-name" className="text-xs">
                      Name
                    </Label>
                    <Input
                      id="dialog-auth-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isPending}
                      placeholder="Jane Doe"
                      className="bg-white"
                    />
                  </div>
                )}
                <div className="grid gap-1">
                  <Label htmlFor="dialog-auth-email" className="text-xs">
                    Email
                  </Label>
                  <Input
                    id="dialog-auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                    placeholder="you@example.com"
                    className="bg-white"
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="dialog-auth-password" className="text-xs">
                    Password
                  </Label>
                  <Input
                    id="dialog-auth-password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    placeholder="••••••••"
                    className="bg-white"
                  />
                </div>
                <Button type="submit" size="default" className="mt-1 w-full" disabled={isPending}>
                  {isPending ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
                </Button>
              </form>
            </div>
          )}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <p className="text-center text-xs text-muted-foreground">
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
      </DialogContent>
    </Dialog>
  );
}
