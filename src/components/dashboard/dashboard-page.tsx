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
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type {
  DashboardAnalytics,
  MetricComparison,
  SatisfactionPoint,
  TimeSeriesPoint,
  TopQuestion,
} from "@/features/analytics/types";
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
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Calendar03Icon,
  Chart01Icon,
  Clock01Icon,
  Download01Icon,
  InformationCircleIcon,
  Message01Icon,
  StarIcon,
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
  Resolved: "bg-primary",
  "In Progress": "bg-chart-2",
  Unresolved: "bg-chart-4",
};

const STATUS_COLORS: Record<string, string> = {
  Resolved: "var(--primary)",
  "In Progress": "var(--chart-2)",
  Unresolved: "var(--chart-4)",
};

const POPOVER_PANEL_CLASS =
  "w-auto rounded-xl border border-border/50 bg-zinc-50 p-4 text-foreground shadow-none ring-0 dark:bg-zinc-900";

const CHART_PADDING = { top: 12, right: 8, bottom: 28, left: 40 };

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
type LineChartPoint = { label: string; value: number };
type ExportSection = { title: string; headers: string[]; rows: string[][] };

const DEFAULT_EXPORT_SELECTION = Object.fromEntries(
  EXPORT_SECTIONS.map((section) => [section.id, true]),
) as Record<ExportSectionId, boolean>;

function getDefaultDateRange(): DateRangeValue {
  const end = endOfDay(new Date());
  return { start: startOfDay(subDays(end, 6)), end };
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatChangePercent(changePercent: number | null): string {
  if (changePercent === null) return "—";
  const sign = changePercent > 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(1)}%`;
}

function formatComparisonRange(startIso: string, endIso: string): string {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
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
  return formatComparisonRange(range.start.toISOString(), range.end.toISOString());
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
          "Resolved Conversations",
          String(analytics.kpis.resolvedConversations.value),
          String(analytics.kpis.resolvedConversations.previousValue),
          pct(analytics.kpis.resolvedConversations.changePercent),
        ],
        [
          "Avg. Response Time",
          analytics.kpis.avgResponseTime.formatted,
          String(analytics.kpis.avgResponseTime.previousValue),
          pct(analytics.kpis.avgResponseTime.changePercent),
        ],
        [
          "Satisfaction Score",
          analytics.kpis.satisfactionScore.formatted,
          String(analytics.kpis.satisfactionScore.previousValue),
          pct(analytics.kpis.satisfactionScore.changePercent),
        ],
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
      title: "Satisfaction Over Time",
      headers: ["Date", "Score", "Responses"],
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

function formatAxisValue(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return String(Math.round(value));
}

function aggregateWeeklyCounts(data: TimeSeriesPoint[]): TimeSeriesPoint[] {
  if (data.length === 0) return [];
  const buckets = new Map<string, number>();
  for (const point of data) {
    const weekStart = format(parseISO(point.date), "yyyy-'W'II");
    buckets.set(weekStart, (buckets.get(weekStart) ?? 0) + point.count);
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

function aggregateWeeklySatisfaction(data: SatisfactionPoint[]): SatisfactionPoint[] {
  if (data.length === 0) return [];
  const buckets = new Map<string, { positive: number; negative: number }>();
  for (const point of data) {
    const weekKey = point.date.slice(0, 7);
    const bucket = buckets.get(weekKey) ?? { positive: 0, negative: 0 };
    if (point.score !== null && point.responses > 0) {
      const positive = (point.score / 5) * point.responses;
      bucket.positive += positive;
      bucket.negative += point.responses - positive;
    }
    buckets.set(weekKey, bucket);
  }
  return [...buckets.entries()].map(([date, bucket]) => {
    const responses = bucket.positive + bucket.negative;
    return {
      date,
      responses,
      score: responses > 0 ? (bucket.positive / responses) * 5 : null,
    };
  });
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

const defaultLabelFormatter = (label: string) => label;

function LineChart({
  data,
  className,
  height = 240,
  showArea = false,
  valueFormatter = formatAxisValue,
  labelFormatter = defaultLabelFormatter,
  ariaLabel,
}: {
  data: LineChartPoint[];
  className?: string;
  height?: number;
  showArea?: boolean;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
  ariaLabel: string;
}) {
  const chart = useMemo(() => {
    if (data.length === 0) return null;
    const width = 640;
    const innerWidth = width - CHART_PADDING.left - CHART_PADDING.right;
    const innerHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;
    const maxValue = Math.max(...data.map((point) => point.value), 1);
    const yTicks = [0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue];
    const points = data.map((point, index) => {
      const x =
        data.length === 1
          ? CHART_PADDING.left + innerWidth / 2
          : CHART_PADDING.left + (index / (data.length - 1)) * innerWidth;
      const y = CHART_PADDING.top + innerHeight - (point.value / maxValue) * innerHeight;
      return { ...point, x, y };
    });
    const linePath = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
    const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? 0} ${
      CHART_PADDING.top + innerHeight
    } L ${points[0]?.x ?? 0} ${CHART_PADDING.top + innerHeight} Z`;
    const xLabelIndexes =
      data.length <= 4
        ? data.map((_, index) => index)
        : [0, Math.floor((data.length - 1) / 2), data.length - 1];
    return { width, innerHeight, yTicks, points, linePath, areaPath, xLabelIndexes, maxValue };
  }, [data, height]);

  if (!chart) {
    return (
      <div
        className={cn(
          "flex h-60 items-center justify-center text-sm text-muted-foreground",
          className,
        )}
        aria-label={`${ariaLabel}: no data`}
      >
        No data for this period
      </div>
    );
  }

  return (
    <div className={cn("h-60 w-full", className)}>
      <svg
        viewBox={`0 0 ${chart.width} ${height}`}
        className="h-auto w-full"
        aria-label={ariaLabel}
      >
        {chart.yTicks.map((tick) => {
          const y =
            CHART_PADDING.top + chart.innerHeight - (tick / chart.maxValue) * chart.innerHeight;
          return (
            <g key={tick}>
              <line
                x1={CHART_PADDING.left}
                y1={y}
                x2={chart.width - CHART_PADDING.right}
                y2={y}
                className="stroke-border/60"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text
                x={CHART_PADDING.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px]"
              >
                {valueFormatter(tick)}
              </text>
            </g>
          );
        })}
        {showArea ? <path d={chart.areaPath} className="fill-primary/10" /> : null}
        <path
          d={chart.linePath}
          fill="none"
          className="stroke-primary"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {chart.points.map((point) => (
          <circle
            key={point.label}
            cx={point.x}
            cy={point.y}
            r={3}
            className="fill-primary stroke-background"
            strokeWidth={2}
          />
        ))}
        {chart.xLabelIndexes.map((index) => {
          const point = chart.points[index];
          if (!point) return null;
          return (
            <text
              key={point.label}
              x={point.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {labelFormatter(point.label)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({
  data,
  centerValue,
  ariaLabel,
}: {
  data: Array<{ label: string; value: number; color: string }>;
  centerValue?: string;
  ariaLabel: string;
}) {
  const size = 180;
  const chart = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return null;
    const radius = size / 2 - 14;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const segments = data.map((item) => {
      const length = (item.value / total) * circumference;
      const segment = {
        ...item,
        dashArray: `${length} ${circumference - length}`,
        dashOffset: -offset,
      };
      offset += length;
      return segment;
    });
    return { total, radius, segments };
  }, [data]);

  if (!chart) {
    return (
      <div
        className="flex size-[180px] items-center justify-center text-sm text-muted-foreground"
        aria-label={`${ariaLabel}: no data`}
      >
        No data
      </div>
    );
  }

  return (
    <div className="relative size-[180px] shrink-0">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="size-full -rotate-90"
        aria-label={ariaLabel}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={chart.radius}
          fill="none"
          className="stroke-muted/50"
          strokeWidth={18}
        />
        {chart.segments.map((segment) => (
          <circle
            key={segment.label}
            cx={size / 2}
            cy={size / 2}
            r={chart.radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={18}
            strokeDasharray={segment.dashArray}
            strokeDashoffset={segment.dashOffset}
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-lg font-semibold tracking-tight">
          {centerValue ?? chart.total.toLocaleString()}
        </span>
      </div>
    </div>
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
  rangeStart,
  rangeEnd,
  onDayClick,
}: {
  month: Date;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onDayClick: (day: Date) => void;
}) {
  const days = getMonthDays(month);

  return (
    <div className="w-[252px]">
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground"
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
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={!inMonth}
              onClick={() => onDayClick(day)}
              className={cn(
                "flex h-8 w-full items-center justify-center rounded-md text-sm transition-colors",
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
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value.start));
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  const label = useMemo(() => formatRangeLabel(value), [value]);
  const displayStart = draftStart;
  const displayEnd = draftEnd;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
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

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 rounded-lg border-border/50 bg-transparent px-3 font-normal shadow-none"
            aria-label="Select date range"
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
        <div className="flex items-center justify-between gap-3 pb-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-8"
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
            className="size-8"
            onClick={() => setViewMonth((month) => addMonths(month, 1))}
            aria-label="Next month"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
          </Button>
        </div>
        <CalendarMonth
          month={viewMonth}
          rangeStart={displayStart}
          rangeEnd={displayEnd}
          onDayClick={handleDayClick}
        />
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
  const rawPositive = (metric.changePercent ?? 0) >= 0;
  const isPositive = invertTrend ? !rawPositive : rawPositive;

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
      <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 font-medium",
            isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400",
          )}
        >
          <HugeiconsIcon
            icon={isPositive ? ArrowUp01Icon : ArrowDown01Icon}
            strokeWidth={2}
            className="size-3"
          />
          {formatChangePercent(metric.changePercent)}
        </span>
        <span className="truncate text-muted-foreground">
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

export function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const [convGranularity, setConvGranularity] = useState<Granularity>("daily");
  const [satGranularity, setSatGranularity] = useState<Granularity>("daily");

  const queryParams = useMemo(
    () => ({
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
    }),
    [dateRange],
  );

  const analyticsQuery = useDashboardAnalytics(queryParams);
  const analytics = analyticsQuery.data;
  const isLoading = analyticsQuery.isLoading;

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
    return series
      .filter((point) => point.score !== null)
      .map((point) => ({ label: point.date, value: point.score ?? 0 }));
  }, [analytics?.satisfactionOverTime, satGranularity]);

  const sourceChart = useMemo(() => {
    const data = analytics?.conversationsBySource ?? [];
    return {
      segments: data.map((item, i) => ({
        label: item.label,
        value: item.count,
        color: CHART_COLORS[i % CHART_COLORS.length],
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
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your AI assistant performance and usage.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
              label="Resolved Conversations"
              value={analytics.kpis.resolvedConversations.value.toLocaleString()}
              metric={analytics.kpis.resolvedConversations}
              previousRange={analytics.previousDateRange}
              icon={<HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-[18px]" />}
            />
            <MetricCard
              label="Avg. Response Time"
              value={analytics.kpis.avgResponseTime.formatted}
              metric={analytics.kpis.avgResponseTime}
              previousRange={analytics.previousDateRange}
              icon={<HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-[18px]" />}
              invertTrend
            />
            <MetricCard
              label="Satisfaction Score"
              value={`${analytics.kpis.satisfactionScore.formatted} / ${analytics.kpis.satisfactionScore.max}`}
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
                    Calculated from visitor feedback on AI responses. Scores range from 0 to 5.
                  </TooltipContent>
                </Tooltip>
              }
            />
          </>
        )}
      </section>

      <section className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-5">
        <DashboardCard className="flex min-h-[320px] flex-1 flex-col p-6 xl:col-span-3">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold tracking-tight">Conversations Over Time</h3>
            <GranularitySelect value={convGranularity} onChange={setConvGranularity} />
          </div>
          {isLoading ? (
            <Skeleton className="h-60 w-full rounded-lg border border-border/50 bg-transparent" />
          ) : (
            <LineChart
              data={convChartData}
              showArea
              labelFormatter={formatChartDate}
              ariaLabel="Conversations over time"
            />
          )}
        </DashboardCard>

        <DashboardCard className="flex min-h-[320px] flex-1 flex-col p-6 xl:col-span-1">
          <h3 className="mb-5 text-sm font-semibold tracking-tight">Conversations by Source</h3>
          {isLoading ? (
            <Skeleton className="mx-auto size-[180px] rounded-full border border-border/50 bg-transparent" />
          ) : (
            <div className="flex flex-1 flex-col items-center gap-5 sm:flex-row sm:items-center">
              <DonutChart
                data={sourceChart.segments}
                centerValue={sourceChart.total.toLocaleString()}
                ariaLabel="Conversations by source"
              />
              <DonutLegend items={sourceChart.legend} className="w-full flex-1" />
            </div>
          )}
        </DashboardCard>

        <DashboardCard className="flex min-h-[320px] flex-1 flex-col p-6 xl:col-span-1">
          <h3 className="mb-5 text-sm font-semibold tracking-tight">Conversations by Status</h3>
          {isLoading ? (
            <Skeleton className="mx-auto size-[180px] rounded-full border border-border/50 bg-transparent" />
          ) : (
            <div className="flex flex-1 flex-col items-center gap-5 sm:flex-row sm:items-center">
              <DonutChart
                data={statusChart.segments}
                centerValue={statusChart.total.toLocaleString()}
                ariaLabel="Conversations by status"
              />
              <DonutLegend items={statusChart.legend} className="w-full flex-1" />
            </div>
          )}
        </DashboardCard>
      </section>

      <section className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <DashboardCard className="flex h-full flex-col p-6">
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
                    <TableRow key={item.question} className="border-border/50 hover:bg-transparent">
                      <TableCell className="max-w-0 truncate px-0 py-2.5 text-sm">
                        {item.question}
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
              View all questions
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
            </Link>
          </div>
        </DashboardCard>

        <DashboardCard className="flex h-full flex-col p-6">
          <h3 className="text-sm font-semibold tracking-tight">User Engagement</h3>
          <div className="mt-4 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            {isLoading || !engagement
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-lg border border-border/50 bg-transparent"
                  />
                ))
              : engagementTiles.map((tile) => {
                  const isPositive = (tile.change ?? 0) >= 0;
                  return (
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
                      <p
                        className={cn(
                          "mt-1.5 inline-flex items-center gap-0.5 text-xs font-medium",
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400",
                        )}
                      >
                        <HugeiconsIcon
                          icon={isPositive ? ArrowUp01Icon : ArrowDown01Icon}
                          strokeWidth={2}
                          className="size-3"
                        />
                        {formatChangePercent(tile.change)}
                      </p>
                    </div>
                  );
                })}
          </div>
        </DashboardCard>

        <DashboardCard className="flex h-full flex-col p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold tracking-tight">Satisfaction Score Over Time</h3>
            <GranularitySelect value={satGranularity} onChange={setSatGranularity} />
          </div>
          {isLoading ? (
            <Skeleton className="h-60 w-full rounded-lg border border-border/50 bg-transparent" />
          ) : satChartData.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
              No satisfaction feedback in this period.
            </div>
          ) : (
            <LineChart
              data={satChartData}
              labelFormatter={formatChartDate}
              valueFormatter={(v) => v.toFixed(1)}
              ariaLabel="Satisfaction score over time"
            />
          )}
        </DashboardCard>
      </section>

      {analyticsQuery.isError ? (
        <p className="text-sm text-destructive">
          {analyticsQuery.error instanceof Error
            ? analyticsQuery.error.message
            : "Failed to load dashboard analytics."}
        </p>
      ) : null}
    </div>
  );
}
