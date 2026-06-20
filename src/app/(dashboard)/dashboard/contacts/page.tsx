import Link from "next/link";
import type { Metadata } from "next";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { buttonVariants } from "@/components/ui/button-variants";
import { listContacts } from "@/features/contacts/queries";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contacts",
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, { workspace }] = await Promise.all([searchParams, requireDashboardContext()]);
  const contacts = await listContacts(workspace.id, q);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Customers</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Contacts</h1>
        </div>
        <Link href="/dashboard/contacts/new" className={cn(buttonVariants(), "w-fit")}>
          <HugeiconsIcon icon={Add01Icon} />
          New contact
        </Link>
      </section>

      <form className="max-w-md">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search contacts…"
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </form>

      {contacts.length === 0 ? (
        <div className="rounded-3xl border px-6 py-16 text-center text-sm text-muted-foreground">
          No contacts yet. Create one manually or collect them from widget conversations.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border">
          <div className="divide-y">
            {contacts.map((contact) => (
              <Link
                key={contact.id}
                href={`/dashboard/contacts/${contact.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/45"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{contact.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {contact.email ?? "No email"}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-xs text-muted-foreground">
                  {contact._count.conversations} conversations
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
