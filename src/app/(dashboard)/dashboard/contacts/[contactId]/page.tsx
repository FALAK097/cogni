import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { deleteContactAction } from "@/features/contacts/actions";
import { addContactNoteAction, updateContactTagsAction } from "@/features/contacts/actions-notes";
import { ContactEditor } from "@/features/contacts/components/contact-editor";
import { getContact } from "@/features/contacts/queries";
import { formatConversationTime } from "@/features/inbox/format";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata: Metadata = {
  title: "Contact",
};

export default async function ContactPage({ params }: { params: Promise<{ contactId: string }> }) {
  const [{ contactId }, { workspace }] = await Promise.all([params, requireDashboardContext()]);
  const contact = await getContact(workspace.id, contactId);

  if (!contact) {
    notFound();
  }

  const tags = (() => {
    try {
      return JSON.parse(contact.tags) as string[];
    } catch {
      return [];
    }
  })();

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <Link
        href="/dashboard/contacts"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
        Back to contacts
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section className="rounded-3xl border p-6">
          <h1 className="text-2xl font-semibold tracking-tight">{contact.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {contact._count.conversations} conversations
          </p>
          <div className="mt-6">
            <ContactEditor contact={contact} />
          </div>
          <form action={updateContactTagsAction} className="mt-6 space-y-2 border-t pt-6">
            <input type="hidden" name="contactId" value={contact.id} />
            <label className="grid gap-2 text-sm font-medium">
              Tags
              <input
                name="tags"
                defaultValue={tags.join(", ")}
                placeholder="vip, trial, enterprise"
                className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              />
            </label>
            <Button type="submit" variant="outline" size="sm">
              Save tags
            </Button>
          </form>
          <form action={addContactNoteAction} className="mt-6 space-y-2 border-t pt-6">
            <input type="hidden" name="contactId" value={contact.id} />
            <label className="grid gap-2 text-sm font-medium">
              Add note
              <textarea
                name="body"
                rows={3}
                required
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              />
            </label>
            <Button type="submit" variant="outline" size="sm">
              Add note
            </Button>
          </form>
          {contact.notes.length > 0 ? (
            <div className="mt-6 space-y-3 border-t pt-6">
              <h3 className="text-sm font-medium">Timeline notes</h3>
              {contact.notes.map((note) => (
                <article key={note.id} className="rounded-xl border bg-muted/20 p-3 text-sm">
                  <p>{note.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {note.authorUser.name} · {formatConversationTime(note.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
          {contact._count.conversations === 0 ? (
            <form action={deleteContactAction} className="mt-6 border-t pt-6">
              <input type="hidden" name="contactId" value={contact.id} />
              <Button type="submit" variant="destructive" size="sm">
                Delete contact
              </Button>
            </form>
          ) : null}
        </section>

        <section className="rounded-3xl border p-6">
          <h2 className="text-lg font-semibold">Recent conversations</h2>
          {contact.conversations.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            <div className="mt-4 divide-y">
              {contact.conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/dashboard/inbox/${conversation.id}`}
                  className="block py-4 transition-colors hover:text-foreground"
                >
                  <p className="font-medium">{conversation.subject}</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {conversation.messages[0]?.body ?? "No messages"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatConversationTime(conversation.lastMessageAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
