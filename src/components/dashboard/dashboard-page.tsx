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
import { toZonedTime } from "date-fns-tz";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type { DashboardAnalytics, MetricComparison, TopQuestion } from "@/features/analytics/types";
import {
  aggregateWeeklyCounts,
  aggregateWeeklySatisfaction,
} from "@/features/analytics/aggregation";
import { InsightsTrendChart } from "@/components/dashboard/insights-trend-chart";
import { EvilPieChart } from "@/components/evilcharts/charts/recharts-pie-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDashboardAnalytics } from "@/hooks/query";
import { useKnowledgeBaseSources } from "@/hooks/query/use-knowledge-base";
import { useWidgetConfig } from "@/hooks/query/use-widget";
import { useActiveWorkspaceId } from "@/hooks/use-auth";
import { normalizeTimezone } from "@/features/conversations/snooze-schedule";
import { getAgentPublicationReadiness } from "@/features/widget/agent-readiness";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
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

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

const EXPORT_SECTIONS = [
  { id: "kpis", label: "Key metrics (KPIs)" },
  { id: "conversationsOverTime", label: "Conversations over time" },
  { id: "conversationsBySource", label: "Conversations by source" },
  { id: "conversationsByStatus", label: "Conversations by status" },
  { id: "topQuestions", label: "Top questions" },
  { id: "userEngagement", label: "User engagement" },
  { id: "satisfactionOverTime", label: "Satisfaction over time" },
] as const;

type ExportSectionId = (typeof EXPORT_SECTIONS)[number]["id"];
type ExportFormat = "csv" | "excel";
type DateRangeValue = { start: Date; end: Date };
type Granularity = "daily" | "weekly";
type ExportSection = { title: string; headers: string[]; rows: string[][] };
type DateRangePreset = "last-7-days" | "last-30-days" | "this-month" | "previous-month";

const DATE_RANGE_PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: "last-7-days", label: "Last 7 days" },
  { id: "last-30-days", label: "Last 30 days" },
  { id: "this-month", label: "This month" },
  { id: "previous-month", label: "Previous month" },
];

function AgentSetupChecklist({ canManage }: { canManage: boolean }) {
  const workspaceId = useActiveWorkspaceId() ?? "";
  const configQuery = useWidgetConfig(workspaceId);
  const sourcesQuery = useKnowledgeBaseSources();

  if (!workspaceId || configQuery.isPending || sourcesQuery.isPending) return null;

  if (configQuery.isError || sourcesQuery.isError) {
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="text-sm text-muted-foreground">Unable to check agent setup progress.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void configQuery.refetch();
            void sourcesQuery.refetch();
          }}
          disabled={configQuery.isFetching || sourcesQuery.isFetching}
        >
          Try again
        </Button>
      </div>
    );
  }

  const config = configQuery.data;
  const sources = sourcesQuery.data?.sources ?? [];
  if (!config) return null;

  const sourceReady = sources.some((source) => source.status === "ready" && source.chunkCount > 0);
  const instructionsReady = Boolean(config.instructions.trim());
  const domainReady = config.allowedDomains.length > 0;
  const publicationReadiness = getAgentPublicationReadiness({
    isEnabled: config.isEnabled,
    hasPublishedVersion: config.publication.current !== null,
    hasUnpublishedChanges: config.publication.hasUnpublishedChanges,
  });
  const steps = [
    {
      title: "Add a knowledge source",
      description: sourceReady
        ? "A source is indexed and ready to answer from."
        : sources.some((source) => source.status === "processing")
          ? "Your source is processing. Check back when indexing finishes."
          : "Give your agent trusted information to answer from.",
      complete: sourceReady,
      href: "/playground?subtab=build#knowledge",
      action: sourceReady ? "Review sources" : "Add a source",
    },
    {
      title: "Set agent instructions",
      description: instructionsReady
        ? "Your agent has guidance for how to respond."
        : "Set tone, boundaries, and when to hand off to a teammate.",
      complete: instructionsReady,
      href: "/playground?subtab=build",
      action: instructionsReady ? "Review instructions" : "Configure agent",
    },
    {
      title: "Authorize your website",
      description: domainReady
        ? "Your website is allowed to load the widget."
        : "Allow your production domain before installing the widget.",
      complete: domainReady,
      href: "/playground?subtab=deploy",
      action: domainReady ? "Review installation" : "Set up installation",
    },
    {
      title: publicationReadiness.title,
      description: publicationReadiness.description,
      complete: publicationReadiness.complete,
      href: "/playground?subtab=deploy",
      action: publicationReadiness.action,
    },
  ];
  const completedCount = steps.filter((step) => step.complete).length;
  if (completedCount === steps.length) return null;

  return (
    <DashboardCard className="bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Get your agent ready</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete these essentials to start handling customer questions.
          </p>
        </div>
        <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
          {completedCount} of {steps.length} complete
        </span>
      </div>
      <progress
        aria-label="Agent setup progress"
        max={steps.length}
        value={completedCount}
        className="mt-4 block h-1.5 w-full overflow-hidden rounded-full [appearance:none] [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary"
      />
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex min-w-0 items-start gap-3 rounded-lg border border-border/60 bg-background/50 p-3"
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                step.complete ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              {step.complete ? (
                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.2} className="size-4" />
              ) : (
                index + 1
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {step.description}
              </p>
              {step.complete || canManage ? (
                <Link
                  href={step.href}
                  className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {step.action}
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
                </Link>
              ) : (
                <p className="mt-2 min-h-8 content-center text-xs text-muted-foreground">
                  A workspace owner needs to complete this step.
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </DashboardCard>
  );
}

const DEFAULT_EXPORT_SELECTION = Object.fromEntries(
  EXPORT_SECTIONS.map((section) => [section.id, true]),
) as Record<ExportSectionId, boolean>;

function getDefaultDateRange(timezone: string): DateRangeValue {
  const end = endOfDay(toZonedTime(new Date(), normalizeTimezone(timezone)));
  return { start: startOfDay(subDays(end, 6)), end };
}

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

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
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
          "Unique Users",
          String(analytics.kpis.uniqueUsers.value),
          String(analytics.kpis.uniqueUsers.previousValue),
          pct(analytics.kpis.uniqueUsers.changePercent),
        ],
        [
          "Closed Conversations",
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
      title: "Conversations by Status",
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
      title: "User Engagement",
      headers: ["Metric", "Value", "Previous", "Change %"],
      rows: [
        [
          "Messages Sent",
          String(e.messagesSent.value),
          String(e.messagesSent.previousValue),
          pct(e.messagesSent.changePercent),
        ],
        [
          "Messages Received",
          String(e.messagesReceived.value),
          String(e.messagesReceived.previousValue),
          pct(e.messagesReceived.changePercent),
        ],
        [
          "Engagement Rate",
          e.engagementRate.formatted,
          String(e.engagementRate.previousValue),
          pct(e.engagementRate.changePercent),
        ],
        [
          "Conversations / User",
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
  const escapeHtml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>';
  for (const section of sections) {
    html += `<h2>${escapeHtml(section.title)}</h2><table border="1"><thead><tr>`;
    html += section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
    html += "</tr></thead><tbody>";
    for (const row of section.rows) {
      html += `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`;
    }
    html += "</tbody></table><br/>";
  }
  html += "</body></html>";
  return html;
}

function runDashboardExport(
  analytics: DashboardAnalytics,
  dateRange: DateRangeValue,
  formatType: ExportFormat,
  selected: Record<ExportSectionId, boolean>,
) {
  const ids = EXPORT_SECTIONS.map((section) => section.id).filter((id) => selected[id]);
  if (ids.length === 0) return false;

  const sections = buildExportSections(analytics, new Set(ids));
  const baseName = `dashboard-${format(dateRange.start, "yyyy-MM-dd")}-${format(dateRange.end, "yyyy-MM-dd")}`;

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
    <div
      className={cn(
        "animate-pulse rounded-xl border border-border/50 bg-transparent",
        className ?? "h-[156px]",
      )}
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
  className,
}: {
  items: Array<{ label: string; value: number; percentage: number; colorClass: string }>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn("size-2.5 shrink-0 rounded-full", item.colorClass)} />
            <span className="truncate text-muted-foreground">{item.label}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 tabular-nums">
            <span className="font-medium">{item.value.toLocaleString()}</span>
            <span className="w-10 text-right text-muted-foreground">
              {item.percentage.toFixed(0)}%
            </span>
          </div>
        </div>
      ))}
    </div>
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
  onDayClick,
}: {
  month: Date;
  referenceTime: Date;
  timezone: string;
  rangeStart: Date | null;
  rangeEnd: Date | null;
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

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={!inMonth || isAfter(day, today)}
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
              onDayClick={handleDayClick}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ExportMenu({
  analytics,
  dateRange,
  disabled,
}: {
  analytics: DashboardAnalytics;
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
    const ok = runDashboardExport(analytics, dateRange, formatType, selected);
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
            aria-label="Export dashboard data"
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
    <DashboardCard className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        {info}
      </div>
      <div className="mt-4 space-y-0.5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-[1.75rem] font-semibold leading-tight tracking-tight tabular-nums">
          {value}
        </p>
      </div>
      <div className="mt-auto flex flex-col items-start gap-0.5 pt-3 text-xs">
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
  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    getDefaultDateRange(workspaceTimezone),
  );
  const [convGranularity, setConvGranularity] = useState<Granularity>("daily");
  const [satGranularity, setSatGranularity] = useState<Granularity>("daily");

  const queryParams = useMemo(
    () => ({
      startDate: format(dateRange.start, "yyyy-MM-dd"),
      endDate: format(dateRange.end, "yyyy-MM-dd"),
    }),
    [dateRange],
  );

  const analyticsQuery = useDashboardAnalytics(queryParams);
  const analytics = analyticsQuery.data;
  const isLoading = analyticsQuery.isLoading;
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
          label: "Messages Sent",
          value: formatNumber(engagement.messagesSent.value),
          change: engagement.messagesSent.changePercent,
          icon: Message01Icon,
        },
        {
          label: "Messages Received",
          value: formatNumber(engagement.messagesReceived.value),
          change: engagement.messagesReceived.changePercent,
          icon: Message01Icon,
        },
        {
          label: "Engagement Rate",
          value: engagement.engagementRate.formatted,
          change: engagement.engagementRate.changePercent,
          icon: Chart01Icon,
        },
        {
          label: "Conversations / User",
          value: engagement.conversationsPerUser.formatted,
          change: engagement.conversationsPerUser.changePercent,
          icon: UserMultiple02Icon,
        },
      ]
    : [];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Understand conversation volume, response times and customer feedback.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} timezone={workspaceTimezone} />
          {analytics ? (
            <ExportMenu
              analytics={analytics}
              dateRange={dateRange}
              disabled={analyticsQuery.isFetching}
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

      <AgentSetupChecklist canManage={canManage} />

      {!isLoading && analytics?.kpis.totalConversations.value === 0 ? (
        <section className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HugeiconsIcon icon={Message01Icon} strokeWidth={2} className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight">
                No conversations in this date range
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Insights charts appear when visitors start conversations. Try a longer range to
                check for recent activity.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section
        hidden={hasInitialError}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
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
              icon={<HugeiconsIcon icon={Message01Icon} strokeWidth={2} className="size-[18px]" />}
            />
            <MetricCard
              label="Unique Users"
              value={analytics.kpis.uniqueUsers.value.toLocaleString()}
              metric={analytics.kpis.uniqueUsers}
              previousRange={analytics.previousDateRange}
              icon={
                <HugeiconsIcon icon={UserMultiple02Icon} strokeWidth={2} className="size-[18px]" />
              }
            />
            <MetricCard
              label="Closed Conversations"
              value={analytics.kpis.closedConversations.value.toLocaleString()}
              metric={analytics.kpis.closedConversations}
              previousRange={analytics.previousDateRange}
              icon={<HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-[18px]" />}
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
                        className="text-muted-foreground transition-colors hover:text-foreground"
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
                    Time from the first visitor message in a turn to the next public AI reply.
                    Human-only replies and unanswered turns are excluded.
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
                        className="text-muted-foreground transition-colors hover:text-foreground"
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
                    Average of visitor feedback on AI responses in conversations started during the
                    selected period. Each rating is counted on its conversation&apos;s start date,
                    even if the visitor rated it later. Scores range from 0 to 5. Based on{" "}
                    {analytics.kpis.satisfactionScore.responses}{" "}
                    {analytics.kpis.satisfactionScore.responses === 1 ? "response." : "responses."}
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
            <GranularitySelect value={convGranularity} onChange={setConvGranularity} />
          </div>
          {isLoading ? (
            <Skeleton className="h-60 w-full rounded-lg border border-border/50 bg-transparent" />
          ) : (
            <InsightsTrendChart
              data={convChartData}
              empty={convChartData.length > 0 && convChartData.every((point) => point.value === 0)}
              emptyMessage="No conversations in this period"
              labelFormatter={formatChartDate}
              seriesLabel="Conversations"
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
              <DonutLegend items={sourceChart.legend} className="w-full" />
            </div>
          )}
        </DashboardCard>

        <DashboardCard className="flex min-h-[320px] flex-1 flex-col p-6 xl:col-span-1">
          <h3 className="mb-5 text-sm font-semibold tracking-tight">Conversations by Status</h3>
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
              <DonutLegend items={statusChart.legend} className="w-full" />
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
                            pathname: "/conversations",
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
              href="/conversations"
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
                Recent AI answers rated negatively
              </p>
            </div>
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <HugeiconsIcon icon={ThumbsDownIcon} strokeWidth={1.8} className="size-4" />
            </span>
          </div>
          {isLoading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-[92px] w-full rounded-lg border border-border/50 bg-transparent"
                />
              ))}
            </div>
          ) : (analytics?.negativeFeedback ?? []).length === 0 ? (
            <p className="mt-4 flex min-h-36 flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 px-5 text-center text-sm text-muted-foreground">
              No negative feedback from conversations in this period.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border/50">
              {(analytics?.negativeFeedback ?? []).map((item, index) => (
                <li key={`${item.conversationId}-${item.feedbackAt}-${index}`}>
                  <Link
                    href={{
                      pathname: "/conversations",
                      query: { conversationId: item.conversationId },
                    }}
                    aria-label={`Review AI answer. Visitor asked: ${item.question}. AI replied: ${item.response}`}
                    className="-mx-2 block rounded-lg px-2 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto border-t border-border/50 pt-4">
            <Link
              href="/conversations"
              className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Open inbox
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
            </Link>
          </div>
        </DashboardCard>

        <DashboardCard className="flex h-full flex-col p-6 xl:col-span-2">
          <h3 className="text-sm font-semibold tracking-tight">User Engagement</h3>
          <div className="mt-4 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            {isLoading || !engagement
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-lg border border-border/50 bg-transparent"
                  />
                ))
              : engagementTiles.map((tile) => (
                  <div
                    key={tile.label}
                    className="rounded-lg border border-border/50 bg-transparent p-4"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <HugeiconsIcon icon={tile.icon} strokeWidth={2} className="size-4 shrink-0" />
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
            <GranularitySelect value={satGranularity} onChange={setSatGranularity} />
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

      {analyticsQuery.isError ? (
        <output className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">
            Unable to refresh. Showing the last loaded data.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-2"
            onClick={() => void analyticsQuery.refetch()}
            disabled={analyticsQuery.isFetching}
            aria-busy={analyticsQuery.isFetching}
          >
            <HugeiconsIcon
              icon={Refresh01Icon}
              strokeWidth={2}
              className={cn("size-3.5", analyticsQuery.isFetching && "motion-safe:animate-spin")}
              aria-hidden="true"
            />
            {analyticsQuery.isFetching ? "Retrying…" : "Try again"}
          </Button>
        </output>
      ) : null}
    </div>
  );
}
