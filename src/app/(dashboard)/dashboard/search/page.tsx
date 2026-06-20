import Link from "next/link";
import type { Metadata } from "next";

import { listContacts } from "@/features/contacts/queries";
import { listDocuments } from "@/features/knowledge/queries";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { searchCloudflareIndex } from "@/lib/search/cloudflare-search";

export const metadata: Metadata = {
  title: "Search",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, { db, workspace }] = await Promise.all([searchParams, requireDashboardContext()]);
  const query = q?.trim() ?? "";

  const [contacts, documents, conversations, cloudflareMatches] = query
    ? await Promise.all([
        listContacts(workspace.id, query),
        listDocuments(workspace.id, query),
        db.conversation.findMany({
          where: {
            workspaceId: workspace.id,
            OR: [
              { subject: { contains: query } },
              { contact: { name: { contains: query } } },
              { contact: { email: { contains: query } } },
              {
                messages: {
                  some: {
                    body: { contains: query },
                  },
                },
              },
            ],
          },
          include: {
            contact: true,
          },
          orderBy: { lastMessageAt: "desc" },
          take: 20,
        }),
        searchCloudflareIndex({ query, limit: 10 }),
      ])
    : [[], [], [], []];

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <section>
        <p className="text-sm text-muted-foreground">Unified lookup</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Search</h1>
      </section>

      <form className="max-w-xl">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search contacts, conversations, and documents…"
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </form>

      {!query ? (
        <section className="rounded-3xl border px-6 py-16 text-center text-sm text-muted-foreground">
          Enter a search term to find contacts, conversations, and knowledge sources.
        </section>
      ) : (
        <section className="space-y-4">
          {cloudflareMatches.length > 0 ? (
            <article className="rounded-3xl border px-4 py-3 text-sm text-muted-foreground">
              Cloudflare Search returned {cloudflareMatches.length} additional knowledge matches.
            </article>
          ) : null}
          <section className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-3xl border">
              <header className="border-b px-4 py-3">
                <h2 className="font-semibold">Contacts ({contacts.length})</h2>
              </header>
              <div className="divide-y">
                {contacts.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-muted-foreground">No matching contacts.</p>
                ) : (
                  contacts.slice(0, 20).map((contact) => (
                    <Link
                      key={contact.id}
                      href={`/dashboard/contacts/${contact.id}`}
                      className="block px-4 py-3 text-sm hover:bg-muted/45"
                    >
                      <p className="truncate font-medium">{contact.name}</p>
                      <p className="truncate text-muted-foreground">
                        {contact.email ?? "No email"}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-3xl border">
              <header className="border-b px-4 py-3">
                <h2 className="font-semibold">Conversations ({conversations.length})</h2>
              </header>
              <div className="divide-y">
                {conversations.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-muted-foreground">
                    No matching conversations.
                  </p>
                ) : (
                  conversations.map((conversation) => (
                    <Link
                      key={conversation.id}
                      href={`/dashboard/inbox/${conversation.id}`}
                      className="block px-4 py-3 text-sm hover:bg-muted/45"
                    >
                      <p className="truncate font-medium">{conversation.subject}</p>
                      <p className="truncate text-muted-foreground">
                        {conversation.contact.name} · {conversation.status}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-3xl border">
              <header className="border-b px-4 py-3">
                <h2 className="font-semibold">Documents ({documents.length})</h2>
              </header>
              <div className="divide-y">
                {documents.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-muted-foreground">No matching documents.</p>
                ) : (
                  documents.slice(0, 20).map((document) => (
                    <div key={document.id} className="px-4 py-3 text-sm">
                      <p className="truncate font-medium">{document.title}</p>
                      <p className="truncate text-muted-foreground">
                        {document.sourceUrl ?? document.storageKey ?? "Uploaded document"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        </section>
      )}
    </main>
  );
}
