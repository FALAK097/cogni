import type { Metadata } from "next";
import { BotIcon, MessageMultiple01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard",
};

const metrics = [
  { label: "Open conversations", value: "0", icon: MessageMultiple01Icon },
  { label: "Contacts", value: "0", icon: UserGroupIcon },
  { label: "AI resolutions", value: "—", icon: BotIcon },
];

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div>
        <Badge variant="secondary">Workspace foundation</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Good morning</h1>
        <p className="mt-1 text-muted-foreground">
          Connect infrastructure, then invite your first support teammate.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Workspace metrics">
        {metrics.map((metric) => (
          <Card key={metric.label} size="sm">
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardAction>
                <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={metric.icon} className="size-4" />
                </span>
              </CardAction>
              <CardTitle className="font-mono text-3xl">{metric.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
            <CardDescription>Conversations needing attention will appear here.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed bg-muted/30 p-8 text-center">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-background shadow-sm">
                <HugeiconsIcon icon={MessageMultiple01Icon} className="size-5" />
              </span>
              <p className="mt-4 font-medium">No conversations yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Install widget or send a test message after infrastructure setup.
              </p>
              <Badge variant="outline" className="mt-5">
                Configure widget coming soon
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup checklist</CardTitle>
            <CardDescription>Phase 0 infrastructure</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              {[
                "Add environment variables",
                "Create Cloudflare D1 database",
                "Apply initial migration",
                "Deploy preview to Vercel",
              ].map((item, index) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-muted font-mono text-xs">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
