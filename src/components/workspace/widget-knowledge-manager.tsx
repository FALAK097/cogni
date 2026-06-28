"use client";

import { formatDistanceToNow } from "date-fns";
import { useRef, useState } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import {
  ArrowUpDown,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Ellipsis,
  FileText,
  Globe,
  ListTree,
  Plus,
  ScrollText,
  Trash2,
  Upload,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addUrlSourceAction,
  addManualTextSourceAction,
  importSitemapSourceAction,
} from "@/features/knowledge/actions";
import {
  useDeleteKnowledgeBaseSource,
  useKnowledgeBaseSources,
  useUploadRagDocument,
} from "@/hooks/query";

import { KnowledgeBaseSkeleton } from "./knowledge-base-skeleton";

type KnowledgeBaseSourceRow = {
  id: string;
  displayName: string;
  sourceType: string;
  status: string;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
  canonicalUrl?: string | null;
  metadata?: { mimeType?: string; storageKey?: string };
};

type SourceSortKey = "displayName" | "sourceType" | "status" | "chunkCount" | "updatedAt";
type SortDirection = "asc" | "desc";

const sortValues = [
  "displayName.asc",
  "displayName.desc",
  "sourceType.asc",
  "sourceType.desc",
  "status.asc",
  "status.desc",
  "chunkCount.asc",
  "chunkCount.desc",
  "updatedAt.asc",
  "updatedAt.desc",
] as const;

const sortParser = parseAsStringLiteral(sortValues);

function getSourceTypeMeta(sourceType: string) {
  switch (sourceType.toLowerCase()) {
    case "website":
      return {
        label: "Website",
        className: "border-indigo-500/15 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
      };
    case "sitemap":
      return {
        label: "Sitemap",
        className: "border-fuchsia-500/15 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
      };
    case "file":
      return {
        label: "Document",
        className: "border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      };
    case "txt":
      return {
        label: "Text",
        className: "border-amber-500/15 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      };
    default:
      return {
        label: sourceType,
        className: "border-slate-500/15 bg-slate-500/10 text-slate-700 dark:text-slate-300",
      };
  }
}

function getStatusMeta(status: string) {
  switch (status.toLowerCase()) {
    case "ready":
    case "indexed":
      return {
        label: "Indexed",
        className: "border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      };
    case "processing":
      return {
        label: "Processing",
        className: "border-sky-500/15 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      };
    case "failed":
      return {
        label: "Failed",
        className: "border-red-500/15 bg-red-500/10 text-red-700 dark:text-red-300",
      };
    default:
      return {
        label: status,
        className: "border-slate-500/15 bg-slate-500/10 text-slate-700 dark:text-slate-300",
      };
  }
}

function getSourceTypeIcon(sourceType: string) {
  switch (sourceType.toLowerCase()) {
    case "website":
      return Globe;
    case "sitemap":
      return ListTree;
    case "txt":
      return ScrollText;
    default:
      return FileText;
  }
}

function getDocumentFileName(storageKey?: string) {
  if (!storageKey) return null;
  const segments = storageKey.split("/");
  return segments[segments.length - 1] ?? null;
}

function formatUpdatedAt(value: string) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return value;
  }
}

function sortSources(
  sources: KnowledgeBaseSourceRow[],
  columnId: SourceSortKey,
  direction: SortDirection,
): KnowledgeBaseSourceRow[] {
  const sorted = [...sources];
  sorted.sort((a, b) => {
    const av = a[columnId];
    const bv = b[columnId];
    if (typeof av === "number" && typeof bv === "number") {
      return direction === "asc" ? av - bv : bv - av;
    }
    const as = String(av ?? "");
    const bs = String(bv ?? "");
    return direction === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
  });
  return sorted;
}

export function WidgetKnowledgeManager() {
  const sourcesQuery = useKnowledgeBaseSources("default");
  const uploadMutation = useUploadRagDocument();
  const deleteMutation = useDeleteKnowledgeBaseSource();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sortBy, setSortBy] = useQueryState("kbSort", sortParser.withDefault("updatedAt.desc"));
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [sitemapDialogOpen, setSitemapDialogOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [sitemapTitle, setSitemapTitle] = useState("");
  const [pendingUrl, setPendingUrl] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(false);
  const [pendingManual, setPendingManual] = useState(false);
  const [pendingSitemap, setPendingSitemap] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const sources = (sourcesQuery.data?.sources as KnowledgeBaseSourceRow[] | undefined) ?? [];

  const [sortColumn, sortDirection] = sortBy.split(".") as [SourceSortKey, SortDirection];
  const sortedSources = sortSources(sources, sortColumn, sortDirection);

  function toggleSort(columnId: SourceSortKey) {
    const nextDirection: SortDirection =
      sortColumn === columnId && sortDirection === "asc" ? "desc" : "asc";
    void setSortBy(`${columnId}.${nextDirection}` as (typeof sortValues)[number]);
  }

  function openAddDialog(opener: () => void) {
    setAddMenuOpen(false);
    queueMicrotask(opener);
  }

  function getSortIndicator(columnId: SourceSortKey) {
    if (sortColumn !== columnId) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5" />
    );
  }

  function SortableHeader({ columnId, label }: { columnId: SourceSortKey; label: string }) {
    return (
      <TableHead className="h-auto px-5 py-4 text-[12px] font-medium text-foreground/60">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 text-left transition-colors hover:text-foreground"
          onClick={() => toggleSort(columnId)}
        >
          <span>{label}</span>
          {getSortIndicator(columnId)}
        </button>
      </TableHead>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-end">
        <DropdownMenu open={addMenuOpen} onOpenChange={setAddMenuOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                className="h-9 rounded-full px-4 shadow-none"
                size="default"
                aria-label="Add knowledge source"
              >
                <Plus className="h-4 w-4" />
                Add Source
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={10} className="w-80 p-2">
            <DropdownMenuItem
              className="cursor-pointer items-start gap-3 rounded-2xl px-3 py-3"
              closeOnClick={false}
              onClick={() => openAddDialog(() => setUrlDialogOpen(true))}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/30 text-muted-foreground">
                <Globe className="h-4 w-4" />
              </span>
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">Add Website URL</span>
                <span className="block text-xs text-muted-foreground">
                  Crawl and index a website
                </span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer items-start gap-3 rounded-2xl px-3 py-3"
              closeOnClick={false}
              onClick={() => openAddDialog(() => setUploadDialogOpen(true))}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/30 text-muted-foreground">
                <Upload className="h-4 w-4" />
              </span>
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">Upload Document</span>
                <span className="block text-xs text-muted-foreground">
                  PDF, DOCX, TXT up to 50MB
                </span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer items-start gap-3 rounded-2xl px-3 py-3"
              closeOnClick={false}
              onClick={() => openAddDialog(() => setManualDialogOpen(true))}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/30 text-muted-foreground">
                <ScrollText className="h-4 w-4" />
              </span>
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">Add Text Manually</span>
                <span className="block text-xs text-muted-foreground">
                  Add text content directly
                </span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer items-start gap-3 rounded-2xl px-3 py-3"
              closeOnClick={false}
              onClick={() => openAddDialog(() => setSitemapDialogOpen(true))}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/30 text-muted-foreground">
                <ListTree className="h-4 w-4" />
              </span>
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">
                  Import from Sitemap
                </span>
                <span className="block text-xs text-muted-foreground">
                  Import pages from sitemap.xml
                </span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-border/60 bg-transparent shadow-none [--card-spacing:0rem]">
        {sourcesQuery.isLoading ? (
          <KnowledgeBaseSkeleton />
        ) : sources.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={BookOpen}
              title="No knowledge sources yet"
              description="Add a website URL, upload documents, or paste text to teach your AI assistant how to answer questions."
            >
              <Button
                size="sm"
                className="h-9 rounded-xl shadow-none"
                onClick={() => setUrlDialogOpen(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Source
              </Button>
            </EmptyState>
          </div>
        ) : (
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[18%]" />
              <col className="w-[10%]" />
            </colgroup>
            <TableHeader className="border-b border-border/60">
              <TableRow className="border-border/60 hover:bg-transparent">
                <SortableHeader columnId="displayName" label="Source" />
                <SortableHeader columnId="sourceType" label="Type" />
                <SortableHeader columnId="status" label="Status" />
                <SortableHeader columnId="chunkCount" label="Indexed Pages" />
                <SortableHeader columnId="updatedAt" label="Last Updated" />
                <TableHead className="h-auto px-5 py-4 text-[12px] font-medium text-foreground/60">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-[13px]">
              {sortedSources.map((source) => {
                const Icon = getSourceTypeIcon(source.sourceType);
                const sourceType = source.sourceType.toLowerCase();
                const fileName = getDocumentFileName(source.metadata?.storageKey);
                const primaryLabel =
                  (sourceType === "file" || sourceType === "txt") && fileName
                    ? fileName
                    : source.displayName;
                const secondaryLabel =
                  (sourceType === "file" || sourceType === "txt") &&
                  fileName &&
                  source.displayName !== fileName
                    ? source.displayName
                    : sourceType === "website" || sourceType === "sitemap"
                      ? (source.canonicalUrl ?? source.displayName)
                      : null;
                const typeMeta = getSourceTypeMeta(source.sourceType);
                const statusMeta = getStatusMeta(source.status);

                return (
                  <TableRow key={source.id} className="border-border/60 hover:bg-muted/30">
                    <TableCell className="whitespace-normal px-5 py-4 align-middle">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 text-muted-foreground">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <p className="truncate text-sm font-medium text-foreground">
                            {primaryLabel}
                          </p>
                          {secondaryLabel ? (
                            <p className="truncate text-[12px] text-muted-foreground">
                              {secondaryLabel}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal px-5 py-4 align-middle">
                      <Badge
                        variant="secondary"
                        className={`h-7 rounded-full border px-3 text-[12px] font-medium ${typeMeta.className}`}
                      >
                        {typeMeta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal px-5 py-4 align-middle">
                      <Badge
                        variant="secondary"
                        className={`h-7 rounded-full border px-3 text-[12px] font-medium ${statusMeta.className}`}
                      >
                        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                        {statusMeta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal px-5 py-4 align-middle">
                      <span className="text-sm text-foreground/80">
                        {source.chunkCount > 0 ? source.chunkCount : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal px-5 py-4 align-middle">
                      <span className="text-sm text-foreground/75">
                        {formatUpdatedAt(source.updatedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal px-5 py-4 text-right align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                              <Ellipsis className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" sideOffset={8} className="w-44">
                          <DropdownMenuItem
                            className="cursor-pointer gap-2 text-destructive"
                            variant="destructive"
                            onClick={() => {
                              void deleteMutation.mutateAsync(source.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {!sourcesQuery.isLoading && sources.length > 0 ? (
          <div className="border-t border-border/60 px-5 py-4 text-sm text-muted-foreground">
            Showing 1 to {sources.length} of {sources.length} sources
          </div>
        ) : null}
      </div>

      <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add Website URL</DialogTitle>
            <DialogDescription>Crawl and index pages from a website root.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            action={async (formData) => {
              setPendingUrl(true);
              try {
                await addUrlSourceAction({}, formData);
                setTitle("");
                setUrl("");
                setUrlDialogOpen(false);
                await sourcesQuery.refetch();
              } finally {
                setPendingUrl(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Help Center"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceUrl">URL</Label>
              <Input
                id="sourceUrl"
                name="sourceUrl"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/docs"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUrlDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pendingUrl}>
                Add URL source
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open && fileInputRef.current) fileInputRef.current.value = "";
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              PDF, DOCX, and TXT files are indexed from uploaded content. The file name is used as
              the source title.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              setPendingUpload(true);
              try {
                await uploadMutation.mutateAsync(formData);
                form.reset();
                if (fileInputRef.current) fileInputRef.current.value = "";
                setUploadDialogOpen(false);
                await sourcesQuery.refetch();
              } finally {
                setPendingUpload(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input id="file" name="file" type="file" ref={fileInputRef} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pendingUpload}>
                Upload
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={manualDialogOpen}
        onOpenChange={(open) => {
          setManualDialogOpen(open);
          if (!open) {
            setManualTitle("");
            setManualContent("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Add Text Manually</DialogTitle>
            <DialogDescription>
              Paste or type content directly. The text is indexed as a single source.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            action={async (formData) => {
              setPendingManual(true);
              try {
                const result = await addManualTextSourceAction({}, formData);
                if (!result?.error) {
                  setManualTitle("");
                  setManualContent("");
                  setManualDialogOpen(false);
                  await sourcesQuery.refetch();
                }
              } finally {
                setPendingManual(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="manual-title">Title</Label>
              <Input
                id="manual-title"
                name="title"
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
                placeholder="FAQ answers"
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-content">Content</Label>
              <Textarea
                id="manual-content"
                name="content"
                value={manualContent}
                onChange={(event) => setManualContent(event.target.value)}
                placeholder="Paste the content you want to index…"
                required
                maxLength={100_000}
                className="min-h-[180px] resize-y"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setManualDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pendingManual}>
                Add text
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={sitemapDialogOpen}
        onOpenChange={(open) => {
          setSitemapDialogOpen(open);
          if (!open) {
            setSitemapTitle("");
            setSitemapUrl("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Import from Sitemap</DialogTitle>
            <DialogDescription>
              Provide a sitemap URL (e.g. <code>sitemap.xml</code>). Each URL listed will be fetched
              and combined into a single source.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            action={async (formData) => {
              setPendingSitemap(true);
              try {
                const result = await importSitemapSourceAction({}, formData);
                if (!result?.error) {
                  setSitemapTitle("");
                  setSitemapUrl("");
                  setSitemapDialogOpen(false);
                  await sourcesQuery.refetch();
                }
              } finally {
                setPendingSitemap(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="sitemap-title">Title</Label>
              <Input
                id="sitemap-title"
                name="title"
                value={sitemapTitle}
                onChange={(event) => setSitemapTitle(event.target.value)}
                placeholder="Docs sitemap"
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sitemap-url">Sitemap URL</Label>
              <Input
                id="sitemap-url"
                name="sourceUrl"
                type="url"
                value={sitemapUrl}
                onChange={(event) => setSitemapUrl(event.target.value)}
                placeholder="https://example.com/sitemap.xml"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSitemapDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pendingSitemap}>
                Import sitemap
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
