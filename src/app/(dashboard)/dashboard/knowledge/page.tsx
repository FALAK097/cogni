import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteDocumentAction, uploadDocumentAction } from "@/features/knowledge/actions";
import { KnowledgeUrlForm } from "@/features/knowledge/components/knowledge-url-form";
import { listDocuments } from "@/features/knowledge/queries";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata: Metadata = {
  title: "Knowledge",
};

const statusBadgeVariant = {
  READY: "default",
  PROCESSING: "secondary",
  FAILED: "destructive",
} as const;

export default async function KnowledgePage() {
  const { workspace } = await requireDashboardContext();
  const documents = await listDocuments(workspace.id);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <section>
        <p className="text-sm text-muted-foreground">Knowledge base</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Knowledge</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Upload files and URLs so the AI can answer from your workspace sources.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <form action={uploadDocumentAction} className="space-y-4 rounded-3xl border p-6">
          <h2 className="text-base font-semibold">Upload document</h2>
          <label className="grid gap-2 text-sm font-medium">
            Title
            <input
              name="title"
              required
              placeholder="API handbook"
              className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            File
            <input
              name="file"
              type="file"
              required
              accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="block w-full rounded-xl border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-3xl file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
          </label>
          <Button type="submit">Upload document</Button>
        </form>

        <KnowledgeUrlForm />
      </section>

      {documents.length === 0 ? (
        <section className="rounded-3xl border px-6 py-16 text-center text-sm text-muted-foreground">
          No sources yet. Add a file or URL to start grounding AI responses.
        </section>
      ) : (
        <section className="overflow-hidden rounded-3xl border">
          <div className="divide-y">
            {documents.map((document) => (
              <article key={document.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium">{document.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {document.sourceUrl ?? document.storageKey ?? "Uploaded document"}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {document._count.chunks} chunks · Updated{" "}
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(document.updatedAt)}
                  </p>
                </div>
                <Badge
                  variant={
                    statusBadgeVariant[document.status as keyof typeof statusBadgeVariant] ??
                    "outline"
                  }
                >
                  {document.status}
                </Badge>
                <form action={deleteDocumentAction}>
                  <input type="hidden" name="documentId" value={document.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    Delete
                  </Button>
                </form>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
