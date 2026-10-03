import "server-only";

import { eachDayOfInterval, format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { desc } from "drizzle-orm";

import type { MessageJson } from "@/features/conversations/server/conversation-service";
import { aggregateSatisfactionByCohort } from "@/features/analytics/aggregation";
import { collectAiResponseTimeSamplesMs } from "@/features/analytics/response-time";
import { collectNegativeFeedbackItems } from "@/features/analytics/negative-feedback";
import { collectUnansweredQuestions } from "@/features/analytics/unanswered-questions";
import { collectNoSourceMatchQuestions } from "@/features/analytics/no-source-answers";
import {
  aggregateKnowledgeGaps,
  buildKnowledgeGapSummary,
  type KnowledgeGapObservation,
} from "@/features/analytics/knowledge-gaps";
import { resolveAnalyticsDateRange } from "@/features/analytics/date-range";
import { normalizeTimezone } from "@/features/conversations/snooze-schedule";
import { getWidgetConversationCond } from "@/features/widget/server/widget-data-filters";
import type { Db } from "@/lib/db/client";
import { conversation } from "@/lib/db/schema";
import type {
  BreakdownItem,
  DashboardAnalytics,
  MetricComparison,
  NegativeFeedbackItem,
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

function aggregatePeriod(conversations: ConversationRow[], timezone: string) {
  const uniqueUsers = new Set<string>();
  let closedConversations = 0;
  let messagesSent = 0;
  let messagesReceived = 0;
  let engagedConversations = 0;
  let responseTimeTotal = 0;
  let aiResponseSamples = 0;
  const satisfactionResponses: { cohortDate: string; rating: "positive" | "negative" }[] = [];
  const sourceCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  const questionCounts = new Map<string, { count: number; conversationId: string }>();
  const negativeFeedback: NegativeFeedbackItem[] = [];
  const knowledgeGapObservations: KnowledgeGapObservation[] = [];
  const dailyCounts = new Map<string, number>();

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

    const dayKey = formatInTimeZone(conversation.createdAt, timezone, "yyyy-MM-dd");
    dailyCounts.set(dayKey, (dailyCounts.get(dayKey) ?? 0) + 1);

    const firstVisitorMessage = visitorMessages[0];
    if (firstVisitorMessage?.body) {
      const question = normalizeQuestion(firstVisitorMessage.body);
      if (question.length > 0) {
        const current = questionCounts.get(question);
        questionCounts.set(question, {
          count: (current?.count ?? 0) + 1,
          conversationId: current?.conversationId ?? conversation.id,
        });
      }
    }

    const responseTimes = collectAiResponseTimeSamplesMs(messages);
    responseTimeTotal += responseTimes.reduce((sum, responseTime) => sum + responseTime, 0);
    aiResponseSamples += responseTimes.length;

    for (const message of messages) {
      if (message.feedback === "positive" || message.feedback === "negative") {
        satisfactionResponses.push({ cohortDate: dayKey, rating: message.feedback });
      }
    }

    negativeFeedback.push(...collectNegativeFeedbackItems(conversation.id, messages));
    knowledgeGapObservations.push(
      ...collectUnansweredQuestions(conversation.id, conversation.status, messages).map((item) => ({
        ...item,
        signal: "UNANSWERED" as const,
      })),
      ...collectNoSourceMatchQuestions(conversation.id, messages),
    );
  }

  const totalConversations = conversations.length;
  const uniqueUserCount = uniqueUsers.size;
  const avgAiResponseTimeMs = aiResponseSamples > 0 ? responseTimeTotal / aiResponseSamples : 0;
  const satisfaction = aggregateSatisfactionByCohort(satisfactionResponses);

  const feedbackTotal = satisfaction.positive + satisfaction.negative;
  const satisfactionScore = feedbackTotal > 0 ? (satisfaction.positive / feedbackTotal) * 5 : 0;

  const engagementRate =
    totalConversations > 0 ? (engagedConversations / totalConversations) * 100 : 0;
  const conversationsPerUser = uniqueUserCount > 0 ? totalConversations / uniqueUserCount : 0;

  const topQuestions: TopQuestion[] = [...questionCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([question, value]) => ({ question, ...value }));

  return {
    totalConversations,
    uniqueUserCount,
    closedConversations,
    avgAiResponseTimeMs,
    aiResponseSamples,
    satisfactionScore,
    feedbackTotal,
    messagesSent,
    messagesReceived,
    engagementRate,
    conversationsPerUser,
    sourceCounts,
    statusCounts,
    dailyCounts,
    dailySatisfaction: satisfaction.daily,
    topQuestions,
    negativeFeedback: negativeFeedback
      .sort((a, b) => b.feedbackAt.localeCompare(a.feedbackAt))
      .slice(0, 3),
    unansweredQuestions: aggregateKnowledgeGaps(knowledgeGapObservations),
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
  startDate: string,
  endDate: string,
  dailyCounts: Map<string, number>,
): TimeSeriesPoint[] {
  return eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    return {
      date: key,
      count: dailyCounts.get(key) ?? 0,
    };
  });
}

function buildSatisfactionSeries(
  startDate: string,
  endDate: string,
  dailySatisfaction: Map<string, { positive: number; negative: number }>,
): SatisfactionPoint[] {
  return eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).map((day) => {
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
  endBefore: Date,
): Promise<ConversationRow[]> {
  const startIso = start.toISOString();
  const endBeforeIso = endBefore.toISOString();

  const rows = await db.query.conversation.findMany({
    where: (fields, { and, gte, lt }) =>
      and(
        getWidgetConversationCond(fields as typeof conversation, workspaceId),
        gte(fields.createdAt, startIso),
        lt(fields.createdAt, endBeforeIso),
      ),
    columns: {
      id: true,
      status: true,
      createdAt: true,
      visitorSessionId: true,
      messages: true,
    },
    orderBy: [desc(conversation.createdAt), desc(conversation.id)],
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
  timezone?: string | null,
): Promise<DashboardAnalytics> {
  const validTimezone = normalizeTimezone(timezone);
  const range = resolveAnalyticsDateRange(startDateInput, endDateInput, validTimezone);

  const [currentConversations, previousConversations] = await Promise.all([
    fetchWidgetConversations(db, workspaceId, range.startAt, range.endBefore),
    fetchWidgetConversations(db, workspaceId, range.previousStartAt, range.previousEndBefore),
  ]);

  const current = aggregatePeriod(currentConversations, validTimezone);
  const previous = aggregatePeriod(previousConversations, validTimezone);
  const gapReviews = await db.query.knowledgeGapReview.findMany({
    where: (fields, { eq }) => eq(fields.workspaceId, workspaceId),
    columns: { questionHash: true, status: true, updatedAt: true },
  });
  const knowledgeGaps = buildKnowledgeGapSummary(current.unansweredQuestions, gapReviews);

  return {
    dateRange: {
      start: range.startDate,
      end: range.endDate,
    },
    previousDateRange: {
      start: range.previousStartDate,
      end: range.previousEndDate,
    },
    kpis: {
      totalConversations: toMetric(current.totalConversations, previous.totalConversations),
      uniqueUsers: toMetric(current.uniqueUserCount, previous.uniqueUserCount),
      closedConversations: toMetric(current.closedConversations, previous.closedConversations),
      avgAiResponseTime: {
        ...toMetric(current.avgAiResponseTimeMs, previous.avgAiResponseTimeMs),
        samples: current.aiResponseSamples,
        formatted:
          current.aiResponseSamples > 0 ? formatDuration(current.avgAiResponseTimeMs) : "—",
        changePercent:
          current.aiResponseSamples > 0 && previous.aiResponseSamples > 0
            ? toMetric(current.avgAiResponseTimeMs, previous.avgAiResponseTimeMs).changePercent
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
        responses: current.feedbackTotal,
      },
    },
    conversationsOverTime: buildTimeSeries(range.startDate, range.endDate, current.dailyCounts),
    conversationsBySource: toBreakdown(current.sourceCounts),
    conversationsByStatus: toBreakdown(current.statusCounts),
    topQuestions: current.topQuestions,
    negativeFeedback: current.negativeFeedback,
    knowledgeGaps,
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
    satisfactionOverTime: buildSatisfactionSeries(
      range.startDate,
      range.endDate,
      current.dailySatisfaction,
    ),
  };
}
