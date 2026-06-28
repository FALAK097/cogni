"use client";

import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Search,
  Smartphone,
  User,
} from "@/components/icons";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWidgetSessions } from "@/hooks/query";
import type { WidgetSessionSummary } from "@/hooks/query";
import { generateAvatarUrl } from "@/lib/avatar-generator";
import { getVisitorName } from "@/lib/constants";

import { ConversationsListSkeleton } from "./conversations-list-skeleton";

interface ConversationsListProps {
  onSelectSession: (sessionId: string) => void;
}

const PAGE_SIZE = 10;
const VISITOR_LABEL_SEARCH_LIMIT = 100;

function isVisitorLabelSearch(search: string) {
  return search.trim().toLowerCase().startsWith("visitor");
}

function getSessionSearchText(session: WidgetSessionSummary) {
  return [
    getVisitorName(session.visitorId),
    session.visitorId,
    session.country,
    session.city,
    session.browser,
    // Note: os is not directly on WidgetSessionSummary, but is part of device type or available context
    session.deviceType,
    ...(session.messages ?? []).map((message) => message.content ?? ""),
  ]
    .join(" ")
    .toLowerCase();
}

export function ConversationsList({ onSelectSession }: ConversationsListProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("lastActivityAt");
  const [order, setOrder] = useState("desc");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const shouldClientFilterVisitorLabel = isVisitorLabelSearch(debouncedSearch);
  const { data: sessionsData, isLoading: loading } = useWidgetSessions({
    page,
    limit: shouldClientFilterVisitorLabel ? VISITOR_LABEL_SEARCH_LIMIT : PAGE_SIZE,
    sort,
    order,
    search: shouldClientFilterVisitorLabel ? "" : debouncedSearch,
  });

  const fetchedSessions = sessionsData?.sessions || [];
  const filteredSessions = shouldClientFilterVisitorLabel
    ? fetchedSessions.filter((session) =>
        getSessionSearchText(session).includes(debouncedSearch.trim().toLowerCase()),
      )
    : fetchedSessions;
  const sessions = shouldClientFilterVisitorLabel
    ? filteredSessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : filteredSessions;

  const total = shouldClientFilterVisitorLabel
    ? filteredSessions.length
    : (sessionsData?.pagination?.total ?? 0);
  const totalPages = shouldClientFilterVisitorLabel
    ? Math.max(1, Math.ceil(total / PAGE_SIZE))
    : (sessionsData?.pagination?.pages ?? 1);

  const handleSort = (key: string) => {
    if (sort === key) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(key);
      setOrder("asc");
    }
    setPage(1);
  };

  const getDeviceIcon = (deviceType: string | null) => {
    if (deviceType?.toLowerCase().includes("mobile"))
      return <Smartphone className="w-4 h-4 text-muted-foreground" />;
    return <Monitor className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header / Filters */}
      <div className="p-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by visitor ID or content..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading ? (
          <ConversationsListSkeleton />
        ) : sessions.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={MessageSquare}
              title="No conversations yet"
              description={
                debouncedSearch
                  ? `No conversations match "${debouncedSearch}". Try a different search.`
                  : "Once visitors start chatting with your widget, their conversations will appear here."
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visitor</TableHead>
                <TableHead>Last Message</TableHead>
                <TableHead>Device</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("lastActivityAt")}
                >
                  <div className="flex items-center gap-1">
                    Activity
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow
                  key={session.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelectSession(session.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={generateAvatarUrl(session.visitorId)} />
                        <AvatarFallback>
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {getVisitorName(session.visitorId)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CountryFlag countryCode={session.ipData?.countryCode ?? ""} size="sm" />{" "}
                          {session.country || "Unknown Location"}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[300px] truncate text-sm text-muted-foreground">
                      {session.messages?.[0]?.content || "No messages"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2" title={session.os || ""}>
                      {getDeviceIcon(session.deviceType)}
                      <span className="text-sm capitalize text-muted-foreground">
                        {session.browser || "Unknown"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>
                        {formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {session._count?.messages || 0} messages
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {!loading && sessions.length > 0 ? (
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
