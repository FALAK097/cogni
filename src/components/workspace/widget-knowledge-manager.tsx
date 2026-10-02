"use client";

import { formatDistanceToNow } from "date-fns";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type Header,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { type ComponentType, type FormEvent, type RefObject, useRef, useState } from "react";
import { z } from "zod";

import {
  AlertCircle,
  ArrowUpDown,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Ellipsis,
  FileText,
  Globe,
  Inbox,
  ListTree,
  Loader2,
  Plus,
  RefreshCw,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  type KnowledgeBaseSource,
  useAddManualTextSource,
  useAddUrlSource,
  useDeleteKnowledgeBaseSource,
  useImportSitemapSource,
  useKnowledgeBaseSources,
  useRetryKnowledgeBaseSource,
  useUploadRagDocument,
} from "@/hooks/query/use-knowledge-base";
import { cn } from "@/lib/utils";

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
type SortColumn = "displayName" | "sourceType" | "status" | "chunkCount" | "updatedAt";
type AddDialog = "url" | "upload" | "manual" | "sitemap" | null;

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

type SourceTypeMeta = {
  label: string;
  className: string;
  icon: ComponentType<{ className?: string }>;
};

const SOURCE_TYPE_META: Record<string, SourceTypeMeta> = {
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

const FALLBACK_SOURCE_TYPE: SourceTypeMeta = {
  label: "Unknown",
  className: "border-slate-500/15 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  icon: FileText,
};

const FALLBACK_STATUS = {
  label: "Unknown",
  className: "border-slate-500/15 bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

function getSourceTypeMeta(sourceType: string): SourceTypeMeta {
  return SOURCE_TYPE_META[sourceType.toLowerCase()] ?? FALLBACK_SOURCE_TYPE;
}

function getStatusMeta(status: string) {
  return STATUS_META[status.toLowerCase()] ?? FALLBACK_STATUS;
}

function getDocumentFileName(storageKey?: string | null) {
  if (!storageKey) return null;
  const segments = storageKey.split("/");
  return segments[segments.length - 1] ?? null;
}

function getStorageKey(source: KnowledgeBaseSource): string | null {
  const storageKey = source.metadata?.storageKey;
  return typeof storageKey === "string" ? storageKey : null;
}

function formatUpdatedAt(value: string) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return value;
  }
}

function parseSortValue(value: SortValue): SortingState {
  const [id, dir] = value.split(".") as [SortColumn, "asc" | "desc"];
  return [{ id, desc: dir === "desc" }];
}

function formatSortValue(state: SortingState): SortValue {
  const first = state[0];
  if (!first) return "updatedAt.desc";
  return `${first.id}.${first.desc ? "desc" : "asc"}` as SortValue;
}

export function WidgetKnowledgeManager({ canManage }: { canManage: boolean }) {
  const sourcesQuery = useKnowledgeBaseSources("default");
  const deleteMutation = useDeleteKnowledgeBaseSource();
  const retryMutation = useRetryKnowledgeBaseSource();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addDialog, setAddDialog] = useState<AddDialog>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBaseSource | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useQueryState("kbSort", sortParser);

  const sources = sourcesQuery.data?.sources ?? [];
  const isInitialLoading = sourcesQuery.isLoading;
  const isRefetching = sourcesQuery.isFetching && !sourcesQuery.isLoading;
  const sorting = parseSortValue(sortBy);

  async function handleDeleteConfirm() {
    if (!canManage) return;
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete source");
    }
  }

  function handleSortChange(updater: SortingState | ((old: SortingState) => SortingState)) {
    const nextSorting = typeof updater === "function" ? updater(sorting) : updater;
    void setSortBy(formatSortValue(nextSorting));
  }

  function handleSourceError(message: string) {
    setAddError(message);
  }

  async function handleRetrySource(source: KnowledgeBaseSource) {
    if (!canManage) return;
    setAddError(null);
    try {
      await retryMutation.mutateAsync(source.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to retry indexing";
      setAddError(`Couldn’t retry “${source.displayName}”: ${message}`);
    }
  }

  function startAddDialog(value: Exclude<AddDialog, null>) {
    if (!canManage) return;
    setAddDialog(value);
    setAddMenuOpen(false);
    setAddError(null);
  }

  function closeDeleteDialog() {
    setDeleteTarget(null);
    setDeleteError(null);
  }

  return (
    <div className="space-y-6 pb-10">
      <KnowledgeToolbar
        canManage={canManage}
        addMenuOpen={addMenuOpen}
        isRefetching={isRefetching}
        showRetry={sourcesQuery.isError && !isInitialLoading}
        onAddMenuOpenChange={setAddMenuOpen}
        onRetry={() => sourcesQuery.refetch()}
        onSelectAddDialog={startAddDialog}
      />

      {addError ? <ErrorBanner message={addError} onDismiss={() => setAddError(null)} /> : null}
      {!canManage ? (
        <output className="block rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
          You can review source health. Only workspace owners can add, retry, or delete sources.
        </output>
      ) : null}

      <KnowledgeSourcesPanel
        canManage={canManage}
        isInitialLoading={isInitialLoading}
        isError={sourcesQuery.isError}
        isRefetching={isRefetching}
        sources={sources}
        sorting={sorting}
        onRetry={() => sourcesQuery.refetch()}
        onAddFirstSource={() => setAddDialog("url")}
        onSortChange={handleSortChange}
        onDeleteSource={setDeleteTarget}
        retryingSourceId={retryMutation.isPending ? retryMutation.variables : null}
        onRetrySource={(source) => void handleRetrySource(source)}
      />

      <KnowledgeDialogs
        addDialog={addDialog}
        deleteTarget={deleteTarget}
        deleteError={deleteError}
        deletePending={deleteMutation.isPending}
        fileInputRef={fileInputRef}
        onAddDialogChange={setAddDialog}
        onDeleteOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
        onDeleteConfirm={() => {
          void handleDeleteConfirm();
        }}
        onError={handleSourceError}
        onSuccess={() => sourcesQuery.refetch()}
      />
    </div>
  );
}

function KnowledgeToolbar({
  canManage,
  addMenuOpen,
  isRefetching,
  showRetry,
  onAddMenuOpenChange,
  onRetry,
  onSelectAddDialog,
}: {
  canManage: boolean;
  addMenuOpen: boolean;
  isRefetching: boolean;
  showRetry: boolean;
  onAddMenuOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onSelectAddDialog: (dialog: Exclude<AddDialog, null>) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {showRetry ? (
        <Button size="sm" variant="outline" className="h-9 rounded-full" onClick={onRetry}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      ) : null}
      {canManage ? (
        <DropdownMenu open={addMenuOpen} onOpenChange={onAddMenuOpenChange}>
          <DropdownMenuTrigger
            render={
              <Button
                className="h-9 rounded-full px-3 shadow-none sm:px-4"
                size="default"
                aria-label="Add knowledge source"
              >
                {isRefetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add Source
                <ChevronDown className="hidden h-4 w-4 opacity-70 sm:inline" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={10} className="w-80 p-2">
            <AddSourceMenu onSelect={onSelectAddDialog} />
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="rounded-full border border-border/70 px-3 py-2 text-xs text-muted-foreground">
          Owner access required
        </span>
      )}
    </div>
  );
}

function KnowledgeSourcesPanel({
  canManage,
  isInitialLoading,
  isError,
  isRefetching,
  sources,
  sorting,
  onRetry,
  onAddFirstSource,
  onSortChange,
  onDeleteSource,
  onRetrySource,
  retryingSourceId,
}: {
  canManage: boolean;
  isInitialLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  sources: KnowledgeBaseSource[];
  sorting: SortingState;
  onRetry: () => void;
  onAddFirstSource: () => void;
  onSortChange: (updater: SortingState | ((old: SortingState) => SortingState)) => void;
  onDeleteSource: (source: KnowledgeBaseSource) => void;
  onRetrySource: (source: KnowledgeBaseSource) => void;
  retryingSourceId: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-border/60 bg-transparent shadow-none [--card-spacing:0rem]">
      {isInitialLoading ? (
        <KnowledgeBaseSkeleton />
      ) : isError ? (
        <QueryErrorState onRetry={onRetry} />
      ) : sources.length === 0 ? (
        <KnowledgeEmptyState canManage={canManage} onAddFirstSource={onAddFirstSource} />
      ) : (
        <>
          <KnowledgeSourcesMobileList
            canManage={canManage}
            sources={sources}
            onDeleteSource={onDeleteSource}
            onRetrySource={onRetrySource}
            retryingSourceId={retryingSourceId}
          />
          <KnowledgeSourcesTable
            canManage={canManage}
            sources={sources}
            sorting={sorting}
            onSortChange={onSortChange}
            onDeleteSource={onDeleteSource}
            onRetrySource={onRetrySource}
            retryingSourceId={retryingSourceId}
          />
          <KnowledgeSourcesFooter
            visibleCount={sources.length}
            totalCount={sources.length}
            isRefetching={isRefetching}
          />
        </>
      )}
    </div>
  );
}

function KnowledgeEmptyState({
  canManage,
  onAddFirstSource,
}: {
  canManage: boolean;
  onAddFirstSource: () => void;
}) {
  return (
    <div className="p-6">
      <EmptyState
        icon={BookOpen}
        title="No knowledge sources yet"
        description="Add a website URL, upload documents, or paste text to teach your AI assistant how to answer questions."
      >
        {canManage ? (
          <Button size="sm" className="h-9 rounded-xl shadow-none" onClick={onAddFirstSource}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Source
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Ask a workspace owner to add a source.</p>
        )}
      </EmptyState>
    </div>
  );
}

function KnowledgeSourcesMobileList({
  canManage,
  sources,
  onDeleteSource,
  onRetrySource,
  retryingSourceId,
}: {
  canManage: boolean;
  sources: KnowledgeBaseSource[];
  onDeleteSource: (source: KnowledgeBaseSource) => void;
  onRetrySource: (source: KnowledgeBaseSource) => void;
  retryingSourceId: string | null;
}) {
  return (
    <div className="space-y-3 p-4 md:hidden">
      {sources.map((source) => {
        const typeMeta = getSourceTypeMeta(source.sourceType);
        const Icon = typeMeta.icon;
        const fileName = getDocumentFileName(getStorageKey(source));
        const sourceType = source.sourceType.toLowerCase();
        const hasFileLabel = (sourceType === "file" || sourceType === "txt") && fileName;
        const primaryLabel = hasFileLabel ? fileName : source.displayName;

        return (
          <div
            key={source.id}
            className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{primaryLabel}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SourceTypeBadge sourceType={source.sourceType} />
                  <StatusBadge status={source.status} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {source.chunkCount > 0 ? `${source.chunkCount} pages` : "No pages indexed"}
                  </span>
                  <span>{formatUpdatedAt(source.updatedAt)}</span>
                </div>
              </div>
              {canManage ? (
                <SourceActions
                  source={source}
                  onDeleteSource={onDeleteSource}
                  onRetrySource={onRetrySource}
                  isRetrying={retryingSourceId === source.id}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KnowledgeSourcesFooter({
  visibleCount,
  totalCount,
  isRefetching,
}: {
  visibleCount: number;
  totalCount: number;
  isRefetching: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-t border-border/60 px-4 py-4 text-sm text-muted-foreground sm:px-5">
      <span>
        Showing {visibleCount} of {totalCount} source{totalCount === 1 ? "" : "s"}
      </span>
      {isRefetching ? (
        <span className="inline-flex items-center gap-1.5 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          Refreshing...
        </span>
      ) : null}
    </div>
  );
}

function KnowledgeSourcesTable({
  canManage,
  sources,
  sorting,
  onSortChange,
  onDeleteSource,
  onRetrySource,
  retryingSourceId,
}: {
  canManage: boolean;
  sources: KnowledgeBaseSource[];
  sorting: SortingState;
  onSortChange: (updater: SortingState | ((old: SortingState) => SortingState)) => void;
  onDeleteSource: (source: KnowledgeBaseSource) => void;
  onRetrySource: (source: KnowledgeBaseSource) => void;
  retryingSourceId: string | null;
}) {
  "use no memo";

  const columns: ColumnDef<KnowledgeBaseSource>[] = [
    {
      id: "displayName",
      accessorKey: "displayName",
      header: "Source",
      cell: ({ row }) => <SourceIdentity source={row.original} />,
    },
    {
      id: "sourceType",
      accessorKey: "sourceType",
      header: "Type",
      cell: ({ row }) => <SourceTypeBadge sourceType={row.original.sourceType} />,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "chunkCount",
      accessorKey: "chunkCount",
      header: "Indexed Pages",
      cell: ({ row }) => (
        <span className="text-sm text-foreground/80">
          {row.original.chunkCount > 0 ? row.original.chunkCount : "-"}
        </span>
      ),
    },
    {
      id: "updatedAt",
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => (
        <span className="text-sm text-foreground/75">
          {formatUpdatedAt(row.original.updatedAt)}
        </span>
      ),
    },
  ];
  if (canManage) {
    columns.push({
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <SourceActions
          source={row.original}
          onDeleteSource={onDeleteSource}
          onRetrySource={onRetrySource}
          isRetrying={retryingSourceId === row.original.id}
        />
      ),
    });
  }

  /* oxlint-disable react/incompatible-library -- This is the single isolated TanStack Table v8 integration. */
  // react-doctor-disable-next-line react-hooks-js/incompatible-library -- The table adapter intentionally owns its non-memoizable model callbacks.
  const table = useReactTable({
    data: sources,
    columns,
    state: { sorting },
    onSortingChange: onSortChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  /* oxlint-enable react/incompatible-library */
  const rows = table.getRowModel().rows;

  return (
    <>
      <Table className="hidden table-fixed md:table">
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
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "h-auto px-5 py-4 text-[12px] font-medium text-foreground/60",
                    header.column.id === "actions" && "text-right",
                  )}
                >
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <SortHeader header={header} />
                  ) : (
                    <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="text-[13px]">
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-muted-foreground"
              >
                <span className="inline-flex items-center gap-2">
                  <Inbox className="h-4 w-4" />
                  No sources match the current sort.
                </span>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} className="border-border/60 hover:bg-muted/30">
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "whitespace-normal px-5 py-4 align-middle",
                      cell.column.id === "actions" && "text-right",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}

function SortHeader({ header }: { header: Header<KnowledgeBaseSource, unknown> }) {
  const sortDirection = header.column.getIsSorted();

  return (
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
  );
}

function SourceIdentity({ source }: { source: KnowledgeBaseSource }) {
  const typeMeta = getSourceTypeMeta(source.sourceType);
  const Icon = typeMeta.icon;
  const fileName = getDocumentFileName(getStorageKey(source));
  const sourceType = source.sourceType.toLowerCase();
  const hasFileLabel = (sourceType === "file" || sourceType === "txt") && fileName;
  const primaryLabel = hasFileLabel ? fileName : source.displayName;
  const secondaryLabel =
    hasFileLabel && source.displayName !== fileName
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
}

function SourceActions({
  source,
  onDeleteSource,
  onRetrySource,
  isRetrying,
}: {
  source: KnowledgeBaseSource;
  onDeleteSource: (source: KnowledgeBaseSource) => void;
  onRetrySource: (source: KnowledgeBaseSource) => void;
  isRetrying: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label={`Open actions for ${source.displayName}`}
          >
            <Ellipsis className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={8} className="w-44">
        {source.status === "failed" ? (
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            disabled={isRetrying}
            onClick={() => onRetrySource(source)}
          >
            {isRetrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isRetrying ? "Retrying…" : "Retry indexing"}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          className="cursor-pointer gap-2 text-destructive"
          variant="destructive"
          onClick={() => onDeleteSource(source)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SourceTypeBadge({ sourceType }: { sourceType: string }) {
  const meta = getSourceTypeMeta(sourceType);
  return (
    <Badge
      variant="secondary"
      className={cn("h-7 rounded-full border px-3 text-[12px] font-medium", meta.className)}
    >
      {meta.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = getStatusMeta(status);
  return (
    <Badge
      variant="secondary"
      className={cn("h-7 rounded-full border px-3 text-[12px] font-medium", meta.className)}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </Badge>
  );
}

function QueryErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="m-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-8 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-destructive/30 bg-card text-destructive">
        <AlertCircle className="h-5 w-5" />
      </span>
      <h3 className="text-sm font-semibold text-foreground">Failed to load sources</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        We couldn't reach the knowledge base. Check your connection and try again.
      </p>
      <Button size="sm" variant="outline" className="mt-4 h-8 rounded-lg" onClick={onRetry}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="text-destructive/70 hover:text-destructive"
        aria-label="Dismiss"
      >
        x
      </button>
    </div>
  );
}

function AddSourceMenu({ onSelect }: { onSelect: (dialog: Exclude<AddDialog, null>) => void }) {
  const items: Array<{
    dialog: Exclude<AddDialog, null>;
    label: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
  }> = [
    {
      dialog: "url",
      label: "Add Website URL",
      description: "Crawl and index a website",
      icon: Globe,
    },
    {
      dialog: "upload",
      label: "Upload Document",
      description: "PDF, DOCX, TXT up to 50MB",
      icon: Upload,
    },
    {
      dialog: "manual",
      label: "Add Text Manually",
      description: "Add text content directly",
      icon: ScrollText,
    },
    {
      dialog: "sitemap",
      label: "Import from Sitemap",
      description: "Import pages from sitemap.xml",
      icon: ListTree,
    },
  ];

  return (
    <>
      {items.map((item) => (
        <DropdownMenuItem
          key={item.dialog}
          className="cursor-pointer items-start gap-3 rounded-2xl px-3 py-3"
          closeOnClick={false}
          onClick={() => onSelect(item.dialog)}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/30 text-muted-foreground">
            <item.icon className="h-4 w-4" />
          </span>
          <span className="space-y-0.5">
            <span className="block text-sm font-medium text-foreground">{item.label}</span>
            <span className="block text-xs text-muted-foreground">{item.description}</span>
          </span>
        </DropdownMenuItem>
      ))}
    </>
  );
}

function KnowledgeDialogs({
  addDialog,
  deleteTarget,
  deleteError,
  deletePending,
  fileInputRef,
  onAddDialogChange,
  onDeleteOpenChange,
  onDeleteConfirm,
  onError,
  onSuccess,
}: {
  addDialog: AddDialog;
  deleteTarget: KnowledgeBaseSource | null;
  deleteError: string | null;
  deletePending: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAddDialogChange: (dialog: AddDialog) => void;
  onDeleteOpenChange: (open: boolean) => void;
  onDeleteConfirm: () => void;
  onError: (message: string) => void;
  onSuccess: () => void;
}) {
  return (
    <>
      <UrlDialog
        open={addDialog === "url"}
        onOpenChange={(open) => onAddDialogChange(open ? "url" : null)}
        onSuccess={onSuccess}
        onError={onError}
      />
      <UploadDialog
        open={addDialog === "upload"}
        onOpenChange={(open) => onAddDialogChange(open ? "upload" : null)}
        onSuccess={onSuccess}
        onError={onError}
        fileInputRef={fileInputRef}
      />
      <ManualDialog
        open={addDialog === "manual"}
        onOpenChange={(open) => onAddDialogChange(open ? "manual" : null)}
        onSuccess={onSuccess}
        onError={onError}
      />
      <SitemapDialog
        open={addDialog === "sitemap"}
        onOpenChange={(open) => onAddDialogChange(open ? "sitemap" : null)}
        onSuccess={onSuccess}
        onError={onError}
      />
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={onDeleteOpenChange}
        source={deleteTarget}
        onConfirm={onDeleteConfirm}
        pending={deletePending}
        error={deleteError}
      />
    </>
  );
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  source,
  onConfirm,
  pending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: KnowledgeBaseSource | null;
  onConfirm: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete this source?</DialogTitle>
          <DialogDescription>
            {source?.displayName
              ? `"${source.displayName}" will be removed and its chunks deleted.`
              : "This source will be removed and its chunks deleted."}
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-4 w-4" />
            )}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AddDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onError: (message: string) => void;
};

function UrlDialog({ open, onOpenChange, onSuccess, onError }: AddDialogProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const mutation = useAddUrlSource();

  async function handleSubmit(formData: FormData) {
    const parsed = urlFormSchema.safeParse({
      title: formData.get("title"),
      sourceUrl: formData.get("sourceUrl"),
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Check the URL details.");
      return;
    }
    setValidationError(null);
    try {
      await mutation.mutateAsync(parsed.data);
      setTitle("");
      setUrl("");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not process that URL.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setValidationError(null);
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
          {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
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
  onError,
  fileInputRef,
}: AddDialogProps & { fileInputRef: RefObject<HTMLInputElement | null> }) {
  const mutation = useUploadRagDocument();
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setValidationError(null);
    try {
      await mutation.mutateAsync(formData);
      form.reset();
      if (fileInputRef.current) fileInputRef.current.value = "";
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setValidationError(null);
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
          {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ManualDialog({ open, onOpenChange, onSuccess, onError }: AddDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const mutation = useAddManualTextSource();

  async function handleSubmit(formData: FormData) {
    const parsed = manualFormSchema.safeParse({
      title: formData.get("title"),
      content: formData.get("content"),
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Check the text details.");
      return;
    }
    setValidationError(null);
    try {
      await mutation.mutateAsync(parsed.data);
      setTitle("");
      setContent("");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not process that text.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setValidationError(null);
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
              placeholder="Paste the content you want to index..."
              required
              maxLength={100_000}
              className="min-h-[180px] resize-y"
            />
          </div>
          {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Add text
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SitemapDialog({ open, onOpenChange, onSuccess, onError }: AddDialogProps) {
  const [title, setTitle] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const mutation = useImportSitemapSource();

  async function handleSubmit(formData: FormData) {
    const parsed = sitemapFormSchema.safeParse({
      title: formData.get("title"),
      sourceUrl: formData.get("sourceUrl"),
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Check the sitemap details.");
      return;
    }
    setValidationError(null);
    try {
      await mutation.mutateAsync(parsed.data);
      setTitle("");
      setSitemapUrl("");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not process that sitemap.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setValidationError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Import from Sitemap</DialogTitle>
          <DialogDescription>
            Provide a sitemap URL (for example, sitemap.xml). Each listed URL will be fetched and
            combined into one source.
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
          {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Import sitemap
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
