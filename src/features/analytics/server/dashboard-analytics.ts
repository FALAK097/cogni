import "server-only";

import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  format,
  startOfDay,
  subDays,
} from "date-fns";

import type { MessageJson } from "@/features/conversations/server/conversation-service";
import { getWidgetConversationCond } from "@/features/widget/server/widget-data-filters";
import type { Db } from "@/lib/db/client";
import { conversation } from "@/lib/db/schema";
import type {
  BreakdownItem,
  DashboardAnalytics,
  MetricComparison,
  SatisfactionPoint,
  TimeSeriesPoint,
  TopQuestion,
} from "@/features/analytics/types";

type ConversationRow = {
  id: string;
  status: string;
  createdAt: Date;
  visitorSessionId: string | null;
  messages: string;
  visitorSession: {
    referrer: string | null;
    hostname: string | null;
  } | null;
};

function parseMessages(raw: string): MessageJson[] {
  try {
    return JSON.parse(raw || "[]") as MessageJson[];
  } catch {
    return [];
  }
}

function computeChangePercent(value: number, previousValue: number): number | null {
  if (previousValue === 0) {
    return value === 0 ? 0 : null;
  }
  return ((value - previousValue) / previousValue) * 100;
}

function toMetric(value: number, previousValue: number): MetricComparison {
  return {
    value,
    previousValue,
    changePercent: computeChangePercent(value, previousValue),
  };
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0s";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDecimal(value: number, digits = 1): string {
  return value.toFixed(digits);
}

function categorizeSource(referrer: string | null, hostname: string | null): string {
  if (!referrer || referrer.trim() === "") return "Direct";

  const lower = referrer.toLowerCase();

  if (
    lower.includes("facebook.com") ||
    lower.includes("twitter.com") ||
    lower.includes("x.com") ||
    lower.includes("instagram.com") ||
    lower.includes("linkedin.com") ||
    lower.includes("tiktok.com") ||
    lower.includes("youtube.com") ||
    lower.includes("pinterest.com")
  ) {
    return "Social Media";
  }

  if (hostname) {
    try {
      const referrerHost = new URL(referrer).hostname.replace(/^www\./, "");
      const sessionHost = hostname.replace(/^www\./, "");
      if (referrerHost === sessionHost) return "Website";
    } catch {
      // ignore invalid referrer URLs
    }
  }

  if (lower.includes("google.") || lower.includes("bing.") || lower.includes("duckduckgo.")) {
    return "Referral";
  }

  return "Other";
}

function normalizeQuestion(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function computeAvgResponseTimeMs(messages: MessageJson[]): number | null {
  const deltas: number[] = [];

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    if (message.authorType !== "VISITOR") continue;

    const visitorTime = new Date(message.createdAt).getTime();
    if (Number.isNaN(visitorTime)) continue;

    for (let nextIndex = index + 1; nextIndex < messages.length; nextIndex++) {
      const nextMessage = messages[nextIndex];
      if (nextMessage.authorType !== "AI") continue;

      const aiTime = new Date(nextMessage.createdAt).getTime();
      if (Number.isNaN(aiTime) || aiTime < visitorTime) continue;

      deltas.push(aiTime - visitorTime);
      break;
    }
  }

  if (deltas.length === 0) return null;
  return deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
}

function aggregatePeriod(conversations: ConversationRow[]) {
  const uniqueUsers = new Set<string>();
  let closedConversations = 0;
  let messagesSent = 0;
  let messagesReceived = 0;
  let engagedConversations = 0;
  const responseTimes: number[] = [];
  let feedbackPositive = 0;
  let feedbackNegative = 0;
  const sourceCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  const questionCounts = new Map<string, number>();
  const dailyCounts = new Map<string, number>();
  const dailySatisfaction = new Map<string, { positive: number; negative: number }>();

  for (const conversation of conversations) {
    const messages = parseMessages(conversation.messages);
    const visitorMessages = messages.filter((message) => message.authorType === "VISITOR");
    const aiMessages = messages.filter((message) => message.authorType === "AI");

    messagesSent += visitorMessages.length;
    messagesReceived += aiMessages.length;

    if (visitorMessages.length >= 2) engagedConversations++;

    if (conversation.visitorSessionId) {
      uniqueUsers.add(conversation.visitorSessionId);
    }

    if (conversation.status === "CLOSED") closedConversations++;

    const source = categorizeSource(
      conversation.visitorSession?.referrer ?? null,
      conversation.visitorSession?.hostname ?? null,
    );
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);

    const statusLabel =
      conversation.status === "CLOSED"
        ? "Closed"
        : conversation.status === "OPEN" || conversation.status === "ASSIGNED"
          ? "In Progress"
          : "Unresolved";
    statusCounts.set(statusLabel, (statusCounts.get(statusLabel) ?? 0) + 1);

    const dayKey = format(conversation.createdAt, "yyyy-MM-dd");
    dailyCounts.set(dayKey, (dailyCounts.get(dayKey) ?? 0) + 1);

    const firstVisitorMessage = visitorMessages[0];
    if (firstVisitorMessage?.body) {
      const question = normalizeQuestion(firstVisitorMessage.body);
      if (question.length > 0) {
        questionCounts.set(question, (questionCounts.get(question) ?? 0) + 1);
      }
    }

    const responseTime = computeAvgResponseTimeMs(messages);
    if (responseTime !== null) responseTimes.push(responseTime);

    for (const message of messages) {
      if (message.feedback === "positive") feedbackPositive++;
      if (message.feedback === "negative") feedbackNegative++;

      if (message.feedback && message.feedbackAt) {
        const feedbackDay = format(new Date(message.feedbackAt), "yyyy-MM-dd");
        const entry = dailySatisfaction.get(feedbackDay) ?? { positive: 0, negative: 0 };
        if (message.feedback === "positive") entry.positive++;
        if (message.feedback === "negative") entry.negative++;
        dailySatisfaction.set(feedbackDay, entry);
      }
    }
  }

  const totalConversations = conversations.length;
  const uniqueUserCount = uniqueUsers.size;
  const avgResponseTimeMs =
    responseTimes.length > 0
      ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length
      : 0;

  const feedbackTotal = feedbackPositive + feedbackNegative;
  const satisfactionScore = feedbackTotal > 0 ? (feedbackPositive / feedbackTotal) * 5 : 0;

  const engagementRate =
    totalConversations > 0 ? (engagedConversations / totalConversations) * 100 : 0;
  const conversationsPerUser = uniqueUserCount > 0 ? totalConversations / uniqueUserCount : 0;

  const topQuestions: TopQuestion[] = [...questionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([question, count]) => ({ question, count }));

  return {
    totalConversations,
    uniqueUserCount,
    closedConversations,
    avgResponseTimeMs,
    responseTimeSamples: responseTimes.length,
    satisfactionScore,
    feedbackTotal,
    messagesSent,
    messagesReceived,
    engagementRate,
    conversationsPerUser,
    sourceCounts,
    statusCounts,
    dailyCounts,
    dailySatisfaction,
    topQuestions,
  };
}

function toBreakdown(counts: Map<string, number>): BreakdownItem[] {
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
}

function buildTimeSeries(
  start: Date,
  end: Date,
  dailyCounts: Map<string, number>,
): TimeSeriesPoint[] {
  return eachDayOfInterval({ start, end }).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    return {
      date: key,
      count: dailyCounts.get(key) ?? 0,
    };
  });
}

function buildSatisfactionSeries(
  start: Date,
  end: Date,
  dailySatisfaction: Map<string, { positive: number; negative: number }>,
): SatisfactionPoint[] {
  return eachDayOfInterval({ start, end }).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const entry = dailySatisfaction.get(key);
    if (!entry) return { date: key, score: null, responses: 0 };

    const responses = entry.positive + entry.negative;
    return {
      date: key,
      score: responses > 0 ? (entry.positive / responses) * 5 : null,
      responses,
    };
  });
}

async function fetchWidgetConversations(
  db: Db,
  workspaceId: string,
  start: Date,
  end: Date,
): Promise<ConversationRow[]> {
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const rows = await db.query.conversation.findMany({
    where: (fields, { and, gte, lte }) =>
      and(
        getWidgetConversationCond(fields as typeof conversation, workspaceId),
        gte(fields.createdAt, startIso),
        lte(fields.createdAt, endIso),
      ),
    columns: {
      id: true,
      status: true,
      createdAt: true,
      visitorSessionId: true,
      messages: true,
    },
    with: {
      visitorSession: {
        columns: {
          referrer: true,
          hostname: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    createdAt: new Date(row.createdAt),
    visitorSessionId: row.visitorSessionId,
    messages: row.messages,
    visitorSession: row.visitorSession,
  }));
}

export async function getDashboardAnalytics(
  db: Db,
  workspaceId: string,
  startDateInput?: string | null,
  endDateInput?: string | null,
): Promise<DashboardAnalytics> {
  const end = endDateInput ? endOfDay(new Date(endDateInput)) : endOfDay(new Date());
  const start = startDateInput ? startOfDay(new Date(startDateInput)) : startOfDay(subDays(end, 6));

  const rangeDays = Math.max(differenceInCalendarDays(end, start) + 1, 1);
  const previousEnd = endOfDay(subDays(start, 1));
  const previousStart = startOfDay(subDays(previousEnd, rangeDays - 1));

  const [currentConversations, previousConversations] = await Promise.all([
    fetchWidgetConversations(db, workspaceId, start, end),
    fetchWidgetConversations(db, workspaceId, previousStart, previousEnd),
  ]);

  const current = aggregatePeriod(currentConversations);
  const previous = aggregatePeriod(previousConversations);

  return {
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    previousDateRange: {
      start: previousStart.toISOString(),
      end: previousEnd.toISOString(),
    },
    kpis: {
      totalConversations: toMetric(current.totalConversations, previous.totalConversations),
      uniqueUsers: toMetric(current.uniqueUserCount, previous.uniqueUserCount),
      closedConversations: toMetric(current.closedConversations, previous.closedConversations),
      avgResponseTime: {
        ...toMetric(current.avgResponseTimeMs, previous.avgResponseTimeMs),
        formatted:
          current.responseTimeSamples > 0 ? formatDuration(current.avgResponseTimeMs) : "—",
        changePercent:
          current.responseTimeSamples > 0 && previous.responseTimeSamples > 0
            ? toMetric(current.avgResponseTimeMs, previous.avgResponseTimeMs).changePercent
            : null,
      },
      satisfactionScore: {
        ...toMetric(current.satisfactionScore, previous.satisfactionScore),
        formatted: current.feedbackTotal > 0 ? formatDecimal(current.satisfactionScore, 1) : "—",
        changePercent:
          current.feedbackTotal > 0 && previous.feedbackTotal > 0
            ? toMetric(current.satisfactionScore, previous.satisfactionScore).changePercent
            : null,
        max: 5,
      },
    },
    conversationsOverTime: buildTimeSeries(start, end, current.dailyCounts),
    conversationsBySource: toBreakdown(current.sourceCounts),
    conversationsByStatus: toBreakdown(current.statusCounts),
    topQuestions: current.topQuestions,
    userEngagement: {
      messagesSent: toMetric(current.messagesSent, previous.messagesSent),
      messagesReceived: toMetric(current.messagesReceived, previous.messagesReceived),
      engagementRate: {
        ...toMetric(current.engagementRate, previous.engagementRate),
        formatted: formatPercent(current.engagementRate),
      },
      conversationsPerUser: {
        ...toMetric(current.conversationsPerUser, previous.conversationsPerUser),
        formatted: formatDecimal(current.conversationsPerUser, 1),
      },
    },
    satisfactionOverTime: buildSatisfactionSeries(start, end, current.dailySatisfaction),
  };
}
