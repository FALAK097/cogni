import Link from "next/link";
import {
  BotIcon,
  MessageMultiple01Icon,
  SparklesIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { AuthDialog } from "@/components/auth/auth-dialog";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const capabilities = [
  {
    icon: BotIcon,
    title: "Grounded AI answers",
    description:
      "Agents answer from workspace knowledge, conversation history, and explicit instructions.",
  },
  {
    icon: MessageMultiple01Icon,
    title: "One support inbox",
    description: "AI and humans share full context across assignment, escalation, and resolution.",
  },
  {
    icon: UserGroupIcon,
    title: "Human handoff",
    description: "Escalate safely when confidence drops or customers request a person.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-svh overflow-hidden">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HugeiconsIcon icon={SparklesIcon} className="size-4" />
          </span>
          widget
        </Link>
        <nav className="flex items-center gap-2" aria-label="Primary navigation">
          <AuthDialog label="Sign in" variant="ghost" />
          <AuthDialog label="Start free" />
        </nav>
      </header>

      <section className="relative isolate border-y">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,var(--color-primary)_0,transparent_30%),radial-gradient(circle_at_bottom_right,var(--color-muted)_0,transparent_35%)] opacity-15" />
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <Badge variant="secondary" className="mb-5">
              AI-first. Human-ready.
            </Badge>
            <h1 className="max-w-3xl text-4xl leading-[1.05] font-semibold tracking-[-0.04em] sm:text-6xl">
              Customer support that knows when to answer—and when to hand off.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Deploy a branded support widget, ground AI in your knowledge, and keep every
              conversation available to your team.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <AuthDialog label="Create workspace" size="lg" />
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                View dashboard
              </Link>
            </div>
          </div>

          <Card className="bg-card/90 shadow-2xl backdrop-blur">
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <span className="size-2.5 rounded-full bg-emerald-500" />
                <div>
                  <CardTitle>Acme support</CardTitle>
                  <CardDescription>AI agent online</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-[82%] rounded-3xl rounded-bl-md bg-muted px-4 py-3">
                Can I change my plan before next billing date?
              </div>
              <div className="ml-auto max-w-[88%] rounded-3xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground">
                Yes. Plan changes take effect immediately, and unused time is credited
                automatically. Want me to open billing settings?
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
                Answered from Billing policy · updated 2 days ago
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-16 md:grid-cols-3">
        {capabilities.map((capability) => (
          <Card key={capability.title} size="sm">
            <CardHeader>
              <span className="mb-3 flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={capability.icon} className="size-4.5" />
              </span>
              <CardTitle>{capability.title}</CardTitle>
              <CardDescription>{capability.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </main>
  );
}
