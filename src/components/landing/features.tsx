import { Sparkles } from "@/components/icons";
import { SectionLayout } from "./section-layout";

/* ─── Mini UI illustrations ─────────────────────────────────────────── */

function AiAgentVisual() {
  return (
    <div className="mt-4 space-y-2">
      {/* User bubble */}
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-white/70 px-3.5 py-2.5 text-[12px] text-gray-700 shadow-sm">
          How do I reset my password?
        </div>
      </div>
      {/* AI bubble */}
      <div className="flex items-start gap-2">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
          <Sparkles className="size-3" />
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white/70 px-3.5 py-2.5 text-[12px] text-gray-700 shadow-sm">
          Go to <span className="font-semibold text-indigo-600">Settings → Security</span> and click{" "}
          <span className="font-semibold">Reset password</span>. I'll send a link to your email.
        </div>
      </div>
      {/* Resolved badge */}
      <div className="flex items-center gap-1.5 pl-8 pt-1">
        <div className="size-1.5 rounded-full bg-emerald-500" />
        <span className="text-[10px] font-medium text-emerald-600">Resolved · 1.8s</span>
      </div>
    </div>
  );
}

function HandoffVisual() {
  return (
    <div className="mt-4 space-y-2">
      <div className="rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <div className="size-1.5 rounded-full bg-amber-400" />
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            Escalated to human
          </span>
        </div>
        <p className="text-[12px] text-gray-700">
          "This refund request needs manual review. Handing off to Sarah with full context."
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
        <div className="size-7 overflow-hidden rounded-full bg-indigo-100">
          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-indigo-600">
            SK
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-800">Sarah K. assigned</p>
          <p className="text-[10px] text-gray-400">Full context transferred · just now</p>
        </div>
        <div className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
          Online
        </div>
      </div>
    </div>
  );
}

function KnowledgeVisual() {
  const sources = [
    {
      label: "docs.widget.com",
      sub: "234 pages",
      badge: "Website",
      badgeColor: "bg-sky-100 text-sky-700",
      icon: (
        <svg viewBox="0 0 20 20" className="size-4 text-sky-500" fill="none">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10 2c-2 2.5-3 5-3 8s1 5.5 3 8M10 2c2 2.5 3 5 3 8s-1 5.5-3 8M2 10h16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      label: "billing-policy.pdf",
      sub: "12 pages",
      badge: "PDF",
      badgeColor: "bg-red-100 text-red-600",
      icon: (
        <svg viewBox="0 0 20 20" className="size-4 text-red-500" fill="none">
          <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M7 6h6M7 10h6M7 14h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M13 2v4h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      label: "Help Center (EN)",
      sub: "120 articles",
      badge: "Docs",
      badgeColor: "bg-emerald-100 text-emerald-700",
      icon: (
        <svg viewBox="0 0 20 20" className="size-4 text-emerald-500" fill="none">
          <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M6 7h8M6 10h8M6 13h5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];
  return (
    <div className="mt-4 space-y-2">
      {sources.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-2.5 rounded-xl bg-white/70 px-3 py-2.5 shadow-sm"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
            {s.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-gray-700">{s.label}</p>
            <p className="text-[9px] text-gray-400">{s.sub}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${s.badgeColor}`}
          >
            {s.badge}
          </span>
          <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-px text-[9px] font-semibold text-emerald-700">
            Synced
          </span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsVisual() {
  return (
    <div className="mt-4">
      {/* Mini metrics */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { label: "Resolution", value: "67.8%", up: true },
          { label: "Response", value: "2.6s", up: false },
          { label: "Satisfaction", value: "4.7/5", up: true },
        ].map((m) => (
          <div key={m.label} className="rounded-xl bg-white/70 px-2.5 py-2 shadow-sm">
            <p className="text-[9px] text-gray-400">{m.label}</p>
            <p className="text-[13px] font-bold text-gray-800">{m.value}</p>
            <p className={`text-[9px] font-semibold ${m.up ? "text-emerald-500" : "text-red-400"}`}>
              {m.up ? "↑" : "↓"} vs last week
            </p>
          </div>
        ))}
      </div>
      {/* Mini bar chart */}
      <div className="flex items-end gap-1 px-1">
        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm opacity-80"
            style={{
              height: `${h * 0.4}px`,
              backgroundColor: i === 5 ? "#8b5cf6" : "#ddd6fe",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function WidgetVisual() {
  return (
    <div className="mt-4 flex items-stretch gap-3">
      {/* Left: customization controls */}
      <div className="flex flex-col gap-2.5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400">Customize</p>
        {[
          { label: "Primary", color: "#6366f1" },
          { label: "Header", color: "#4f46e5" },
          { label: "User", color: "#818cf8" },
          { label: "Bot", color: "#f1f5f9" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div
              className="size-4 shrink-0 rounded-md ring-1 ring-black/10"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[9px] font-medium text-blue-600/70">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Right: live widget preview */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2.5"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/25">
            <Sparkles className="size-3 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-white leading-none">AI Support</p>
            <p className="text-[8px] text-white/70 mt-0.5">Online · replies in seconds</p>
          </div>
          <div className="ml-auto size-1.5 rounded-full bg-emerald-400 ring-2 ring-white/30" />
        </div>
        {/* Messages */}
        <div className="space-y-2 p-2.5">
          <div className="w-fit rounded-2xl rounded-tl-sm bg-gray-100 px-2.5 py-1.5 text-[10px] text-gray-700">
            Hi! How can I help? 👋
          </div>
          <div className="flex justify-end">
            <div className="rounded-2xl rounded-tr-sm bg-indigo-500 px-2.5 py-1.5 text-[10px] text-white">
              I need help with billing
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-indigo-100">
              <Sparkles className="size-2.5 text-indigo-500" />
            </div>
            <div className="w-fit rounded-2xl rounded-tl-sm bg-gray-100 px-2.5 py-1.5 text-[10px] text-gray-700">
              Sure! Go to <span className="font-semibold text-indigo-600">Settings</span>
            </div>
          </div>
        </div>
        {/* Input */}
        <div className="mx-2.5 mb-2 flex items-center gap-1.5 rounded-xl bg-gray-50 px-2.5 py-1.5">
          <span className="flex-1 text-[9px] text-gray-400">Reply...</span>
          <div className="flex size-4 items-center justify-center rounded-lg bg-indigo-500">
            <svg viewBox="0 0 10 10" className="size-2.5 text-white" fill="none">
              <path
                d="M2 5h6M5 2l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Bento grid ────────────────────────────────────────────────────── */

export function Features() {
  return (
    <SectionLayout id="features">
      {/* Section header — centered */}
      <div className="mx-auto mb-14 max-w-2xl text-center">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          Platform
        </p>
        <h2 className="text-3xl font-bold tracking-[-0.025em] text-gray-900 sm:text-4xl">
          Everything support teams need.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-gray-500">
          One platform to automate answers, manage conversations, and surface insights in real time.
        </p>
      </div>

      {/* Bento grid — 12-column, 3 rows */}
      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        {/* ── Row 1 ── */}

        {/* Card 1: AI Agent — large left */}
        <div
          className="col-span-12 flex flex-col justify-between rounded-3xl p-5 sm:p-7 md:col-span-5"
          style={{ backgroundColor: "#EEF0FE" }}
        >
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-400">
              01 · AI Agent
            </p>
            <h3 className="text-2xl font-bold leading-snug tracking-tight text-indigo-700">
              From question
              <br />
              to answer, instantly.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-indigo-500/80">
              Train on your docs, website, and files. Resolves 70% of questions automatically, no
              human needed.
            </p>
          </div>
          <AiAgentVisual />
        </div>

        {/* Card 2: Human Handoff — large right */}
        <div
          className="col-span-12 flex flex-col justify-between rounded-3xl p-5 sm:p-7 md:col-span-7"
          style={{ backgroundColor: "#EFF8FF" }}
        >
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-400">
              02 · Human Handoff
            </p>
            <h3 className="text-2xl font-bold leading-snug tracking-tight text-blue-700">
              Escalate with
              <br />
              full context preserved.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-blue-500/80">
              When the AI can't help, it routes to your team instantly, handing over the full
              conversation so nobody starts from scratch.
            </p>
          </div>
          <HandoffVisual />
        </div>

        {/* ── Row 2 ── */}

        {/* Card 3: Knowledge Base */}
        <div
          className="col-span-12 flex flex-col justify-between rounded-3xl p-5 sm:p-7 sm:col-span-6 md:col-span-4"
          style={{ backgroundColor: "#ECFDF5" }}
        >
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-500">
              03 · Knowledge Base
            </p>
            <h3 className="text-xl font-bold leading-snug tracking-tight text-emerald-800">
              Ingest anything.
              <br />
              Stay in sync.
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-emerald-700/70">
              Websites, PDFs, Notion pages. Auto-synced as your content changes.
            </p>
          </div>
          <KnowledgeVisual />
        </div>

        {/* Card 4: Analytics */}
        <div
          className="col-span-12 flex flex-col justify-between rounded-3xl p-5 sm:p-7 sm:col-span-6 md:col-span-4"
          style={{ backgroundColor: "#F5F3FF" }}
        >
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-400">
              04 · Analytics
            </p>
            <h3 className="text-xl font-bold leading-snug tracking-tight text-violet-700">
              Insights that
              <br />
              actually matter.
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-violet-600/70">
              Resolution rates, topic clustering, and conversation metrics, updated in real time.
            </p>
          </div>
          <AnalyticsVisual />
        </div>

        {/* Card 5: Custom Widget */}
        <div
          className="col-span-12 flex flex-col justify-between rounded-3xl p-5 sm:p-7 sm:col-span-6 md:col-span-4"
          style={{ backgroundColor: "#EDF4FF" }}
        >
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-400">
              05 · Custom Widget
            </p>
            <h3 className="text-xl font-bold leading-snug tracking-tight text-blue-700">
              Your brand. Your colors.
              <br />
              Your widget.
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-blue-600/70">
              Full control over colors, fonts, avatar, and conversation starters.
            </p>
          </div>
          <WidgetVisual />
        </div>
      </div>
    </SectionLayout>
  );
}
