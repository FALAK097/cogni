import { z } from "zod";

const inboxCursorSchema = z.object({
  lastMessageAt: z.string().datetime({ offset: true }),
  id: z.string().min(1).max(128),
});

export type InboxCursor = z.infer<typeof inboxCursorSchema>;

export type InboxListParams = {
  search?: string;
  filter: "all" | "unread" | "unassigned" | "mine" | "open" | "closed" | "snoozed" | "tickets";
  channel?: InboxChannel;
  assignee?: string | "unassigned";
  label?: string;
  limit: number;
  cursor: InboxCursor | null;
};

export type InboxChannel = "WIDGET" | "DISCORD" | "GCHAT" | "SLACK" | "TEAMS" | "WHATSAPP";

export function parseInboxListParams(
  searchParams: URLSearchParams,
): { ok: true; data: InboxListParams } | { ok: false; error: string } {
  const search = searchParams.get("search")?.trim() ?? "";
  const filter = searchParams.get("filter") ?? "all";
  const channel = searchParams.get("channel") ?? "";
  const assignee = searchParams.get("assignee") ?? "";
  const label = searchParams.get("label")?.trim() ?? "";
  const limit = Number(searchParams.get("limit") ?? "20");
  const rawCursor = searchParams.get("cursor");
  const cursor = decodeInboxCursor(rawCursor);

  if (search.length > 200) return { ok: false, error: "Search must be 200 characters or fewer." };
  if (!inboxListFilterSchema.safeParse(filter).success) {
    return { ok: false, error: "Unsupported conversation filter." };
  }
  if (channel && !inboxChannelSchema.safeParse(channel).success) {
    return { ok: false, error: "Unsupported conversation channel." };
  }
  if (assignee && assignee !== "unassigned" && assignee.length > 128) {
    return { ok: false, error: "Assignee filter is invalid." };
  }
  if (label && !conversationLabelSchema.safeParse(label).success) {
    return { ok: false, error: "Label filter is invalid." };
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { ok: false, error: "Page size must be between 1 and 100." };
  }
  if (rawCursor && !cursor) return { ok: false, error: "Invalid conversation cursor." };

  return {
    ok: true,
    data: {
      filter: inboxListFilterSchema.parse(filter),
      ...(search ? { search } : {}),
      ...(channel ? { channel: inboxChannelSchema.parse(channel) } : {}),
      ...(assignee ? { assignee } : {}),
      ...(label ? { label: conversationLabelSchema.parse(label).toLowerCase() } : {}),
      limit,
      cursor,
    },
  };
}

const inboxListFilterSchema = z.enum([
  "all",
  "unread",
  "unassigned",
  "mine",
  "open",
  "closed",
  "snoozed",
  "tickets",
]);
const inboxChannelSchema = z.enum(["WIDGET", "DISCORD", "GCHAT", "SLACK", "TEAMS", "WHATSAPP"]);
export const conversationLabelSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u);

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
