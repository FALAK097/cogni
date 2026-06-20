import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewConversationForm } from "@/features/inbox/components/new-conversation-form";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata: Metadata = {
  title: "New conversation",
};

export default async function NewConversationPage() {
  await requireDashboardContext();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6 lg:p-8">
      <Link
        href="/dashboard/inbox"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
        Back to inbox
      </Link>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">New conversation</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Start a direct support thread with a customer.
        </p>
      </div>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Conversation details</CardTitle>
          <CardDescription>The conversation will be assigned to you.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewConversationForm />
        </CardContent>
      </Card>
    </main>
  );
}
