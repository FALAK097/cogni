"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle, Send } from "@/components/icons";
import { submitContactAction, type ContactActionState } from "@/features/contact/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ContactActionState = {};

const fieldClassName =
  "h-11 rounded-xl border-border/70 bg-background px-4 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/30";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactAction, initialState);

  if (state.success) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="size-6" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Message sent</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Thanks for reaching out. Our team will review your message and get back to you within one
          business day.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            required
            disabled={pending}
            placeholder="Jane Doe"
            className={fieldClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            disabled={pending}
            placeholder="you@company.com"
            className={fieldClassName}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Company (optional)</Label>
        <Input
          id="company"
          name="company"
          disabled={pending}
          placeholder="Acme Inc."
          className={fieldClassName}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          name="subject"
          required
          disabled={pending}
          placeholder="How can we help?"
          className={fieldClassName}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          required
          disabled={pending}
          rows={6}
          placeholder="Tell us about your support workflow, team size, or questions about widget."
          className="min-h-36 rounded-xl border-border/70 bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/30"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full rounded-xl shadow-sm shadow-primary/20"
        disabled={pending}
      >
        <Send className="size-4" />
        {pending ? "Sending…" : "Send message"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        By submitting this form, you agree to our{" "}
        <Link href="/privacy-policy" className="underline underline-offset-4 hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
