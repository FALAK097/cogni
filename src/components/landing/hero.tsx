import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle,
  Download,
  Globe,
  Home,
  MessageSquare,
  Plug,
  Settings,
  Sparkles,
  TrendingUp,
} from "@/components/icons";
import { buttonVariants } from "@/components/ui/button-variants";
import { ThemeLogo } from "@/components/theme-logo";
import { cn } from "@/lib/utils";

const SIDEBAR_NAV = [
  { label: "Dashboard", icon: Home, active: true },
  { label: "Conversations", icon: MessageSquare, badge: "128" },
  { label: "Knowledge Base", icon: BookOpen },
  { label: "Sources", icon: Globe },
  { label: "Integrations", icon: Plug },
  { label: "Analytics", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

const METRICS = [
  {
    label: "Total Conversations",
    value: "1,248",
    change: "↑ 18.6%",
    note: "vs May 7 – May 13",
    up: true,
    icon: MessageSquare,
    iconColor: "text-blue-500 bg-blue-50",
  },
  {
    label: "Resolved Conversations",
    value: "846",
    change: "↑ 16.7%",
    note: "vs May 7 – May 13",
    up: true,
    icon: CheckCircle,
    iconColor: "text-emerald-500 bg-emerald-50",
  },
  {
    label: "Resolution Rate",
    value: "67.8%",
    change: "↑ 8.3%",
    note: "vs May 7 – May 13",
    up: true,
    icon: TrendingUp,
    iconColor: "text-violet-500 bg-violet-50",
  },
  {
    label: "Avg. Response Time",
    value: "2.6s",
    change: "↓ 8.3%",
    note: "vs May 7 – May 13",
    up: false,
    icon: BarChart3,
    iconColor: "text-amber-500 bg-amber-50",
  },
  {
    label: "Satisfaction Score",
    value: "4.7 / 5",
    change: "↑ 0.3",
    note: "vs May 7 – May 13",
    up: true,
    icon: Sparkles,
    iconColor: "text-pink-500 bg-pink-50",
  },
];

const SOURCE_DATA = [
  { label: "Website", pct: "61.5%", count: "1,024", color: "#6366f1" },
  { label: "Direct", pct: "20.6%", count: "342", color: "#10b981" },
  { label: "Referral", pct: "10.3%", count: "172", color: "#f59e0b" },
  { label: "Social Media", pct: "5.9%", count: "98", color: "#8b5cf6" },
  { label: "Other", pct: "3.1%", count: "52", color: "#d1d5db" },
];

const STATUS_DATA = [
  { label: "Resolved", pct: "67.8%", count: "846", color: "#10b981" },
  { label: "In Progress", pct: "24.2%", count: "302", color: "#6366f1" },
  { label: "Unresolved", pct: "8.0%", count: "100", color: "#ef4444" },
];

/** Simple SVG donut chart driven by segment percentages (circumference = 175.9 for r=28) */
function DonutChart({ segments }: { segments: { pct: number; color: string }[] }) {
  const r = 28;
  const circ = 2 * Math.PI * r; // ≈ 175.9
  return (
    <svg viewBox="0 0 80 80" className="size-[72px]">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#f3f4f6" strokeWidth="11" />
      {segments.map((seg, i) => {
        const prevOffset = segments.slice(0, i).reduce((sum, s) => sum + (s.pct / 100) * circ, 0);
        const dash = (seg.pct / 100) * circ;
        const gap = circ - dash;
        return (
          <circle
            key={i}
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="11"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-prevOffset}
            transform="rotate(-90 40 40)"
          />
        );
      })}
    </svg>
  );
}

function DashboardMockup() {
  return (
    <div className="overflow-hidden rounded-t-2xl border border-white/20 bg-white shadow-[0_-8px_60px_rgba(0,0,0,0.10),0_40px_80px_rgba(0,0,0,0.14)] ring-1 ring-inset ring-white/60">
      <div className="flex h-[380px] sm:h-[460px] md:h-[500px]">
        {/* ── Sidebar ── */}
        <div className="hidden w-[200px] shrink-0 flex-col border-r border-gray-100 bg-gray-50/70 p-3 sm:flex">
          {/* Brand */}
          <div className="mb-4 flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2">
              <ThemeLogo
                showWordmark
                className="size-[26px] rounded-lg"
                wordmarkClassName="text-sm text-gray-900"
              />
            </div>
            <span
              aria-hidden="true"
              className="flex size-5 items-center justify-center rounded text-gray-400"
            >
              <svg viewBox="0 0 12 12" className="size-3 fill-current">
                <path
                  d="M6 1v10M1 6h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>

          {/* Nav items */}
          <nav className="flex flex-col gap-0.5">
            {SIDEBAR_NAV.map(({ label, icon: Icon, active, badge }) => (
              <div
                key={label}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-[7px] text-[12.5px] font-medium",
                  active ? "bg-primary/10 text-primary" : "text-gray-500",
                )}
              >
                <Icon
                  className={cn("size-[15px] shrink-0", active ? "text-primary" : "text-gray-400")}
                />
                <span className="truncate">{label}</span>
                {badge && (
                  <span className="ml-auto rounded-full bg-primary px-1.5 py-px text-[9px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </div>
            ))}
          </nav>

          {/* Bottom user row */}
          <div className="mt-auto flex items-center gap-2 rounded-lg px-2 py-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
              A
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-gray-700">Acme Inc.</p>
              <p className="text-[10px] text-gray-400">Team workspace</p>
            </div>
            <svg viewBox="0 0 12 12" className="ml-auto size-3 shrink-0 text-gray-400 fill-current">
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* ── Main ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Topbar */}
          <div className="flex shrink-0 flex-col gap-2 border-b border-gray-100 px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-3.5">
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-gray-900">Dashboard</h2>
              <p className="text-[11px] text-gray-400">Illustrative preview · sample data</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-gray-500 shadow-xs">
                <svg
                  viewBox="0 0 14 14"
                  className="size-3 text-gray-400 stroke-current"
                  fill="none"
                >
                  <rect x="1" y="2" width="12" height="11" rx="2" strokeWidth="1.4" />
                  <path d="M1 6h12M5 1v2M9 1v2" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                May 14 – May 20, 2024
                <svg
                  viewBox="0 0 10 10"
                  className="size-2.5 text-gray-400 stroke-current"
                  fill="none"
                >
                  <path
                    d="M2 3.5l3 3 3-3"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-gray-500 shadow-xs">
                <Download className="size-3 text-gray-400" />
                Export
                <svg
                  viewBox="0 0 10 10"
                  className="size-2.5 text-gray-400 stroke-current"
                  fill="none"
                >
                  <path
                    d="M2 3.5l3 3 3-3"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid shrink-0 grid-cols-2 divide-x divide-y divide-gray-100 border-b border-gray-100 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
            {METRICS.map(({ label, value, change, note, up, icon: Icon, iconColor }) => (
              <div key={label} className="flex flex-col gap-0.5 px-3 py-3 sm:px-4">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "flex size-[22px] shrink-0 items-center justify-center rounded-md",
                      iconColor,
                    )}
                  >
                    <Icon className="size-3" />
                  </div>
                  <p className="truncate text-[9.5px] text-gray-400">{label}</p>
                </div>
                <p className="mt-1 text-[17px] font-bold leading-none text-gray-900">{value}</p>
                <p
                  className={cn(
                    "text-[9.5px] font-semibold",
                    up ? "text-emerald-600" : "text-red-500",
                  )}
                >
                  {change}
                </p>
                <p className="text-[9px] text-gray-400">{note}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="flex flex-1 overflow-hidden">
            {/* Line chart */}
            <div className="flex flex-1 flex-col border-r border-gray-100 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-gray-800">Conversations Over Time</p>
                <div className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] text-gray-500">
                  Daily
                  <svg viewBox="0 0 10 10" className="size-2 stroke-current" fill="none">
                    <path
                      d="M2 3.5l3 3 3-3"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              {/* Y axis labels */}
              <div className="relative flex flex-1">
                <div className="flex flex-col justify-between pr-2 text-[9px] text-gray-300">
                  {["1.5K", "1.25K", "750", "500", "250", "0"].map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                </div>
                <div className="flex flex-1 flex-col">
                  <svg viewBox="0 0 280 120" preserveAspectRatio="none" className="flex-1 w-full">
                    <defs>
                      <linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    {[0, 24, 48, 72, 96, 120].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={y}
                        x2="280"
                        y2={y}
                        stroke="#f3f4f6"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Area fill */}
                    <path
                      d="M0,88 C20,82 30,95 46.7,78 C60,65 75,90 93.3,82 C110,75 125,58 140,60 C158,62 165,48 186.7,50 C205,52 218,70 233.3,62 C248,54 264,22 280,14 L280,120 L0,120 Z"
                      fill="url(#heroChartGrad)"
                    />
                    {/* Line */}
                    <path
                      d="M0,88 C20,82 30,95 46.7,78 C60,65 75,90 93.3,82 C110,75 125,58 140,60 C158,62 165,48 186.7,50 C205,52 218,70 233.3,62 C248,54 264,22 280,14"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Dots */}
                    {(
                      [
                        [0, 88],
                        [46.7, 78],
                        [93.3, 82],
                        [140, 60],
                        [186.7, 50],
                        [233.3, 62],
                        [280, 14],
                      ] as [number, number][]
                    ).map(([x, y], i) => (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="3.5"
                        fill="#6366f1"
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    ))}
                  </svg>
                  {/* X axis */}
                  <div className="mt-1 flex justify-between text-[9px] text-gray-300">
                    {["May 14", "May 15", "May 16", "May 17", "May 18", "May 19", "May 20"].map(
                      (d) => (
                        <span key={d}>{d}</span>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Source donut */}
            <div className="hidden w-[188px] shrink-0 flex-col border-r border-gray-100 p-4 md:flex">
              <p className="mb-3 text-[12px] font-semibold text-gray-800">
                Conversations by Source
              </p>
              <div className="flex flex-col items-center gap-3">
                <DonutChart
                  segments={SOURCE_DATA.map((s) => ({
                    pct: parseFloat(s.pct),
                    color: s.color,
                  }))}
                />
                <div className="w-full space-y-1.5">
                  {SOURCE_DATA.map(({ label, pct, count, color }) => (
                    <div key={label} className="flex items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <div
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate text-[10px] text-gray-500">{label}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-[10px] text-gray-400">{count}</span>
                        <span className="text-[10px] font-medium text-gray-700">({pct})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Status donut */}
            <div className="hidden w-[188px] shrink-0 flex-col p-4 md:flex">
              <p className="mb-3 text-[12px] font-semibold text-gray-800">
                Conversations by Status
              </p>
              <div className="flex flex-col items-center gap-3">
                <DonutChart
                  segments={STATUS_DATA.map((s) => ({
                    pct: parseFloat(s.pct),
                    color: s.color,
                  }))}
                />
                <div className="w-full space-y-1.5">
                  {STATUS_DATA.map(({ label, pct, count, color }) => (
                    <div key={label} className="flex items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <div
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate text-[10px] text-gray-500">{label}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-[10px] text-gray-400">{count}</span>
                        <span className="text-[10px] font-medium text-gray-700">({pct})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative isolate min-h-screen overflow-hidden pb-0 pt-28 md:pt-36">
      {/* Full-bleed background image */}
      <Image
        src="/assets/widget-bg.png"
        alt=""
        fill
        unoptimized
        className="-z-10 object-cover object-top"
        priority
        aria-hidden
      />

      {/* Dark overlay on text area for white text readability */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[65%] bg-gradient-to-b from-black/40 via-black/20 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        {/* ── Headline ── */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-4xl font-bold tracking-[-0.03em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.3)] sm:text-5xl md:text-6xl md:text-[68px] md:leading-[1.08]">
            AI Support that
            <br />
            actually <span className="text-blue-200">understands</span>
          </h1>

          <p className="text-pretty mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/85">
            Answer questions, resolve issues, and keep your customers happy.
            <br className="hidden sm:block" />
            All from one intelligent AI agent trained on your content.
          </p>
        </div>

        {/* ── CTAs ── */}
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 rounded-xl px-8 text-[15px] shadow-lg shadow-primary/30 transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/35",
            )}
          >
            Get started for free
            <ArrowRight className="ml-2 size-4" />
          </Link>
          <a
            href="#features"
            className="flex h-12 items-center gap-2 rounded-xl border border-white/40 bg-white/15 px-8 text-[15px] font-medium text-white backdrop-blur-sm transition-[transform,background-color] duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.96] hover:bg-white/25"
          >
            See how it works
          </a>
        </div>

        {/* ── Trust badges ── */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[13px] text-white/80">
          {["No credit card required", "Test before going live", "Cancel anytime"].map((text) => (
            <div key={text} className="flex items-center gap-1.5">
              <svg
                className="size-[14px] shrink-0 text-white"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
                <path
                  d="M5 8l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="whitespace-nowrap">{text}</span>
            </div>
          ))}
        </div>

        {/* ── Dashboard mockup ── */}
        <div className="relative mx-auto mt-14 max-w-5xl">
          <DashboardMockup />
        </div>
      </div>

      {/* Smooth fade from landscape → white sections below */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
