"use client";

import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addUrlSourceAction,
  deleteDocumentAction,
  uploadDocumentAction,
} from "@/features/knowledge/actions";
import { useKnowledgeBaseSources } from "@/hooks/query";

export function WidgetKnowledgeManager() {
  const sourcesQuery = useKnowledgeBaseSources("default");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);

  const sources =
    (sourcesQuery.data as { sources?: Array<{ id: string; displayName: string; status: string }> })
      ?.sources ?? [];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload documents and add website sources for grounded widget answers.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-5">
          <h2 className="text-base font-medium">Add website</h2>
          <form
            className="space-y-3"
            action={async (formData) => {
              setPending(true);
              await addUrlSourceAction({}, formData);
              setPending(false);
              setUrl("");
              setTitle("");
              await sourcesQuery.refetch();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceUrl">URL</Label>
              <Input
                id="sourceUrl"
                name="sourceUrl"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/docs"
                required
              />
            </div>
            <Button type="submit" disabled={pending}>
              Add URL source
            </Button>
          </form>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-base font-medium">Upload document</h2>
          <form
            className="space-y-3"
            action={async (formData) => {
              setPending(true);
              await uploadDocumentAction(formData);
              setPending(false);
              if (fileInputRef.current) fileInputRef.current.value = "";
              await sourcesQuery.refetch();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="upload-title">Title</Label>
              <Input id="upload-title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File (PDF, DOCX, TXT)</Label>
              <Input id="file" name="file" type="file" ref={fileInputRef} required />
            </div>
            <Button type="submit" disabled={pending}>
              Upload
            </Button>
          </form>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium">Sources</h2>
          <Badge variant="secondary">{sources.length}</Badge>
        </div>
        <div className="space-y-3">
          {sourcesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading sources…</p>
          ) : sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sources yet.</p>
          ) : (
            sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between rounded-xl border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{source.displayName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{source.status}</p>
                </div>
                <form
                  action={async (formData) => {
                    await deleteDocumentAction(formData);
                    await sourcesQuery.refetch();
                  }}
                >
                  <input type="hidden" name="documentId" value={source.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Delete
                  </Button>
                </form>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
