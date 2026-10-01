import { z } from "zod";

const inboxCursorSchema = z.object({
  lastMessageAt: z.string().datetime({ offset: true }),
  id: z.string().min(1).max(128),
});

export type InboxCursor = z.infer<typeof inboxCursorSchema>;

export type InboxListParams = {
  search?: string;
  filter: "all" | "unassigned" | "mine" | "open" | "closed";
  limit: number;
  cursor: InboxCursor | null;
};

export function parseInboxListParams(
  searchParams: URLSearchParams,
): { ok: true; data: InboxListParams } | { ok: false; error: string } {
  const search = searchParams.get("search")?.trim() ?? "";
  const filter = searchParams.get("filter") ?? "all";
  const limit = Number(searchParams.get("limit") ?? "20");
  const rawCursor = searchParams.get("cursor");
  const cursor = decodeInboxCursor(rawCursor);

  if (search.length > 200) return { ok: false, error: "Search must be 200 characters or fewer." };
  if (!inboxListFilterSchema.safeParse(filter).success) {
    return { ok: false, error: "Unsupported conversation filter." };
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { ok: false, error: "Page size must be between 1 and 100." };
  }
  if (rawCursor && !cursor) return { ok: false, error: "Invalid conversation cursor." };

  return {
    ok: true,
    data: {
      search: search || undefined,
      filter: inboxListFilterSchema.parse(filter),
      limit,
      cursor,
    },
  };
}

const inboxListFilterSchema = z.enum(["all", "unassigned", "mine", "open", "closed"]);

export function encodeInboxCursor(cursor: InboxCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeInboxCursor(value: string | null): InboxCursor | null {
  if (!value || value.length > 512) return null;

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = inboxCursorSchema.safeParse(JSON.parse(decoded) as unknown);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
