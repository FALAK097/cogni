"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import type { DashboardAnalytics, MetricComparison, TopQuestion } from "@/features/analytics/types";
import { escapeCsvCell, escapeSpreadsheetHtmlCell } from "@/features/analytics/spreadsheet-export";
import {
  aggregateWeeklyCounts,
  aggregateWeeklySatisfaction,
} from "@/features/analytics/aggregation";
import { InsightsTrendChart } from "@/components/dashboard/insights-trend-chart";
import { EvilPieChart } from "@/components/evilcharts/charts/recharts-pie-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { Button } from "@/components/ui/button";
import {
  AGENT_TEST_HISTORY_VIEWS,
  selectAgentTestRunHistory,
} from "@/features/agent-tests/history";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useAgentTestRunHistory,
  useDashboardAnalytics,
  useReviewKnowledgeGap,
} from "@/hooks/query";
import {
  isAnalyticsDateRangeWithinLimit,
  MAX_ANALYTICS_RANGE_DAYS,
} from "@/features/analytics/date-range";
import {
  resolveInsightsDateQuery,
  serializeInsightsDateRange,
} from "@/features/analytics/insights-url-state";
import { agentHref, APP_PAGES, APP_ROUTES } from "@/features/navigation/app-routes";
import { useAddManualTextSource } from "@/hooks/query/use-knowledge-base";
import {
  buildVerifiedAnswerSource,
  buildVerifiedAnswerTitle,
} from "@/features/knowledge/feedback-answer";
import { normalizeTimezone } from "@/features/conversations/snooze-schedule";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  AlertCircleIcon,
  Calendar03Icon,
  Chart01Icon,
  Clock01Icon,
  Download01Icon,
  InformationCircleIcon,
  Message01Icon,
  Refresh01Icon,
  StarIcon,
  ThumbsDownIcon,
  Tick02Icon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons";

// --- helpers ---

const CHART_COLOR_CLASSES = [
  "bg-primary",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
] as const;

const CHART_COLORS = [
  "var(--primary)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const STATUS_COLOR_CLASSES: Record<string, string> = {
  Closed: "bg-primary",
  "In Progress": "bg-chart-2",
  Unresolved: "bg-chart-4",
};

const STATUS_COLORS: Record<string, string> = {
  Closed: "var(--primary)",
  "In Progress": "var(--chart-2)",
  Unresolved: "var(--chart-4)",
};

const POPOVER_PANEL_CLASS =
  "w-auto rounded-xl border border-border/50 bg-popover p-4 text-popover-foreground shadow-md ring-1 ring-foreground/10";

const METRIC_INFO_BUTTON_CLASS =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:size-9";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

const EXPORT_SECTIONS = [
  { id: "kpis", label: "Key metrics (KPIs)" },
  { id: "conversationsOverTime", label: "Conversations over time" },
  { id: "conversationsBySource", label: "Conversations by source" },
  { id: "conversationsByStatus", label: "Current conversation status" },
  { id: "topQuestions", label: "Top questions" },
  { id: "userEngagement", label: "Conversation activity" },
  { id: "satisfactionOverTime", label: "Satisfaction over time" },
  { id: "agentTestRuns", label: "Saved test runs" },
] as const;

type ExportSectionId = (typeof EXPORT_SECTIONS)[number]["id"];
type ExportFormat = "csv" | "excel";
type DateRangeValue = { start: Date; end: Date };
type Granularity = "daily" | "weekly";
type ExportSection = { title: string; headers: string[]; rows: string[][] };
type DateRangePreset = "last-7-days" | "last-30-days" | "this-month" | "previous-month";

const INSIGHTS_QUERY_PARSERS = {
  from: parseAsString,
  to: parseAsString,
  volume: parseAsStringLiteral(["daily", "weekly"] as const).withDefault("daily"),
  satisfaction: parseAsStringLiteral(["daily", "weekly"] as const).withDefault("daily"),
  tests: parseAsStringLiteral(AGENT_TEST_HISTORY_VIEWS).withDefault("all"),
};

const DATE_RANGE_PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: "last-7-days", label: "Last 7 days" },
  { id: "last-30-days", label: "Last 30 days" },
  { id: "this-month", label: "This month" },
  { id: "previous-month", label: "Previous month" },
];

const DEFAULT_EXPORT_SELECTION = Object.fromEntries(
  EXPORT_SECTIONS.map((section) => [section.id, true]),
) as Record<ExportSectionId, boolean>;

function getPresetDateRange(preset: DateRangePreset, timezone: string): DateRangeValue {
  const today = toZonedTime(new Date(), normalizeTimezone(timezone));
  const end = endOfDay(today);

  switch (preset) {
    case "last-7-days":
      return { start: startOfDay(subDays(today, 6)), end };
    case "last-30-days":
      return { start: startOfDay(subDays(today, 29)), end };
    case "this-month":
      return { start: startOfMonth(today), end };
    case "previous-month": {
      const previousMonth = subMonths(startOfMonth(today), 1);
      return { start: previousMonth, end: endOfDay(endOfMonth(previousMonth)) };
    }
  }
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatBreakdownPercentage(value: number): string {
  if (value > 0 && value < 0.1) return "<0.1%";
  if (value > 0 && value < 1) return `${value.toFixed(1)}%`;
  return `${Math.round(value)}%`;
}

function formatChangePercent(changePercent: number | null): string {
  if (changePercent === null) return "—";
  const sign = changePercent > 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(1)}%`;
}

function ChangeIndicator({
  change,
  invertTrend = false,
}: {
  change: number | null;
  invertTrend?: boolean;
}) {
  const hasTrend = change !== null && change !== 0;
  const isFavorable = change !== null && (invertTrend ? change < 0 : change > 0);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap font-medium",
        !hasTrend
          ? "text-muted-foreground"
          : isFavorable
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400",
      )}
    >
      {hasTrend && (
        <HugeiconsIcon
          icon={change > 0 ? ArrowUp01Icon : ArrowDown01Icon}
          strokeWidth={2}
          className="size-3"
          aria-hidden="true"
        />
      )}
      {change === 0 ? "No change" : formatChangePercent(change)}
    </span>
  );
}

function formatComparisonRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) return `${format(start, "MMM d")} - ${format(end, "d, yyyy")}`;
  if (sameYear) return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
  return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
}

function formatChartDate(date: string): string {
  return format(parseISO(date), "MMM d");
}

function formatRangeLabel(range: DateRangeValue): string {
  return formatComparisonRange(format(range.start, "yyyy-MM-dd"), format(range.end, "yyyy-MM-dd"));
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildExportSections(
  analytics: DashboardAnalytics,
  selected: Set<ExportSectionId>,
  agentTestRuns: NonNullable<ReturnType<typeof useAgentTestRunHistory>["data"]>["runs"],
): ExportSection[] {
  const sections: ExportSection[] = [];
  const pct = (value: number | null) =>
    value === null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

  if (selected.has("kpis")) {
    sections.push({
      title: "Key Metrics",
      headers: ["Metric", "Value", "Previous", "Change %"],
      rows: [
        [
          "Total Conversations",
          String(analytics.kpis.totalConversations.value),
          String(analytics.kpis.totalConversations.previousValue),
          pct(analytics.kpis.totalConversations.changePercent),
        ],
        [
          "Visitor Sessions",
          String(analytics.kpis.uniqueUsers.value),
          String(analytics.kpis.uniqueUsers.previousValue),
          pct(analytics.kpis.uniqueUsers.changePercent),
        ],
        [
          "Closed now",
          String(analytics.kpis.closedConversations.value),
          String(analytics.kpis.closedConversations.previousValue),
          pct(analytics.kpis.closedConversations.changePercent),
        ],
        [
          "Avg. AI Response Time",
          analytics.kpis.avgAiResponseTime.formatted,
          String(analytics.kpis.avgAiResponseTime.previousValue),
          pct(analytics.kpis.avgAiResponseTime.changePercent),
        ],
        ["AI Response Time Samples", String(analytics.kpis.avgAiResponseTime.samples), "—", "—"],
        [
          "Satisfaction Score",
          analytics.kpis.satisfactionScore.formatted,
          String(analytics.kpis.satisfactionScore.previousValue),
          pct(analytics.kpis.satisfactionScore.changePercent),
        ],
        ["Satisfaction Responses", String(analytics.kpis.satisfactionScore.responses), "—", "—"],
      ],
    });
  }

  if (selected.has("conversationsOverTime")) {
    sections.push({
      title: "Conversations Over Time",
      headers: ["Date", "Conversations"],
      rows: analytics.conversationsOverTime.map((point) => [point.date, String(point.count)]),
    });
  }

  if (selected.has("conversationsBySource")) {
    sections.push({
      title: "Conversations by Source",
      headers: ["Source", "Count", "Percentage"],
      rows: analytics.conversationsBySource.map((item) => [
        item.label,
        String(item.count),
        `${item.percentage.toFixed(1)}%`,
      ]),
    });
  }

  if (selected.has("conversationsByStatus")) {
    sections.push({
      title: "Current Status of Conversations Started in Selected Period",
      headers: ["Status", "Count", "Percentage"],
      rows: analytics.conversationsByStatus.map((item) => [
        item.label,
        String(item.count),
        `${item.percentage.toFixed(1)}%`,
      ]),
    });
  }

  if (selected.has("topQuestions")) {
    sections.push({
      title: "Top Questions",
      headers: ["Question", "Conversations"],
      rows: analytics.topQuestions.map((item) => [item.question, String(item.count)]),
    });
  }

  if (selected.has("userEngagement")) {
    const e = analytics.userEngagement;
    sections.push({
      title: "Conversation Activity",
      headers: ["Metric", "Value", "Previous", "Change %"],
      rows: [
        [
          "Visitor Messages",
          String(e.messagesSent.value),
          String(e.messagesSent.previousValue),
          pct(e.messagesSent.changePercent),
        ],
        [
          "AI Replies",
          String(e.messagesReceived.value),
          String(e.messagesReceived.previousValue),
          pct(e.messagesReceived.changePercent),
        ],
        [
          "Repeat Visitor Rate",
          e.engagementRate.formatted,
          String(e.engagementRate.previousValue),
          pct(e.engagementRate.changePercent),
        ],
        [
          "Conversations / Session",
          e.conversationsPerUser.formatted,
          String(e.conversationsPerUser.previousValue),
          pct(e.conversationsPerUser.changePercent),
        ],
      ],
    });
  }

  if (selected.has("satisfactionOverTime")) {
    sections.push({
      title: "Satisfaction by Conversation Start",
      headers: ["Conversation Start Date", "Score", "Responses"],
      rows: analytics.satisfactionOverTime.map((point) => [
        point.date,
        point.score === null ? "—" : point.score.toFixed(1),
        String(point.responses),
      ]),
    });
  }

  if (selected.has("agentTestRuns")) {
    sections.push({
      title: "Saved Agent Test Runs",
      headers: ["Run time", "Suite version", "Pass rate", "Completed checks", "Errors", "Not run"],
      rows: agentTestRuns.map((run) => {
        const evaluated = run.passedCount + run.mismatchCount;
        return [
          run.createdAt,
          run.suiteDigest ?? "Unversioned",
          evaluated > 0 ? `${((run.passedCount / evaluated) * 100).toFixed(0)}%` : "—",
          String(evaluated),
          String(run.errorCount),
          String(run.notRunCount),
        ];
      }),
    });
  }

  return sections;
}

function sectionsToCsv(sections: ExportSection[]): string {
  const lines: string[] = [];
  for (const section of sections) {
    lines.push(section.title);
    lines.push(section.headers.map(escapeCsvCell).join(","));
    for (const row of section.rows) {
      lines.push(row.map(escapeCsvCell).join(","));
    }
    lines.push("");
  }
  return `\uFEFF${lines.join("\n")}`;
}

function sectionsToExcelHtml(sections: ExportSection[]): string {
  let html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>';
  for (const section of sections) {
    html += `<h2>${escapeSpreadsheetHtmlCell(section.title)}</h2><table border="1"><thead><tr>`;
    html += section.headers
      .map((header) => `<th>${escapeSpreadsheetHtmlCell(header)}</th>`)
      .join("");
    html += "</tr></thead><tbody>";
    for (const row of section.rows) {
      html += `<tr>${row.map((cell) => `<td>${escapeSpreadsheetHtmlCell(cell)}</td>`).join("")}</tr>`;
    }
    html += "</tbody></table><br/>";
  }
  html += "</body></html>";
  return html;
}

function runDashboardExport(
  analytics: DashboardAnalytics,
  agentTestRuns: NonNullable<ReturnType<typeof useAgentTestRunHistory>["data"]>["runs"],
  dateRange: DateRangeValue,
  formatType: ExportFormat,
  selected: Record<ExportSectionId, boolean>,
) {
  const ids = EXPORT_SECTIONS.map((section) => section.id).filter((id) => selected[id]);
  if (ids.length === 0) return false;

  const sections = buildExportSections(analytics, new Set(ids), agentTestRuns);
  const baseName = `insights-${format(dateRange.start, "yyyy-MM-dd")}-${format(dateRange.end, "yyyy-MM-dd")}`;

  if (formatType === "csv") {
    downloadFile(sectionsToCsv(sections), `${baseName}.csv`, "text/csv;charset=utf-8");
  } else {
    downloadFile(sectionsToExcelHtml(sections), `${baseName}.xls`, "application/vnd.ms-excel");
  }

  return true;
}

// --- primitives ---

function DashboardCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border/50 bg-transparent text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton
      className={cn("rounded-xl border border-border/50 bg-transparent", className ?? "h-[156px]")}
    />
  );
}

function DonutChart({
  data,
  centerValue,
  emptyMessage,
  ariaLabel,
}: {
  data: Array<{ label: string; value: number; color: string }>;
  centerValue?: string;
  emptyMessage: string;
  ariaLabel: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const chartData = data.map((item, index) => ({ ...item, key: `segment-${index}` }));
  const config = Object.fromEntries(
    chartData.map((item) => [
      item.key,
      { label: item.label, colors: { light: [item.color], dark: [item.color] } },
    ]),
  ) satisfies ChartConfig;

  if (total === 0) {
    return (
      <div className="flex size-[180px] items-center justify-center px-5 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <figure className="relative size-[180px] shrink-0" aria-label={ariaLabel}>
      <EvilPieChart
        data={chartData}
        dataKey="value"
        nameKey="key"
        config={config}
        className="size-full flex-none"
        chartProps={{ margin: { top: 0, right: 0, bottom: 0, left: 0 } }}
      >
        <EvilPieChart.Tooltip roundness="md" />
        <EvilPieChart.Pie
          innerRadius={57}
          outerRadius={82}
          paddingAngle={2}
          cornerRadius={2}
          pieProps={{ isAnimationActive: false }}
        />
      </EvilPieChart>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-lg font-semibold tracking-tight">
          {centerValue ?? total.toLocaleString()}
        </span>
      </div>
    </figure>
  );
}

function DonutLegend({
  items,
  ariaLabel,
  className,
}: {
  items: Array<{ label: string; value: number; percentage: number; colorClass: string }>;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <table className={cn("w-full text-left text-sm", className)}>
      <caption className="sr-only">{ariaLabel}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Category</th>
          <th scope="col">Conversations</th>
          <th scope="col">Share</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.label}>
            <td aria-label={item.label} className="py-1.5 pr-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("size-2.5 shrink-0 rounded-full", item.colorClass)} />
                <span className="truncate text-muted-foreground">{item.label}</span>
              </span>
            </td>
            <td className="py-1.5 text-right font-medium tabular-nums">
              {item.value.toLocaleString()}
            </td>
            <td className="w-14 py-1.5 pl-2 text-right text-muted-foreground tabular-nums">
              {formatBreakdownPercentage(item.percentage)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function getMonthDays(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });
}

function CalendarMonth({
  month,
  referenceTime,
  timezone,
  rangeStart,
  rangeEnd,
  rangeAnchor,
  onDayClick,
}: {
  month: Date;
  referenceTime: Date;
  timezone: string;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  rangeAnchor: Date | null;
  onDayClick: (day: Date) => void;
}) {
  const days = getMonthDays(month);
  const today = toZonedTime(referenceTime, normalizeTimezone(timezone));

  return (
    <div className="w-[280px] sm:w-[252px]">
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="flex h-11 items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </span>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const isStart = rangeStart ? isSameDay(day, rangeStart) : false;
          const isEnd = rangeEnd ? isSameDay(day, rangeEnd) : false;
          const inRange =
            rangeStart && rangeEnd
              ? isWithinInterval(day, {
                  start: isBefore(rangeStart, rangeEnd) ? rangeStart : rangeEnd,
                  end: isAfter(rangeEnd, rangeStart) ? rangeEnd : rangeStart,
                })
              : false;
          const isToday = isSameDay(day, today);
          const exceedsRangeLimit =
            rangeAnchor !== null && !isAnalyticsDateRangeWithinLimit(rangeAnchor, day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={!inMonth || isAfter(day, today) || exceedsRangeLimit}
              aria-label={format(day, "EEEE, MMMM d, yyyy")}
              aria-pressed={isStart || isEnd || Boolean(inRange)}
              aria-current={isToday ? "date" : undefined}
              onClick={() => onDayClick(day)}
              className={cn(
                "flex h-11 w-full items-center justify-center rounded-md text-sm transition-colors",
                !inMonth && "invisible",
                inMonth && !isStart && !isEnd && !inRange && "text-foreground hover:bg-muted",
                inRange && !isStart && !isEnd && "bg-primary/10 text-foreground",
                (isStart || isEnd) && "bg-primary font-medium text-primary-foreground",
                isToday && !isStart && !isEnd && !inRange && "ring-1 ring-primary/40",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DateRangePicker({
  value,
  onChange,
  timezone,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  timezone: string;
}) {
  const [open, setOpen] = useState(false);
  const [referenceTime, setReferenceTime] = useState(() => new Date());
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value.start));
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  const label = useMemo(() => formatRangeLabel(value), [value]);
  const displayStart = draftStart;
  const displayEnd = draftEnd;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setReferenceTime(new Date());
      setViewMonth(startOfMonth(value.start));
      setDraftStart(value.start);
      setDraftEnd(value.end);
      return;
    }
    setDraftStart(null);
    setDraftEnd(null);
  };

  const handleDayClick = (day: Date) => {
    const clicked = startOfDay(day);

    if (draftStart && !draftEnd) {
      const rangeStart = isBefore(clicked, draftStart) ? clicked : draftStart;
      const rangeEnd = isBefore(clicked, draftStart) ? draftStart : clicked;
      onChange({ start: startOfDay(rangeStart), end: endOfDay(rangeEnd) });
      setOpen(false);
      setDraftStart(null);
      setDraftEnd(null);
      return;
    }

    setDraftStart(clicked);
    setDraftEnd(null);
  };

  const handlePresetClick = (preset: DateRangePreset) => {
    onChange(getPresetDateRange(preset, timezone));
    setOpen(false);
    setDraftStart(null);
    setDraftEnd(null);
  };

  const isPresetSelected = (preset: DateRangePreset) => {
    const range = getPresetDateRange(preset, timezone);
    return isSameDay(value.start, range.start) && isSameDay(value.end, range.end);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-11 gap-2 rounded-lg border-border/50 bg-transparent px-3 font-normal shadow-none sm:h-9"
            aria-label={`Date range: ${label}`}
          />
        }
      >
        <HugeiconsIcon
          icon={Calendar03Icon}
          strokeWidth={2}
          className="size-4 text-muted-foreground"
        />
        <span>{label}</span>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" sideOffset={6} className={POPOVER_PANEL_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="grid grid-cols-2 gap-1 sm:w-28 sm:shrink-0 sm:grid-cols-1 sm:content-start sm:border-r sm:border-border/50 sm:pr-3">
            {DATE_RANGE_PRESETS.map(({ id, label: presetLabel }) => (
              <Button
                key={id}
                type="button"
                variant={isPresetSelected(id) ? "secondary" : "ghost"}
                size="sm"
                className="h-11 justify-start px-2 text-left font-normal sm:h-8"
                aria-pressed={isPresetSelected(id)}
                onClick={() => handlePresetClick(id)}
              >
                {presetLabel}
              </Button>
            ))}
          </div>
          <div className="w-[280px] sm:w-[252px]">
            <div className="flex items-center justify-between gap-3 pb-3">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-11 sm:size-8"
                onClick={() => setViewMonth((month) => subMonths(month, 1))}
                aria-label="Previous month"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
              </Button>
              <p className="text-sm font-medium">{format(viewMonth, "MMMM yyyy")}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-11 sm:size-8"
                onClick={() => setViewMonth((month) => addMonths(month, 1))}
                aria-label="Next month"
                disabled={!isBefore(startOfMonth(viewMonth), startOfMonth(referenceTime))}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
              </Button>
            </div>
            <CalendarMonth
              month={viewMonth}
              referenceTime={referenceTime}
              timezone={timezone}
              rangeStart={displayStart}
              rangeEnd={displayEnd}
              rangeAnchor={draftStart && !draftEnd ? draftStart : null}
              onDayClick={handleDayClick}
            />
            <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">
              {draftStart && !draftEnd
                ? `Choose an end date within ${MAX_ANALYTICS_RANGE_DAYS} days of the start.`
                : `Custom ranges can include up to ${MAX_ANALYTICS_RANGE_DAYS} days.`}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ExportMenu({
  analytics,
  agentTestRuns,
  dateRange,
  disabled,
}: {
  analytics: DashboardAnalytics;
  agentTestRuns: NonNullable<ReturnType<typeof useAgentTestRunHistory>["data"]>["runs"];
  dateRange: DateRangeValue;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [formatType, setFormatType] = useState<ExportFormat>("csv");
  const [selected, setSelected] =
    useState<Record<ExportSectionId, boolean>>(DEFAULT_EXPORT_SELECTION);

  const selectedCount = EXPORT_SECTIONS.filter((section) => selected[section.id]).length;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setFormatType("csv");
      setSelected(DEFAULT_EXPORT_SELECTION);
    }
  };

  const handleExport = () => {
    const ok = runDashboardExport(analytics, agentTestRuns, dateRange, formatType, selected);
    if (ok) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 rounded-lg border-border/50 bg-transparent px-3 shadow-none"
            disabled={disabled}
            aria-label="Export Insights data"
          />
        }
      >
        <HugeiconsIcon icon={Download01Icon} strokeWidth={2} className="size-4" />
        Export
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        className={cn(POPOVER_PANEL_CLASS, "w-72")}
      >
        <p className="mb-3 text-sm font-medium">Export data</p>

        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">File format</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formatType === "csv" ? "default" : "outline"}
                size="sm"
                className="h-8 flex-1 shadow-none"
                onClick={() => setFormatType("csv")}
              >
                CSV
              </Button>
              <Button
                type="button"
                variant={formatType === "excel" ? "default" : "outline"}
                size="sm"
                className="h-8 flex-1 shadow-none"
                onClick={() => setFormatType("excel")}
              >
                Excel
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Include</p>
            <div className="max-h-44 space-y-2 overflow-y-auto">
              {EXPORT_SECTIONS.map((section) => (
                <Label
                  key={section.id}
                  className="flex cursor-pointer items-center gap-2.5 text-sm font-normal"
                >
                  <Checkbox
                    checked={selected[section.id]}
                    onCheckedChange={(checked) =>
                      setSelected((prev) => ({ ...prev, [section.id]: checked === true }))
                    }
                  />
                  {section.label}
                </Label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border/50 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={handleExport}
              disabled={selectedCount === 0}
            >
              Download
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MetricCard({
  label,
  value,
  metric,
  previousRange,
  icon,
  info,
  invertTrend = false,
}: {
  label: string;
  value: string;
  metric: MetricComparison;
  previousRange: { start: string; end: string };
  icon: ReactNode;
  info?: ReactNode;
  invertTrend?: boolean;
}) {
  return (
    <DashboardCard className="flex h-full flex-col p-4 sm:p-5 xl:p-6">
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        {info}
      </div>
      <div className="mt-3 space-y-0.5 sm:mt-4">
        <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
        <p className="text-2xl font-semibold leading-tight tracking-tight tabular-nums sm:text-[1.75rem]">
          {value}
        </p>
      </div>
      <div className="mt-auto flex flex-col items-start gap-0.5 pt-2 text-xs sm:pt-3">
        <ChangeIndicator change={metric.changePercent} invertTrend={invertTrend} />
        <span className="text-muted-foreground">
          vs {formatComparisonRange(previousRange.start, previousRange.end)}
        </span>
      </div>
    </DashboardCard>
  );
}

function GranularitySelect({
  value,
  onChange,
}: {
  value: Granularity;
  onChange: (value: Granularity) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Granularity)}>
      <SelectTrigger
        size="sm"
        className="h-8 w-[88px] rounded-lg border-border/50 bg-transparent text-xs shadow-none"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="daily">Daily</SelectItem>
        <SelectItem value="weekly">Weekly</SelectItem>
      </SelectContent>
    </Select>
  );
}

// --- page ---

export function DashboardPage({
  canManage = false,
  workspaceTimezone,
}: {
  canManage?: boolean;
  workspaceTimezone: string;
}) {
  const [insightsQuery, setInsightsQuery] = useQueryStates(INSIGHTS_QUERY_PARSERS, {
    clearOnDefault: true,
    history: "push",
    scroll: false,
    shallow: true,
  });
  const resolvedDateRange = useMemo(
    () => resolveInsightsDateQuery(insightsQuery.from, insightsQuery.to, workspaceTimezone),
    [insightsQuery.from, insightsQuery.to, workspaceTimezone],
  );
  const dateRange = resolvedDateRange.value;
  const dateRangeNotice = resolvedDateRange.invalidQuery
    ? resolvedDateRange.invalidQueryReason === "range_too_long"
      ? `This link requested more than ${MAX_ANALYTICS_RANGE_DAYS} days. Showing the last 7 days.`
      : "This link has an invalid date range. Showing the last 7 days."
    : null;
  const convGranularity = insightsQuery.volume;
  const satGranularity = insightsQuery.satisfaction;

  const updateDateRange = (range: DateRangeValue) => {
    void setInsightsQuery(serializeInsightsDateRange(range, workspaceTimezone));
  };
  const [feedbackToImprove, setFeedbackToImprove] = useState<ReviewKnowledgeItem | null>(null);
  const [reviewFilter, setReviewFilter] = useState<"negative" | "unanswered">("negative");
  const [gapFilter, setGapFilter] = useState<"OPEN" | "RESOLVED" | "IGNORED">("OPEN");

  const queryParams = useMemo(
    () => ({
      startDate: format(dateRange.start, "yyyy-MM-dd"),
      endDate: format(dateRange.end, "yyyy-MM-dd"),
    }),
    [dateRange],
  );

  const analyticsQuery = useDashboardAnalytics(queryParams);
  const agentTestRunsQuery = useAgentTestRunHistory(queryParams.startDate, queryParams.endDate);
  const reviewKnowledgeGap = useReviewKnowledgeGap();
  const { toast } = useToast();
  const analytics = analyticsQuery.data;
  const isLoading = analyticsQuery.isLoading;
  const insightsStatusMessage = analyticsQuery.isFetching
    ? analytics
      ? "Updating Insights…"
      : "Loading Insights…"
    : analytics && !analyticsQuery.isError
      ? "Insights updated."
      : "";
  const conversationCount = analytics?.kpis.totalConversations.value ?? 0;
  const isEmptyPeriod = !isLoading && analytics !== undefined && conversationCount === 0;
  const hasLowConversationVolume =
    !isLoading && analytics !== undefined && conversationCount > 0 && conversationCount < 5;
  const gapItems = analytics
    ? {
        OPEN: analytics.knowledgeGaps.open,
        RESOLVED: analytics.knowledgeGaps.resolved,
        IGNORED: analytics.knowledgeGaps.ignored,
      }[gapFilter]
    : [];

  async function setKnowledgeGapStatus(question: string, status: "OPEN" | "RESOLVED" | "IGNORED") {
    try {
      await reviewKnowledgeGap.mutateAsync({ question, status });
      toast.success(
        status === "OPEN"
          ? "Question moved back to open"
          : status === "RESOLVED"
            ? "Question marked resolved"
            : "Question ignored",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this question.");
    }
  }
  const hasInitialError = analyticsQuery.isError && !analytics;

  const convChartData = useMemo(() => {
    const series =
      convGranularity === "weekly"
        ? aggregateWeeklyCounts(analytics?.conversationsOverTime ?? [])
        : (analytics?.conversationsOverTime ?? []);
    return series.map((point) => ({ label: point.date, value: point.count }));
  }, [analytics?.conversationsOverTime, convGranularity]);

  const satChartData = useMemo(() => {
    const series =
      satGranularity === "weekly"
        ? aggregateWeeklySatisfaction(analytics?.satisfactionOverTime ?? [])
        : (analytics?.satisfactionOverTime ?? []);
    return series.map((point) => ({
      label: point.date,
      value: point.score,
      responses: point.responses,
    }));
  }, [analytics?.satisfactionOverTime, satGranularity]);
  const testHistory = useMemo(
    () => selectAgentTestRunHistory(agentTestRunsQuery.data?.runs ?? [], insightsQuery.tests),
    [agentTestRunsQuery.data?.runs, insightsQuery.tests],
  );
  const agentTestRuns = testHistory.runs;
  const agentTestRunChartData = useMemo(
    () =>
      (agentTestRuns ?? []).map((run) => {
        const evaluatedCount = run.passedCount + run.mismatchCount;
        return {
          label: run.createdAt,
          value: evaluatedCount > 0 ? Math.round((run.passedCount / evaluatedCount) * 100) : null,
          responses: evaluatedCount,
          details: {
            passed: run.passedCount,
            mismatches: run.mismatchCount,
            errors: run.errorCount,
            notRun: run.notRunCount,
          },
        };
      }),
    [agentTestRuns],
  );
  const latestAgentTestRun = agentTestRuns?.at(-1);
  const latestEvaluatedCount = latestAgentTestRun
    ? latestAgentTestRun.passedCount + latestAgentTestRun.mismatchCount
    : 0;
  const hasSatisfactionResponses = (analytics?.satisfactionOverTime ?? []).some(
    (point) => point.responses > 0,
  );

  const sourceChart = useMemo(() => {
    const data = analytics?.conversationsBySource ?? [];
    return {
      segments: data.map((item, i) => ({
        label: item.label,
        value: item.count,
        color: CHART_COLORS[i % CHART_COLORS.length]!,
      })),
      legend: data.map((item, i) => ({
        label: item.label,
        value: item.count,
        percentage: item.percentage,
        colorClass: CHART_COLOR_CLASSES[i % CHART_COLOR_CLASSES.length],
      })),
      total: data.reduce((sum, item) => sum + item.count, 0),
    };
  }, [analytics?.conversationsBySource]);

  const statusChart = useMemo(() => {
    const data = analytics?.conversationsByStatus ?? [];
    return {
      segments: data.map((item, i) => ({
        label: item.label,
        value: item.count,
        color: STATUS_COLORS[item.label] ?? CHART_COLORS[i % CHART_COLORS.length],
      })),
      legend: data.map((item, i) => ({
        label: item.label,
        value: item.count,
        percentage: item.percentage,
        colorClass:
          STATUS_COLOR_CLASSES[item.label] ?? CHART_COLOR_CLASSES[i % CHART_COLOR_CLASSES.length],
      })),
      total: data.reduce((sum, item) => sum + item.count, 0),
    };
  }, [analytics?.conversationsByStatus]);

  const engagement = analytics?.userEngagement;
  const engagementTiles = engagement
    ? [
        {
          label: "Visitor messages",
          value: formatNumber(engagement.messagesSent.value),
          change: engagement.messagesSent.changePercent,
          icon: Message01Icon,
        },
        {
          label: "AI replies",
          value: formatNumber(engagement.messagesReceived.value),
          change: engagement.messagesReceived.changePercent,
          icon: Message01Icon,
        },
        {
          label: "Repeat visitor rate",
          value: engagement.engagementRate.formatted,
          change: engagement.engagementRate.changePercent,
          icon: Chart01Icon,
        },
        {
          label: "Conversations / Session",
          value: engagement.conversationsPerUser.formatted,
          change: engagement.conversationsPerUser.changePercent,
          icon: UserMultiple02Icon,
        },
      ]
    : [];

  return (
    <>
      <output aria-live="polite" aria-atomic="true" className="sr-only">
        {insightsStatusMessage}
      </output>
      <div
        aria-busy={analyticsQuery.isFetching}
        className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-8"
      >
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{APP_PAGES.insights.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{APP_PAGES.insights.description}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <DateRangePicker
              value={dateRange}
              onChange={updateDateRange}
              timezone={workspaceTimezone}
            />
            {analytics ? (
              <ExportMenu
                analytics={analytics}
                agentTestRuns={agentTestRuns ?? []}
                dateRange={dateRange}
                disabled={
                  analyticsQuery.isFetching ||
                  agentTestRunsQuery.isFetching ||
                  (agentTestRunsQuery.isError && !agentTestRunsQuery.data)
                }
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 rounded-lg border-border/50 bg-transparent px-3 shadow-none"
                disabled
              >
                <HugeiconsIcon icon={Download01Icon} strokeWidth={2} className="size-4" />
                Export
              </Button>
            )}
          </div>
        </header>

        {dateRangeNotice ? (
          <output
            aria-live="polite"
            className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
          >
            {dateRangeNotice}
          </output>
        ) : null}

        {hasInitialError ? (
          <div
            role="alert"
            className="flex flex-col gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                strokeWidth={2}
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-sm font-semibold">Unable to load Insights</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The selected date range is unchanged.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0 gap-2"
              onClick={() => void analyticsQuery.refetch()}
              disabled={analyticsQuery.isFetching}
              aria-busy={analyticsQuery.isFetching}
            >
              <HugeiconsIcon
                icon={Refresh01Icon}
                strokeWidth={2}
                className={cn("size-4", analyticsQuery.isFetching && "motion-safe:animate-spin")}
                aria-hidden="true"
              />
              {analyticsQuery.isFetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        ) : null}

        {analyticsQuery.isError && analytics ? (
          <output
            aria-live="polite"
            className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm text-muted-foreground">
              Insights could not refresh. Showing the last loaded results.
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0 gap-2"
              onClick={() => void analyticsQuery.refetch()}
              disabled={analyticsQuery.isFetching}
              aria-busy={analyticsQuery.isFetching}
            >
              <HugeiconsIcon
                icon={Refresh01Icon}
                strokeWidth={2}
                className={cn("size-4", analyticsQuery.isFetching && "motion-safe:animate-spin")}
                aria-hidden="true"
              />
              {analyticsQuery.isFetching ? "Retrying…" : "Try again"}
            </Button>
          </output>
        ) : null}

        {isEmptyPeriod && analytics ? (
          <section className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HugeiconsIcon icon={Message01Icon} strokeWidth={2} className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold tracking-tight">
                  No conversations in the selected period
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {analytics.kpis.totalConversations.previousValue > 0
                    ? `The previous comparable period had ${formatNumber(analytics.kpis.totalConversations.previousValue)} ${analytics.kpis.totalConversations.previousValue === 1 ? "conversation" : "conversations"}.`
                    : "Try a wider date range, or add a knowledge source so your agent is ready for its first conversation."}
                </p>
              </div>
            </div>
            {analytics.kpis.totalConversations.previousValue > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
                onClick={() =>
                  updateDateRange({
                    start: startOfDay(parseISO(analytics.previousDateRange.start)),
                    end: endOfDay(parseISO(analytics.previousDateRange.end)),
                  })
                }
              >
                View previous period
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
                render={<Link href={agentHref("knowledge")} />}
              >
                Add a knowledge source
              </Button>
            )}
          </section>
        ) : null}

        {hasLowConversationVolume ? (
          <p className="-mt-3 text-xs leading-relaxed text-muted-foreground">
            Early signal: based on {formatNumber(conversationCount)}{" "}
            {conversationCount === 1 ? "conversation" : "conversations"} in this period. Small
            samples can make rates and comparisons change sharply.
          </p>
        ) : null}

        <section
          hidden={hasInitialError}
          className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5"
        >
          {isLoading || !analytics ? (
            Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            <>
              <MetricCard
                label="Total Conversations"
                value={analytics.kpis.totalConversations.value.toLocaleString()}
                metric={analytics.kpis.totalConversations}
                previousRange={analytics.previousDateRange}
                icon={
                  <HugeiconsIcon icon={Message01Icon} strokeWidth={2} className="size-[18px]" />
                }
              />
              <MetricCard
                label="Visitor sessions"
                value={analytics.kpis.uniqueUsers.value.toLocaleString()}
                metric={analytics.kpis.uniqueUsers}
                previousRange={analytics.previousDateRange}
                icon={
                  <HugeiconsIcon
                    icon={UserMultiple02Icon}
                    strokeWidth={2}
                    className="size-[18px]"
                  />
                }
              />
              <MetricCard
                label="Closed now"
                value={analytics.kpis.closedConversations.value.toLocaleString()}
                metric={analytics.kpis.closedConversations}
                previousRange={analytics.previousDateRange}
                icon={<HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-[18px]" />}
                info={
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className={METRIC_INFO_BUTTON_CLASS}
                          aria-label="Closed now conversation count information"
                        />
                      }
                    >
                      <HugeiconsIcon
                        icon={InformationCircleIcon}
                        strokeWidth={2}
                        className="size-4"
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      These conversations started in the selected period and are closed now. This is
                      their current status, not a count of conversations closed during that period.
                    </TooltipContent>
                  </Tooltip>
                }
              />
              <MetricCard
                label="Avg. AI Response Time"
                value={
                  analytics.kpis.avgAiResponseTime.formatted === "—"
                    ? "No data"
                    : analytics.kpis.avgAiResponseTime.formatted
                }
                metric={analytics.kpis.avgAiResponseTime}
                previousRange={analytics.previousDateRange}
                icon={<HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-[18px]" />}
                info={
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className={METRIC_INFO_BUTTON_CLASS}
                          aria-label="Average AI response time information"
                        />
                      }
                    >
                      <HugeiconsIcon
                        icon={InformationCircleIcon}
                        strokeWidth={2}
                        className="size-4"
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      Average time from the first visitor message in a turn to the next public AI
                      reply. Human-only replies and unanswered turns are excluded. Based on{" "}
                      {analytics.kpis.avgAiResponseTime.samples} answered AI{" "}
                      {analytics.kpis.avgAiResponseTime.samples === 1 ? " turn." : " turns."}
                    </TooltipContent>
                  </Tooltip>
                }
                invertTrend
              />
              <MetricCard
                label="Satisfaction Score"
                value={
                  analytics.kpis.satisfactionScore.formatted === "—"
                    ? "No data"
                    : `${analytics.kpis.satisfactionScore.formatted} / ${analytics.kpis.satisfactionScore.max}`
                }
                metric={analytics.kpis.satisfactionScore}
                previousRange={analytics.previousDateRange}
                icon={<HugeiconsIcon icon={StarIcon} strokeWidth={2} className="size-[18px]" />}
                info={
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className={METRIC_INFO_BUTTON_CLASS}
                          aria-label="Satisfaction score information"
                        />
                      }
                    >
                      <HugeiconsIcon
                        icon={InformationCircleIcon}
                        strokeWidth={2}
                        className="size-4"
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      Average of thumbs feedback on AI responses in conversations started during the
                      selected period: thumbs-up counts as 5 and thumbs-down as 0. Each rating is
                      counted on its conversation&apos;s start date, even if the visitor rated it
                      later. Based on {analytics.kpis.satisfactionScore.responses}{" "}
                      {analytics.kpis.satisfactionScore.responses === 1
                        ? "response."
                        : "responses."}
                    </TooltipContent>
                  </Tooltip>
                }
              />
            </>
          )}
        </section>

        <section
          hidden={hasInitialError || (!isLoading && analytics?.kpis.totalConversations.value === 0)}
          className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <DashboardCard className="flex min-h-[320px] flex-1 flex-col p-6 md:col-span-2 xl:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold tracking-tight">Conversations Over Time</h3>
              <GranularitySelect
                value={convGranularity}
                onChange={(value) => void setInsightsQuery({ volume: value })}
              />
            </div>
            {isLoading ? (
              <Skeleton className="h-60 w-full rounded-lg border border-border/50 bg-transparent" />
            ) : (
              <InsightsTrendChart
                data={convChartData}
                empty={
                  convChartData.length > 0 && convChartData.every((point) => point.value === 0)
                }
                emptyMessage="No conversation trend data is available for this period."
                labelFormatter={formatChartDate}
                seriesLabel="Conversations"
                allowDecimals={false}
                ariaLabel="Conversations over time"
              />
            )}
          </DashboardCard>

          <DashboardCard className="flex min-h-[320px] flex-1 flex-col p-6 xl:col-span-1">
            <h3 className="mb-5 text-sm font-semibold tracking-tight">Conversations by Source</h3>
            {isLoading ? (
              <Skeleton className="mx-auto size-[180px] rounded-full border border-border/50 bg-transparent" />
            ) : (
              <div className="flex flex-1 flex-col items-center gap-4">
                <DonutChart
                  data={sourceChart.segments}
                  centerValue={sourceChart.total.toLocaleString()}
                  emptyMessage="No source data for this period"
                  ariaLabel="Conversations by source"
                />
                <DonutLegend
                  items={sourceChart.legend}
                  ariaLabel="Conversation counts and percentages by source"
                  className="w-full"
                />
              </div>
            )}
          </DashboardCard>

          <DashboardCard className="flex min-h-[320px] flex-1 flex-col p-6 xl:col-span-1">
            <div className="mb-5">
              <h3 className="text-sm font-semibold tracking-tight">Current conversation status</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Current status of conversations started in the selected period.
              </p>
            </div>
            {isLoading ? (
              <Skeleton className="mx-auto size-[180px] rounded-full border border-border/50 bg-transparent" />
            ) : (
              <div className="flex flex-1 flex-col items-center gap-4">
                <DonutChart
                  data={statusChart.segments}
                  centerValue={statusChart.total.toLocaleString()}
                  emptyMessage="No status data for this period"
                  ariaLabel="Conversations by status"
                />
                <DonutLegend
                  items={statusChart.legend}
                  ariaLabel="Conversation counts and percentages by status"
                  className="w-full"
                />
              </div>
            )}
          </DashboardCard>
        </section>

        <section
          hidden={hasInitialError || (!isLoading && analytics?.kpis.totalConversations.value === 0)}
          className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-4"
        >
          <DashboardCard className="flex h-full flex-col p-6 xl:col-span-2">
            <h3 className="text-sm font-semibold tracking-tight">Top Questions</h3>
            <div className="mt-4 flex-1">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-9 w-full rounded-md border border-border/50 bg-transparent"
                    />
                  ))}
                </div>
              ) : (analytics?.topQuestions ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No visitor questions recorded in this period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="h-8 px-0 text-xs font-medium text-muted-foreground">
                        Question
                      </TableHead>
                      <TableHead className="h-8 w-24 px-0 text-right text-xs font-medium text-muted-foreground">
                        Conversations
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(analytics?.topQuestions ?? []).map((item: TopQuestion) => (
                      <TableRow
                        key={item.question}
                        className="group border-border/50 hover:bg-transparent"
                      >
                        <TableCell className="whitespace-normal break-words px-0 py-2.5 text-sm">
                          <Link
                            href={{
                              pathname: APP_ROUTES.inbox,
                              query: { conversationId: item.conversationId },
                            }}
                            aria-label={`Open a conversation about: ${item.question}`}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-sm pr-1 text-left outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <span>{item.question}</span>
                            <HugeiconsIcon
                              icon={ArrowRight01Icon}
                              strokeWidth={1.75}
                              className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                              aria-hidden="true"
                            />
                          </Link>
                        </TableCell>
                        <TableCell className="px-0 py-2.5 text-right text-sm font-medium tabular-nums">
                          {formatNumber(item.count)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <div className="mt-4 border-t border-border/50 pt-4">
              <Link
                href={APP_ROUTES.inbox}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Open inbox
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
              </Link>
            </div>
          </DashboardCard>

          <DashboardCard className="flex h-full flex-col p-6 xl:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Needs review</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {reviewFilter === "negative"
                    ? "Recent AI answers rated negatively"
                    : "No public reply or no knowledge source matched"}
                </p>
              </div>
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <HugeiconsIcon
                  icon={reviewFilter === "negative" ? ThumbsDownIcon : Message01Icon}
                  strokeWidth={1.8}
                  className="size-4"
                  aria-hidden="true"
                />
              </span>
            </div>
            <fieldset className="mt-4 flex w-fit rounded-lg bg-muted p-1">
              <legend className="sr-only">Review type</legend>
              <button
                type="button"
                aria-pressed={reviewFilter === "negative"}
                onClick={() => setReviewFilter("negative")}
                className="min-h-10 rounded-md px-3 text-xs font-medium transition-colors hover:bg-background/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
              >
                Negative feedback
              </button>
              <button
                type="button"
                aria-pressed={reviewFilter === "unanswered"}
                onClick={() => setReviewFilter("unanswered")}
                className="min-h-10 rounded-md px-3 text-xs font-medium transition-colors hover:bg-background/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
              >
                Knowledge gaps
              </button>
            </fieldset>
            {reviewFilter === "unanswered" ? (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Review questions and source misses</p>
                <Select
                  value={gapFilter}
                  onValueChange={(value) => {
                    if (value === "OPEN" || value === "RESOLVED" || value === "IGNORED") {
                      setGapFilter(value);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 max-w-[190px] rounded-lg border-border/70 bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">
                      Open ({analytics?.knowledgeGaps.counts.open ?? 0})
                    </SelectItem>
                    <SelectItem value="RESOLVED">
                      Resolved ({analytics?.knowledgeGaps.counts.resolved ?? 0})
                    </SelectItem>
                    <SelectItem value="IGNORED">
                      Ignored ({analytics?.knowledgeGaps.counts.ignored ?? 0})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {isLoading ? (
              <div className="mt-4 space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-[92px] w-full rounded-lg border border-border/50 bg-transparent"
                  />
                ))}
              </div>
            ) : reviewFilter === "negative" && (analytics?.negativeFeedback ?? []).length === 0 ? (
              <p className="mt-4 flex min-h-36 flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 px-5 text-center text-sm text-muted-foreground">
                No negative feedback from conversations in this period.
              </p>
            ) : reviewFilter === "unanswered" && gapItems.length === 0 ? (
              <p className="mt-4 flex min-h-36 flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 px-5 text-center text-sm text-muted-foreground">
                {gapFilter === "OPEN"
                  ? "No open knowledge gaps in this period."
                  : gapFilter === "RESOLVED"
                    ? "No resolved knowledge gaps in this period."
                    : "No ignored knowledge gaps in this period."}
              </p>
            ) : reviewFilter === "negative" ? (
              <ul className="mt-4 divide-y divide-border/50">
                {(analytics?.negativeFeedback ?? []).map((item, index) => (
                  <li key={`${item.conversationId}-${item.feedbackAt}-${index}`}>
                    <div className="flex items-start gap-2 py-3">
                      <Link
                        href={{
                          pathname: APP_ROUTES.inbox,
                          query: { conversationId: item.conversationId },
                        }}
                        aria-label={`Review AI answer. Visitor asked: ${item.question}. AI replied: ${item.response}`}
                        className="-mx-2 min-h-11 min-w-0 flex-1 rounded-lg px-2 py-1 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <span className="block truncate text-xs font-medium text-muted-foreground">
                          {item.question}
                        </span>
                        <span className="mt-1 block line-clamp-2 text-sm leading-relaxed text-foreground">
                          {item.response}
                        </span>
                        {item.reason ? (
                          <span className="mt-1.5 block line-clamp-1 text-xs text-muted-foreground">
                            Feedback: {item.reason}
                          </span>
                        ) : null}
                      </Link>
                      {canManage ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-1 min-h-11 shrink-0 px-3"
                          onClick={() => setFeedbackToImprove(item)}
                          aria-label={`Write a verified answer for: ${item.question}`}
                        >
                          Add answer
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mt-4 divide-y divide-border/50">
                {gapItems.map((item, index) => (
                  <li key={`${item.conversationId}-${item.askedAt}-${index}`}>
                    <div className="flex items-start gap-2 py-3">
                      <Link
                        href={{
                          pathname: APP_ROUTES.inbox,
                          query: { conversationId: item.conversationId },
                        }}
                        aria-label={`Review knowledge gap: ${item.question}`}
                        className="-mx-2 min-h-11 min-w-0 flex-1 rounded-lg px-2 py-2 text-sm leading-relaxed outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <span className="line-clamp-3">{item.question}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {item.signals
                            .map((signal) =>
                              signal === "UNANSWERED" ? "No public reply" : "No source matched",
                            )
                            .join(" · ")}
                          {item.count > 1 ? ` · ${item.count} occurrences` : ""}
                        </span>
                      </Link>
                      {canManage ? (
                        <div className="mt-1 flex shrink-0 flex-col items-end gap-1">
                          {gapFilter === "OPEN" ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="min-h-11 px-3"
                                onClick={() => setFeedbackToImprove(item)}
                                aria-label={`Write a verified answer for: ${item.question}`}
                              >
                                Add answer
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="min-h-11 px-3 text-muted-foreground"
                                disabled={reviewKnowledgeGap.isPending}
                                onClick={() => void setKnowledgeGapStatus(item.question, "IGNORED")}
                                aria-label={`Ignore knowledge gap: ${item.question}`}
                              >
                                Ignore
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-11 px-3"
                              disabled={reviewKnowledgeGap.isPending}
                              onClick={() => void setKnowledgeGapStatus(item.question, "OPEN")}
                              aria-label={`Reopen knowledge gap: ${item.question}`}
                            >
                              Reopen
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-auto border-t border-border/50 pt-4">
              <Link
                href={APP_ROUTES.inbox}
                className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Open inbox
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
              </Link>
            </div>
          </DashboardCard>

          <DashboardCard className="flex h-full flex-col p-6 xl:col-span-2">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Conversation activity</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Repeat visitor rate means conversations with at least two visitor messages.
              </p>
            </div>
            <div className="mt-4 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              {isLoading || !engagement
                ? Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-24 rounded-lg border border-border/50 bg-transparent"
                    />
                  ))
                : engagementTiles.map((tile) => (
                    <div
                      key={tile.label}
                      className="rounded-lg border border-border/50 bg-transparent p-4"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <HugeiconsIcon
                          icon={tile.icon}
                          strokeWidth={2}
                          className="size-4 shrink-0"
                        />
                        <span className="text-sm">{tile.label}</span>
                      </div>
                      <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
                        {tile.value}
                      </p>
                      <p className="mt-1.5 text-xs">
                        <ChangeIndicator change={tile.change} />
                      </p>
                    </div>
                  ))}
            </div>
          </DashboardCard>

          <DashboardCard className="flex h-full flex-col p-6 xl:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">
                  Satisfaction by Conversation Start
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ratings are grouped by when each conversation began.
                </p>
              </div>
              <GranularitySelect
                value={satGranularity}
                onChange={(value) => void setInsightsQuery({ satisfaction: value })}
              />
            </div>
            {isLoading ? (
              <Skeleton className="h-60 w-full rounded-lg border border-border/50 bg-transparent" />
            ) : (
              <InsightsTrendChart
                data={satChartData}
                empty={!hasSatisfactionResponses}
                emptyMessage="No satisfaction feedback in this period."
                labelFormatter={formatChartDate}
                valueFormatter={(v) => v.toFixed(1)}
                seriesLabel="Satisfaction score"
                showResponseCount
                yAxisDomain={[0, 5]}
                ariaLabel="Satisfaction by conversation start date"
              />
            )}
          </DashboardCard>
        </section>

        {!hasInitialError ? (
          <section
            aria-labelledby="agent-test-trend-heading"
            aria-busy={agentTestRunsQuery.isFetching}
          >
            <DashboardCard className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2
                    id="agent-test-trend-heading"
                    className="text-sm font-semibold tracking-tight"
                  >
                    Saved test pass rate
                  </h2>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                    Share of completed saved checks that met their expected behavior on each run.
                    History is limited to the latest 50 runs in this date range before filtering.
                    Errors and checks not run are excluded. Filter to the latest suite to compare
                    the same saved checks. Agent and knowledge changes are not versioned here. These
                    outcomes check retrieval and handoff behavior, not answer correctness,
                    confidence, or live conversations.
                  </p>
                </div>
                {latestAgentTestRun ? (
                  <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    Latest:{" "}
                    {latestEvaluatedCount > 0
                      ? `${latestAgentTestRun.passedCount}/${latestEvaluatedCount} passed`
                      : "no completed checks"}
                    {latestAgentTestRun.mismatchCount > 0
                      ? ` · ${latestAgentTestRun.mismatchCount} mismatches`
                      : ""}
                    {latestAgentTestRun.errorCount > 0
                      ? ` · ${latestAgentTestRun.errorCount} errors`
                      : ""}
                    {latestAgentTestRun.notRunCount > 0
                      ? ` · ${latestAgentTestRun.notRunCount} not run`
                      : ""}
                  </p>
                ) : null}
              </div>
              {(agentTestRunsQuery.data?.runs.length ?? 0) > 0 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex flex-wrap items-center gap-2 text-xs font-medium">
                    Compare tests
                    <select
                      className="h-9 max-w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                      value={insightsQuery.tests}
                      onChange={(event) =>
                        void setInsightsQuery({
                          tests: event.target.value === "latest-suite" ? "latest-suite" : "all",
                        })
                      }
                    >
                      <option value="all">All suite versions</option>
                      <option value="latest-suite">Latest suite in this period</option>
                    </select>
                  </label>
                  <p className="text-xs text-muted-foreground" aria-live="polite">
                    {agentTestRuns.length} of {agentTestRunsQuery.data?.runs.length ?? 0} loaded
                    runs · {testHistory.versionCount} suite{" "}
                    {testHistory.versionCount === 1 ? "version" : "versions"}
                    {testHistory.unversionedCount > 0
                      ? ` · ${testHistory.unversionedCount} unversioned`
                      : ""}
                  </p>
                </div>
              ) : null}
              {agentTestRunsQuery.isError && agentTestRunsQuery.data ? (
                <output aria-live="polite" className="mt-3 block text-xs text-muted-foreground">
                  Saved test history couldn’t refresh. Showing the last loaded results.
                </output>
              ) : null}
              {isLoading || agentTestRunsQuery.isLoading ? (
                <output
                  aria-live="polite"
                  aria-label="Loading saved test history"
                  aria-busy="true"
                  className="mt-5 block"
                >
                  <span className="sr-only">Loading saved test history</span>
                  <Skeleton className="h-52 w-full rounded-lg border border-border/50 bg-transparent" />
                </output>
              ) : agentTestRunsQuery.isError && !agentTestRunsQuery.data ? (
                <div
                  role="alert"
                  className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-3"
                >
                  <p className="text-sm text-muted-foreground">
                    Saved test history couldn’t be loaded.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void agentTestRunsQuery.refetch()}
                    disabled={agentTestRunsQuery.isFetching}
                  >
                    {agentTestRunsQuery.isFetching ? "Retrying…" : "Try again"}
                  </Button>
                </div>
              ) : insightsQuery.tests === "latest-suite" &&
                (agentTestRunsQuery.data?.runs.length ?? 0) > 0 &&
                testHistory.latestSuiteDigest === null ? (
                <div className="mt-5">
                  <EmptyState
                    compact
                    title="These runs have no suite version"
                    description="Earlier runs were saved before suite versioning. View all runs, or run your saved checks again to record a version."
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void setInsightsQuery({ tests: "all" })}
                    >
                      View all runs
                    </Button>
                  </EmptyState>
                </div>
              ) : (agentTestRuns?.length ?? 0) === 0 ? (
                <div className="mt-5">
                  <EmptyState
                    compact
                    title={
                      agentTestRunsQuery.data?.hasAnyRuns
                        ? "No saved test runs in this period"
                        : "No saved test runs yet"
                    }
                    description={
                      agentTestRunsQuery.data?.hasAnyRuns
                        ? "Choose a wider Insights date range to include earlier runs, or run your checks now."
                        : canManage
                          ? "Create reusable checks in Agent → Test, then run the suite to start a history."
                          : "A workspace owner can run saved checks in Agent → Test to start a history."
                    }
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={agentHref("saved-tests-heading")} />}
                    >
                      Open Agent tests
                    </Button>
                  </EmptyState>
                </div>
              ) : (
                <InsightsTrendChart
                  className="mt-4"
                  data={agentTestRunChartData}
                  empty={agentTestRunChartData.every((point) => point.value === null)}
                  emptyMessage="These runs had no completed checks. Run the suite after the preview is ready."
                  labelFormatter={(value) =>
                    formatInTimeZone(
                      new Date(value),
                      normalizeTimezone(workspaceTimezone),
                      "MMM d, h:mm a",
                    )
                  }
                  valueFormatter={(value) => `${Math.round(value)}%`}
                  seriesLabel="Saved test pass rate"
                  countLabels={{ singular: "completed check", plural: "completed checks" }}
                  detailColumns={[
                    { key: "passed", label: "Passed" },
                    { key: "mismatches", label: "Mismatches" },
                    { key: "errors", label: "Errors" },
                    { key: "notRun", label: "Not run" },
                  ]}
                  yAxisDomain={[0, 100]}
                  allowDecimals={false}
                  ariaLabel="Saved test pass rate by run"
                />
              )}
            </DashboardCard>
          </section>
        ) : null}

        {feedbackToImprove ? (
          <FeedbackKnowledgeDialog
            feedback={feedbackToImprove}
            onAnswerAdded={async (question) => {
              await reviewKnowledgeGap.mutateAsync({ question, status: "RESOLVED" });
            }}
            onOpenChange={(open) => {
              if (!open) setFeedbackToImprove(null);
            }}
          />
        ) : null}
      </div>
    </>
  );
}

function FeedbackKnowledgeDialog({
  feedback,
  onAnswerAdded,
  onOpenChange,
}: {
  feedback: ReviewKnowledgeItem;
  onAnswerAdded: (question: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState(buildVerifiedAnswerTitle(feedback.question));
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const addSource = useAddManualTextSource();
  const { toast } = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const source = buildVerifiedAnswerSource(feedback.question, answer);
      await addSource.mutateAsync({ title: title.trim(), content: source.content });
      if (feedback.status === "OPEN") {
        try {
          await onAnswerAdded(feedback.question);
        } catch {
          toast.success("Answer added to knowledge", {
            description: "It still appears as open. Refresh Insights to update its review status.",
          });
          onOpenChange(false);
          return;
        }
      }
      toast.success("Answer added to knowledge", {
        description: "It will be available to the agent after indexing finishes.",
      });
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add this answer.");
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a verified answer</DialogTitle>
          <DialogDescription>
            Review the customer question and write the answer your agent should use. Existing AI
            replies are never added as trusted knowledge.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <section className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <div>
              <h3 className="text-xs font-medium text-muted-foreground">Customer question</h3>
              <p className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-sm text-foreground">
                {feedback.question}
              </p>
            </div>
            <div>
              <p className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-sm text-foreground">
                {feedback.response ?? "No public AI or teammate reply was recorded."}
              </p>
            </div>
            {feedback.reason ? (
              <p className="border-t border-border/70 pt-2 text-xs text-muted-foreground">
                Visitor feedback: {feedback.reason}
              </p>
            ) : null}
          </section>
          <div className="space-y-2">
            <Label htmlFor="feedback-answer-title">Source title</Label>
            <Input
              id="feedback-answer-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-verified-answer">Verified answer</Label>
            <Textarea
              id="feedback-verified-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Write the answer you want the agent to give."
              maxLength={50_000}
              rows={5}
              required
              aria-describedby="feedback-answer-hint"
            />
            <p id="feedback-answer-hint" className="text-xs text-muted-foreground">
              Only your verified answer is added to the knowledge base.
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addSource.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addSource.isPending || !answer.trim() || !title.trim()}>
              {addSource.isPending ? "Adding…" : "Add to knowledge"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ReviewKnowledgeItem = {
  conversationId: string;
  question: string;
  response?: string | null;
  reason?: string | null;
  askedAt?: string;
  status?: "OPEN" | "RESOLVED" | "IGNORED";
  signals?: ("UNANSWERED" | "NO_SOURCE_MATCH")[];
};
