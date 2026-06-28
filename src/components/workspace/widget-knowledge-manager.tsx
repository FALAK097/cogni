"use client";

import { useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { z } from "zod";
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
  type KnowledgeBaseSource,
} from "@/hooks/query/use-knowledge-base";

import { KnowledgeBaseSkeleton } from "./knowledge-base-skeleton";

const SORT_VALUES = [
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

type SortValue = (typeof SORT_VALUES)[number];
const sortParser = parseAsStringLiteral(SORT_VALUES).withDefault("updatedAt.desc");

const urlFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  sourceUrl: z.url("Enter a valid URL"),
});

const sitemapFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  sourceUrl: z.url("Enter a valid sitemap URL"),
});

const manualFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  content: z.string().trim().min(1, "Content is required").max(100_000),
});

const SOURCE_TYPE_META: Record<
  string,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  website: {
    label: "Website",
    className: "border-indigo-500/15 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    icon: Globe,
  },
  sitemap: {
    label: "Sitemap",
    className: "border-fuchsia-500/15 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
    icon: ListTree,
  },
  file: {
    label: "Document",
    className: "border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: FileText,
  },
  txt: {
    label: "Text",
    className: "border-amber-500/15 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: ScrollText,
  },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  ready: {
    label: "Indexed",
    className: "border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  indexed: {
    label: "Indexed",
    className: "border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  processing: {
    label: "Processing",
    className: "border-sky-500/15 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  failed: {
    label: "Failed",
    className: "border-red-500/15 bg-red-500/10 text-red-700 dark:text-red-300",
  },
};

function getSourceTypeMeta(sourceType: string) {
  return (
    SOURCE_TYPE_META[sourceType.toLowerCase()] ?? {
      label: sourceType,
      className: "border-slate-500/15 bg-slate-500/10 text-slate-700 dark:text-slate-300",
      icon: FileText,
    }
  );
}

function getStatusMeta(status: string) {
  return (
    STATUS_META[status.toLowerCase()] ?? {
      label: status,
      className: "border-slate-500/15 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    }
  );
}

function getDocumentFileName(storageKey?: string | null) {
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

function parseSortValue(value: SortValue): SortingState {
  const [id, dir] = value.split(".") as [string, "asc" | "desc"];
  return [{ id, desc: dir === "desc" }];
}

function formatSortValue(state: SortingState): SortValue {
  const first = state[0];
  if (!first) return "updatedAt.desc";
  return `${first.id}.${first.desc ? "desc" : "asc"}` as SortValue;
}

type AddDialog = "url" | "upload" | "manual" | "sitemap" | null;

export function WidgetKnowledgeManager() {
  const sourcesQuery = useKnowledgeBaseSources("default");
  const deleteMutation = useDeleteKnowledgeBaseSource();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sortBy, setSortBy] = useQueryState("kbSort", sortParser);
  const [addDialog, setAddDialog] = useState<AddDialog>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [pending, setPending] = useState<{
    url: boolean;
    upload: boolean;
    manual: boolean;
    sitemap: boolean;
  }>({ url: false, upload: false, manual: false, sitemap: false });

  const sources = sourcesQuery.data?.sources ?? [];

  const sorting = parseSortValue(sortBy);
  const setSorting = (updater: SortingState | ((old: SortingState) => SortingState)) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    void setSortBy(formatSortValue(next));
  };

  const columns = useMemo<ColumnDef<KnowledgeBaseSource>[]>(
    () => [
      {
        id: "displayName",
        accessorKey: "displayName",
        header: "Source",
        cell: ({ row }) => {
          const source = row.original;
          const typeMeta = getSourceTypeMeta(source.sourceType);
          const Icon = typeMeta.icon;
          const fileName = getDocumentFileName(
            (source.metadata?.storageKey as string | undefined) ?? null,
          );
          const sourceType = source.sourceType.toLowerCase();
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
          return (
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-sm font-medium text-foreground">{primaryLabel}</p>
                {secondaryLabel ? (
                  <p className="truncate text-[12px] text-muted-foreground">{secondaryLabel}</p>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        id: "sourceType",
        accessorKey: "sourceType",
        header: "Type",
        cell: ({ row }) => {
          const meta = getSourceTypeMeta(row.original.sourceType);
          return (
            <Badge
              variant="secondary"
              className={`h-7 rounded-full border px-3 text-[12px] font-medium ${meta.className}`}
            >
              {meta.label}
            </Badge>
          );
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const meta = getStatusMeta(row.original.status);
          return (
            <Badge
              variant="secondary"
              className={`h-7 rounded-full border px-3 text-[12px] font-medium ${meta.className}`}
            >
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
              {meta.label}
            </Badge>
          );
        },
      },
      {
        id: "chunkCount",
        accessorKey: "chunkCount",
        header: "Indexed Pages",
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground/80">
            {getValue<number>() > 0 ? getValue<number>() : "—"}
          </span>
        ),
      },
      {
        id: "updatedAt",
        accessorKey: "updatedAt",
        header: "Last Updated",
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground/75">{formatUpdatedAt(getValue<string>())}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
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
                  void deleteMutation.mutateAsync(row.original.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [deleteMutation],
  );

  const table = useReactTable({
    data: sources,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function openAddDialog(dialog: AddDialog) {
    setAddMenuOpen(false);
    queueMicrotask(() => setAddDialog(dialog));
  }

  function setPendingFlag(key: keyof typeof pending, value: boolean) {
    setPending((prev) => ({ ...prev, [key]: value }));
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
              onClick={() => openAddDialog("url")}
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
              onClick={() => openAddDialog("upload")}
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
              onClick={() => openAddDialog("manual")}
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
              onClick={() => openAddDialog("sitemap")}
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
                onClick={() => setAddDialog("url")}
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
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-border/60 hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();
                    return (
                      <TableHead
                        key={header.id}
                        className="h-auto px-5 py-4 text-[12px] font-medium text-foreground/60"
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            className="inline-flex cursor-pointer items-center gap-1.5 text-left transition-colors hover:text-foreground"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sortDirection === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : sortDirection === "desc" ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                            )}
                          </button>
                        ) : (
                          <span>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="text-[13px]">
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-border/60 hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`whitespace-normal px-5 py-4 align-middle ${
                        cell.column.id === "actions" ? "text-right" : ""
                      }`}
                    >
                      <div
                        className={
                          cell.column.id === "actions" ? "ml-auto flex w-full justify-end" : ""
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!sourcesQuery.isLoading && sources.length > 0 ? (
          <div className="border-t border-border/60 px-5 py-4 text-sm text-muted-foreground">
            Showing 1 to {sources.length} of {sources.length} sources
          </div>
        ) : null}
      </div>

      <UrlDialog
        open={addDialog === "url"}
        onOpenChange={(open) => setAddDialog(open ? "url" : null)}
        onSuccess={() => sourcesQuery.refetch()}
        pending={pending.url}
        setPending={(v) => setPendingFlag("url", v)}
      />

      <UploadDialog
        open={addDialog === "upload"}
        onOpenChange={(open) => setAddDialog(open ? "upload" : null)}
        onSuccess={() => sourcesQuery.refetch()}
        pending={pending.upload}
        setPending={(v) => setPendingFlag("upload", v)}
        fileInputRef={fileInputRef}
      />

      <ManualDialog
        open={addDialog === "manual"}
        onOpenChange={(open) => setAddDialog(open ? "manual" : null)}
        onSuccess={() => sourcesQuery.refetch()}
        pending={pending.manual}
        setPending={(v) => setPendingFlag("manual", v)}
      />

      <SitemapDialog
        open={addDialog === "sitemap"}
        onOpenChange={(open) => setAddDialog(open ? "sitemap" : null)}
        onSuccess={() => sourcesQuery.refetch()}
        pending={pending.sitemap}
        setPending={(v) => setPendingFlag("sitemap", v)}
      />
    </div>
  );
}

type AddDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void | Promise<void>;
  pending: boolean;
  setPending: (value: boolean) => void;
};

function UrlDialog({ open, onOpenChange, onSuccess, pending, setPending }: AddDialogProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const parsed = urlFormSchema.safeParse({
      title: formData.get("title"),
      sourceUrl: formData.get("sourceUrl"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the URL details.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await addUrlSourceAction({}, toFormData(parsed.data));
      if (result?.error) {
        setError(result.error);
        return;
      }
      setTitle("");
      setUrl("");
      onOpenChange(false);
      await onSuccess();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Website URL</DialogTitle>
          <DialogDescription>Crawl and index pages from a website root.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" action={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="kb-url-title">Title</Label>
            <Input
              id="kb-url-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Help Center"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kb-url-sourceUrl">URL</Label>
            <Input
              id="kb-url-sourceUrl"
              name="sourceUrl"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/docs"
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Add URL source
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  onSuccess,
  pending,
  setPending,
  fileInputRef,
}: AddDialogProps & { fileInputRef: React.RefObject<HTMLInputElement | null> }) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError(null);
    setPending(true);
    try {
      await uploadMutation.mutateAsync(formData);
      form.reset();
      if (fileInputRef.current) fileInputRef.current.value = "";
      onOpenChange(false);
      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            PDF, DOCX, and TXT files are indexed from uploaded content. The file name is used as the
            source title.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="kb-upload-file">File</Label>
            <Input id="kb-upload-file" name="file" type="file" ref={fileInputRef} required />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ManualDialog({ open, onOpenChange, onSuccess, pending, setPending }: AddDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const parsed = manualFormSchema.safeParse({
      title: formData.get("title"),
      content: formData.get("content"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the text details.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await addManualTextSourceAction({}, toFormData(parsed.data));
      if (result?.error) {
        setError(result.error);
        return;
      }
      setTitle("");
      setContent("");
      onOpenChange(false);
      await onSuccess();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Add Text Manually</DialogTitle>
          <DialogDescription>
            Paste or type content directly. The text is indexed as a single source.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" action={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="kb-manual-title">Title</Label>
            <Input
              id="kb-manual-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="FAQ answers"
              required
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kb-manual-content">Content</Label>
            <Textarea
              id="kb-manual-content"
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Paste the content you want to index…"
              required
              maxLength={100_000}
              className="min-h-[180px] resize-y"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Add text
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SitemapDialog({ open, onOpenChange, onSuccess, pending, setPending }: AddDialogProps) {
  const [title, setTitle] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const parsed = sitemapFormSchema.safeParse({
      title: formData.get("title"),
      sourceUrl: formData.get("sourceUrl"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the sitemap details.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await importSitemapSourceAction({}, toFormData(parsed.data));
      if (result?.error) {
        setError(result.error);
        return;
      }
      setTitle("");
      setSitemapUrl("");
      onOpenChange(false);
      await onSuccess();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
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
        <form className="space-y-4" action={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="kb-sitemap-title">Title</Label>
            <Input
              id="kb-sitemap-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Docs sitemap"
              required
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kb-sitemap-sourceUrl">Sitemap URL</Label>
            <Input
              id="kb-sitemap-sourceUrl"
              name="sourceUrl"
              type="url"
              value={sitemapUrl}
              onChange={(event) => setSitemapUrl(event.target.value)}
              placeholder="https://example.com/sitemap.xml"
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Import sitemap
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toFormData<T extends Record<string, string>>(values: T): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}
