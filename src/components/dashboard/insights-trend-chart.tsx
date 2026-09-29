"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type TrendPoint = { label: string; value: number };

// Gradient areas, sparse axes and restrained active dots follow EvilCharts' area
// chart design: https://evilcharts.com/docs/recharts/area-chart/static
// Keep this adapter typed and use workspace analytics rather than sample data.
export function InsightsTrendChart({
  data,
  className,
  height = 240,
  showArea = false,
  valueFormatter = (value: number) => value.toLocaleString(),
  labelFormatter = (label: string) => label,
  ariaLabel,
}: {
  data: TrendPoint[];
  className?: string;
  height?: number;
  showArea?: boolean;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
  ariaLabel: string;
}) {
  const gradientId = `trend-${useId().replace(/:/g, "")}`;
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex h-60 items-center justify-center text-sm text-muted-foreground",
          className,
        )}
      >
        No data for this period
      </div>
    );
  }
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
      <XAxis
        dataKey="label"
        axisLine={false}
        tickLine={false}
        tickMargin={12}
        minTickGap={40}
        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        tickFormatter={labelFormatter}
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        width={42}
        tickMargin={8}
        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        tickFormatter={valueFormatter}
      />
      <Tooltip
        cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
        contentStyle={{
          background: "var(--popover)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          color: "var(--popover-foreground)",
          fontSize: 12,
        }}
        labelFormatter={(label) => labelFormatter(String(label))}
        formatter={(value) => [valueFormatter(Number(value)), ariaLabel]}
      />
    </>
  );
  return (
    <figure className={cn("min-w-0 w-full", className)} aria-label={ariaLabel}>
      <div style={{ height }}>
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 640, height }}
        >
          {showArea ? (
            <AreaChart
              data={data}
              margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
              accessibilityLayer
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              {axes}
              <Area
                type="linear"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                dot={data.length === 1}
                activeDot={{ r: 4, stroke: "var(--background)", strokeWidth: 2 }}
              />
            </AreaChart>
          ) : (
            <LineChart
              data={data}
              margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
              accessibilityLayer
            >
              {axes}
              <Line
                type="linear"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={data.length === 1}
                activeDot={{ r: 4, stroke: "var(--background)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="w-fit cursor-pointer rounded-sm py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          View data
        </summary>
        <div className="mt-2 max-h-48 overflow-auto rounded-md border border-border">
          <table className="w-full text-left tabular-nums">
            <caption className="sr-only">{ariaLabel}</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="px-3 py-2">
                  Date
                </th>
                <th scope="col" className="px-3 py-2">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.label} className="border-b border-border last:border-0">
                  <th scope="row" className="px-3 py-2 font-normal">
                    {labelFormatter(point.label)}
                  </th>
                  <td className="px-3 py-2">{valueFormatter(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
