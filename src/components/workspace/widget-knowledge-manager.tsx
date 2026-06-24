"use client";

import { useReducer, useRef, type Dispatch, type RefObject } from "react";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Code,
  File as FileIcon,
  Globe,
  LayoutGrid,
  LinkIcon,
  Search,
  Settings,
  Table,
  Trash2,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  type KnowledgeBaseSource,
  useCreateRagSource,
  useDeleteKnowledgeBaseSource,
  useKnowledgeBaseSources,
  useUploadRagDocument,
} from "@/hooks/query";
import { cn } from "@/lib/utils";

type IngestionMode = "scrape" | "crawl" | "parse";

type KnowledgeFormState = {
  mode: IngestionMode;
  url: string;
  includePaths: string;
  excludePaths: string;
  maxPages: number;
  maxDepth: number;
  title: string;
  fileName: string;
  showAdvanced: boolean;
};

type KnowledgeFormAction =
  | { type: "setMode"; mode: IngestionMode }
  | { type: "setUrl"; url: string }
  | { type: "setIncludePaths"; includePaths: string }
  | { type: "setExcludePaths"; excludePaths: string }
  | { type: "setMaxPages"; maxPages: number }
  | { type: "setMaxDepth"; maxDepth: number }
  | { type: "setTitle"; title: string }
  | { type: "setFileName"; fileName: string }
  | { type: "toggleAdvanced" }
  | { type: "resetUrl" }
  | { type: "resetFile" };

const initialFormState: KnowledgeFormState = {
  mode: "scrape",
  url: "",
  includePaths: "",
  excludePaths: "",
  maxPages: 10,
  maxDepth: 1,
  title: "",
  fileName: "",
  showAdvanced: false,
};

function knowledgeFormReducer(
  state: KnowledgeFormState,
  action: KnowledgeFormAction,
): KnowledgeFormState {
  switch (action.type) {
    case "setMode":
      return { ...state, mode: action.mode };
    case "setUrl":
      return { ...state, url: action.url };
    case "setIncludePaths":
      return { ...state, includePaths: action.includePaths };
    case "setExcludePaths":
      return { ...state, excludePaths: action.excludePaths };
    case "setMaxPages":
      return { ...state, maxPages: action.maxPages };
    case "setMaxDepth":
      return { ...state, maxDepth: action.maxDepth };
    case "setTitle":
      return { ...state, title: action.title };
    case "setFileName":
      return { ...state, fileName: action.fileName };
    case "toggleAdvanced":
      return { ...state, showAdvanced: !state.showAdvanced };
    case "resetUrl":
      return { ...state, url: "" };
    case "resetFile":
      return { ...state, title: "", fileName: "" };
  }
}

const modes: {
  id: IngestionMode;
  label: string;
  icon: typeof Search;
}[] = [
  { id: "scrape", label: "Scrape", icon: LayoutGrid },
  { id: "parse", label: "Parse", icon: FileIcon },
  { id: "crawl", label: "Crawl", icon: Search },
];

const modeGroups = [
  { label: "EXTRACT", modes: modes.slice(0, 2) },
  { label: "CRAWL", modes: modes.slice(2) },
];

function sourceBadge(source: KnowledgeBaseSource) {
  if (source.sourceType === "crawl") return "Crawl";
  if (source.sourceType === "scrape") return "Scrape";
  return "Parse";
}

function statusVariant(status: string) {
  if (status === "ready") return "secondary";
  if (status === "failed") return "destructive";
  return "outline";
}

function normalizeUrlInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
}

export function WidgetKnowledgeManager() {
  const { toast } = useToast();
  const sourcesQuery = useKnowledgeBaseSources("default");
  const createSource = useCreateRagSource();
  const uploadDocument = useUploadRagDocument();
  const deleteSource = useDeleteKnowledgeBaseSource();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, dispatch] = useReducer(knowledgeFormReducer, initialFormState);

  const sources = sourcesQuery.data?.sources ?? [];
  const isPending = createSource.isPending || uploadDocument.isPending;

  async function submitUrlSource() {
    const normalized = normalizeUrlInput(form.url);
    if (!normalized) return;

    try {
      await createSource.mutateAsync({
        url: normalized,
        mode: form.mode === "crawl" ? "crawl" : "scrape",
        includePaths: form.includePaths,
        excludePaths: form.excludePaths,
        maxPages: form.maxPages,
        maxDepth: form.maxDepth,
      });
      dispatch({ type: "resetUrl" });
      toast({
        title: form.mode === "crawl" ? "Crawl complete" : "Page scraped",
        description: "Knowledge chunks are indexed for widget answers.",
      });
    } catch (error) {
      toast({
        title: "Firecrawl failed",
        description: error instanceof Error ? error.message : "Could not process that source.",
        variant: "destructive",
      });
    }
  }

  async function submitFileSource(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return;

    if (!form.title.trim()) {
      formData.set("title", file.name);
    }

    try {
      await uploadDocument.mutateAsync(formData);
      dispatch({ type: "resetFile" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({
        title: "File parsed",
        description: "Firecrawl extracted and indexed the source.",
      });
    } catch (error) {
      toast({
        title: "Parse failed",
        description: error instanceof Error ? error.message : "Could not parse that file.",
        variant: "destructive",
      });
    }
  }

  async function removeSource(sourceId: string) {
    try {
      await deleteSource.mutateAsync(sourceId);
      toast({ title: "Source removed" });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete the source.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Build workspace knowledge with Firecrawl scrape, crawl, and file parsing.
          </p>
        </div>
        <Badge variant="outline" className="h-7 gap-1.5 px-3">
          <CheckCircle2 className="size-3.5" />
          Vector indexed
        </Badge>
      </div>

      <section className="rounded-[28px] border bg-background shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <ModeTabs mode={form.mode} dispatch={dispatch} />

        {form.mode === "parse" ? (
          <ParsePanel
            form={form}
            dispatch={dispatch}
            fileInputRef={fileInputRef}
            isPending={isPending}
            isParsing={uploadDocument.isPending}
            submitFileSource={submitFileSource}
          />
        ) : (
          <UrlPanel
            form={form}
            dispatch={dispatch}
            isPending={isPending}
            isCreating={createSource.isPending}
            submitUrlSource={submitUrlSource}
          />
        )}
      </section>

      <SourceList
        isLoading={sourcesQuery.isLoading}
        sources={sources}
        isDeleting={deleteSource.isPending}
        removeSource={removeSource}
      />
    </div>
  );
}

function ModeTabs({
  mode,
  dispatch,
}: {
  mode: IngestionMode;
  dispatch: Dispatch<KnowledgeFormAction>;
}) {
  return (
    <div className="border-b px-5 pt-5 sm:px-8">
      <div className="flex flex-wrap items-end gap-4">
        {modeGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="px-2 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
              {group.label}
            </p>
            <div className="flex rounded-2xl bg-muted p-1">
              {group.modes.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => dispatch({ type: "setMode", mode: item.id })}
                    className={cn(
                      "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium text-muted-foreground transition",
                      mode === item.id && "bg-background text-foreground shadow-sm",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ParsePanel({
  form,
  dispatch,
  fileInputRef,
  isPending,
  isParsing,
  submitFileSource,
}: {
  form: KnowledgeFormState;
  dispatch: Dispatch<KnowledgeFormAction>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isPending: boolean;
  isParsing: boolean;
  submitFileSource: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={submitFileSource} className="space-y-5 p-5 sm:p-8">
      <div className="grid gap-3 md:grid-cols-[1fr_1.5fr]">
        <div className="space-y-2">
          <Label htmlFor="parse-title">Title</Label>
          <Input
            id="parse-title"
            name="title"
            value={form.title}
            onChange={(event) => dispatch({ type: "setTitle", title: event.target.value })}
            placeholder="Optional source title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="knowledge-file">File</Label>
          <Input
            ref={fileInputRef}
            id="knowledge-file"
            name="file"
            type="file"
            accept=".pdf,.txt,.csv,.doc,.docx,.rtf,.odt,.xlsx,image/png,image/jpeg,image/webp,image/gif,image/tiff"
            onChange={(event) =>
              dispatch({
                type: "setFileName",
                fileName: event.target.files?.[0]?.name ?? "",
              })
            }
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {form.fileName ||
            "PDFs, documents, spreadsheets, text files, and images are parsed by Firecrawl."}
        </p>
        <Button type="submit" disabled={isPending} className="sm:min-w-36">
          {isParsing ? "Parsing..." : "Start parsing"}
        </Button>
      </div>
    </form>
  );
}

function UrlPanel({
  form,
  dispatch,
  isPending,
  isCreating,
  submitUrlSource,
}: {
  form: KnowledgeFormState;
  dispatch: Dispatch<KnowledgeFormAction>;
  isPending: boolean;
  isCreating: boolean;
  submitUrlSource: () => Promise<void>;
}) {
  const pendingLabel =
    form.mode === "crawl"
      ? isCreating
        ? "Crawling..."
        : "Start crawling"
      : isCreating
        ? "Scraping..."
        : "Start scraping";

  return (
    <div className="space-y-5 p-5 sm:p-8">
      <div className="flex min-h-20 items-center rounded-3xl border bg-background px-4 shadow-inner">
        <span className="rounded-2xl border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          https://
        </span>
        <input
          aria-label={form.mode === "crawl" ? "URL to crawl" : "URL to scrape"}
          value={form.url}
          onChange={(event) => dispatch({ type: "setUrl", url: event.target.value })}
          placeholder={form.mode === "crawl" ? "docs.example.com" : "example.com/pricing"}
          className="h-16 min-w-0 flex-1 bg-transparent px-4 text-lg outline-none placeholder:text-muted-foreground"
        />
        <LinkIcon className="size-5 shrink-0 text-muted-foreground" />
      </div>

      {form.mode === "crawl" ? <CrawlScope form={form} dispatch={dispatch} /> : null}

      <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon" aria-label="Extraction settings">
            <Settings className="size-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Structured output">
            <Table className="size-4" />
          </Button>
          <Button variant="outline" type="button" className="gap-2">
            <FileIcon className="size-4" />
            Format: Markdown
            <ChevronDown className="size-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" type="button" className="gap-2">
            <Code className="size-4" />
            Get code
          </Button>
          <Button
            type="button"
            disabled={isPending || !form.url.trim()}
            onClick={submitUrlSource}
            className="min-w-36 bg-orange-600 text-white hover:bg-orange-700"
          >
            {pendingLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CrawlScope({
  form,
  dispatch,
}: {
  form: KnowledgeFormState;
  dispatch: Dispatch<KnowledgeFormAction>;
}) {
  return (
    <div className="space-y-4 rounded-2xl border bg-muted/20 p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-medium"
        onClick={() => dispatch({ type: "toggleAdvanced" })}
      >
        Crawl scope
        <ChevronDown className={cn("size-4 transition", form.showAdvanced && "rotate-180")} />
      </button>
      {form.showAdvanced ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="include-paths">Include paths</Label>
            <Input
              id="include-paths"
              value={form.includePaths}
              onChange={(event) =>
                dispatch({
                  type: "setIncludePaths",
                  includePaths: event.target.value,
                })
              }
              placeholder="/docs, /help"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exclude-paths">Exclude paths</Label>
            <Input
              id="exclude-paths"
              value={form.excludePaths}
              onChange={(event) =>
                dispatch({
                  type: "setExcludePaths",
                  excludePaths: event.target.value,
                })
              }
              placeholder="/blog, /legal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-pages">Max pages</Label>
            <Input
              id="max-pages"
              type="number"
              min={1}
              max={50}
              value={form.maxPages}
              onChange={(event) =>
                dispatch({ type: "setMaxPages", maxPages: Number(event.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-depth">Max depth</Label>
            <Input
              id="max-depth"
              type="number"
              min={0}
              max={3}
              value={form.maxDepth}
              onChange={(event) =>
                dispatch({ type: "setMaxDepth", maxDepth: Number(event.target.value) })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SourceList({
  isLoading,
  sources,
  isDeleting,
  removeSource,
}: {
  isLoading: boolean;
  sources: KnowledgeBaseSource[];
  isDeleting: boolean;
  removeSource: (sourceId: string) => Promise<void>;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Sources</h2>
          <p className="text-sm text-muted-foreground">
            Workspace-scoped documents indexed for the widget.
          </p>
        </div>
        <Badge variant="secondary">{sources.length}</Badge>
      </div>

      <div className="overflow-hidden rounded-2xl border">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading sources...</div>
        ) : sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <Globe className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">No knowledge sources yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Scrape a page, crawl a docs section, or parse a file.
              </p>
            </div>
          </div>
        ) : (
          sources.map((source) => (
            <div
              key={source.id}
              className="grid gap-3 border-b p-4 last:border-b-0 md:grid-cols-[1fr_auto_auto] md:items-center"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{source.displayName}</p>
                  <Badge variant="outline">{sourceBadge(source)}</Badge>
                  <Badge variant={statusVariant(source.status)}>{source.status}</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {source.canonicalUrl || source.metadata?.mimeType?.toString() || "Uploaded file"}
                </p>
                {source.lastError ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="size-3.5" />
                    {source.lastError}
                  </p>
                ) : null}
              </div>
              <div className="text-sm text-muted-foreground">{source.chunkCount} chunks</div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${source.displayName}`}
                disabled={isDeleting}
                onClick={() => void removeSource(source.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
