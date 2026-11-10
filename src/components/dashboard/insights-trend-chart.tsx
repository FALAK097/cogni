"use client";

import { useId, useMemo } from "react";
import { EvilAreaChart } from "@/components/evilcharts/charts/recharts-area-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { cn } from "@/lib/utils";

type TrendPoint = {
  label: string;
  value: number | null;
  responses?: number;
  details?: Record<string, number>;
};
type YAxisDomain = readonly [number, number | "auto"];
type TrendDetailColumn = { key: string; label: string };

const formatDefaultValue = (value: number) => value.toLocaleString();
const formatDefaultLabel = (label: string) => label;

// Cogni's analytics data and View data table stay local; the rendered trend uses
// the MIT-licensed EvilCharts Recharts area component.
export function InsightsTrendChart({
  data,
  className,
  height = 240,
  empty = false,
  emptyMessage = "No data for this period",
  valueFormatter = formatDefaultValue,
  labelFormatter = formatDefaultLabel,
  ariaLabel,
  seriesLabel = ariaLabel,
  yAxisDomain = [0, "auto"],
  showResponseCount = false,
  countLabels,
  detailColumns = [],
  allowDecimals = true,
}: {
  data: TrendPoint[];
  className?: string;
  height?: number;
  empty?: boolean;
  emptyMessage?: string;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
  seriesLabel?: string;
  yAxisDomain?: YAxisDomain;
  showResponseCount?: boolean;
  countLabels?: { singular: string; plural: string };
  detailColumns?: TrendDetailColumn[];
  allowDecimals?: boolean;
  ariaLabel: string;
}) {
  const captionId = useId();
  const summaryId = useId();
  const chartConfig = useMemo(
    () =>
      ({
        value: {
          label: seriesLabel,
          colors: {
            light: ["var(--primary)"],
            dark: ["var(--primary)"],
          },
        },
      }) satisfies ChartConfig,
    [seriesLabel],
  );
  const chartData = useMemo(
    () => data.map((point) => ({ ...point, label: labelFormatter(point.label) })),
    [data, labelFormatter],
  );
  const dataPoints = data.flatMap((point) =>
    point.value === null ? [] : [{ ...point, value: point.value }],
  );
  const peakPoint = dataPoints.reduce<(typeof dataPoints)[number] | null>(
    (peak, point) => (peak === null || point.value > peak.value ? point : peak),
    null,
  );
  const latestPoint = dataPoints.at(-1);
  const chartSummary =
    data.length === 0
      ? ""
      : `${data.length} ${data.length === 1 ? "period" : "periods"} shown. ${
          peakPoint
            ? `Peak ${seriesLabel.toLowerCase()} was ${valueFormatter(peakPoint.value)} on ${labelFormatter(peakPoint.label)}.`
            : "No values are available for these periods."
        } ${
          latestPoint
            ? `Most recent: ${valueFormatter(latestPoint.value)} on ${labelFormatter(latestPoint.label)}.`
            : ""
        }`;

  return (
    <figure
      className={cn("min-w-0 w-full", className)}
      aria-labelledby={captionId}
      aria-describedby={data.length > 0 ? summaryId : undefined}
    >
      <figcaption id={captionId} className="sr-only">
        {ariaLabel}
      </figcaption>
      {data.length > 0 ? (
        <p id={summaryId} className="sr-only">
          {chartSummary}
        </p>
      ) : null}
      {empty || data.length === 0 ? (
        <output
          style={{ height }}
          aria-live="polite"
          className="flex items-center justify-center px-4 text-center text-sm text-muted-foreground"
        >
          {emptyMessage}
        </output>
      ) : (
        <div style={{ height }}>
          <EvilAreaChart
            data={chartData}
            config={chartConfig}
            curveType="monotone"
            animationType="left-to-right"
            className="aspect-auto h-full w-full flex-none"
            chartProps={{ margin: { top: 12, right: 12, bottom: 8, left: 0 } }}
          >
            <EvilAreaChart.Grid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
            <EvilAreaChart.XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              minTickGap={40}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <EvilAreaChart.YAxis
              axisLine={false}
              tickLine={false}
              width={42}
              tickMargin={8}
              domain={yAxisDomain}
              allowDecimals={allowDecimals}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={valueFormatter}
            />
            <EvilAreaChart.Tooltip
              formatter={(value, _name, item) => {
                if (value === null || value === undefined) return "No response";
                const formattedValue = valueFormatter(Number(value));
                const payload =
                  typeof item.payload === "object" && item.payload !== null
                    ? (item.payload as Record<string, unknown>)
                    : {};
                const responses = payload.responses;
                let summary = formattedValue;
                if (typeof responses === "number" && showResponseCount) {
                  summary = `${formattedValue} / 5 · ${responses} ${responses === 1 ? "response" : "responses"}`;
                } else if (typeof responses === "number" && countLabels) {
                  summary = `${formattedValue} · ${responses} ${responses === 1 ? countLabels.singular : countLabels.plural}`;
                }
                const details = detailColumns.flatMap((column) => {
                  const count = payload.details;
                  if (typeof count !== "object" || count === null) return [];
                  const value = (count as Record<string, unknown>)[column.key];
                  return typeof value === "number" ? [`${column.label}: ${value}`] : [];
                });
                return [summary, ...details].join(" · ");
              }}
            />
            <EvilAreaChart.Area
              dataKey="value"
              variant="gradient"
              strokeVariant="solid"
              strokeWidth={2}
              curveType="monotone"
            >
              {data.length === 1 ? <EvilAreaChart.Dot variant="border" /> : null}
              <EvilAreaChart.ActiveDot variant="colored-border" />
            </EvilAreaChart.Area>
          </EvilAreaChart>
        </div>
      )}
      {data.length > 0 ? (
        <details className="mt-2 text-xs text-muted-foreground">
          <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-sm py-1 pr-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            View data table for {ariaLabel}
          </summary>
          <div className="mt-2 max-h-48 overflow-auto rounded-md border border-border">
            <table className="w-full text-left tabular-nums">
              <caption className="sr-only">{ariaLabel} data</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-3 py-2">
                    {showResponseCount ? "Conversation start" : "Date"}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {seriesLabel}
                  </th>
                  {showResponseCount || countLabels ? (
                    <th scope="col" className="px-3 py-2 text-right">
                      {countLabels?.plural ?? "Responses"}
                    </th>
                  ) : null}
                  {detailColumns.map((column) => (
                    <th key={column.key} scope="col" className="px-3 py-2 text-right">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((point) => (
                  <tr key={point.label} className="border-b border-border last:border-0">
                    <th scope="row" className="px-3 py-2 font-normal">
                      {labelFormatter(point.label)}
                    </th>
                    <td className="px-3 py-2">
                      {point.value === null ? "—" : valueFormatter(point.value)}
                    </td>
                    {showResponseCount || countLabels ? (
                      <td className="px-3 py-2 text-right tabular-nums">{point.responses ?? 0}</td>
                    ) : null}
                    {detailColumns.map((column) => (
                      <td key={column.key} className="px-3 py-2 text-right tabular-nums">
                        {point.details?.[column.key] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </figure>
  );
}
