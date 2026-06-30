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
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

type AuthDialogProps = {
  label?: string;
  className?: string;
} & VariantProps<typeof buttonVariants>;

export function AuthDialog({
  label = "Continue with Google",
  variant = "default",
  size = "default",
  className,
}: AuthDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();

  async function continueWithGoogle() {
    setError(undefined);
    setIsPending(true);

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });

    if (result?.error) {
      setError(result.error.message ?? "Unable to continue with Google.");
      setIsPending(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant={variant} size={size} className={cn(className)} />}>
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Continue to widget</DialogTitle>
          <DialogDescription>
            Use Google to create or access your workspace. No password needed.
          </DialogDescription>
        </DialogHeader>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          disabled={isPending}
          onClick={continueWithGoogle}
        >
          <HugeiconsIcon icon={GoogleIcon} data-icon="inline-start" />
          {isPending ? "Redirecting…" : "Continue with Google"}
        </Button>
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
      </DialogContent>
    </Dialog>
  );
}
