"use client";

import Image from "next/image";
import { Sparkles } from "@/components/icons";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";
import { SectionLayout } from "./section-layout";

/* ─── Scroll-reveal wrapper ─────────────────────────────────────────── */

function Reveal({
  children,
  className,
  animation = "reveal-up",
  delay,
}: {
  children: React.ReactNode;
  className?: string;
  animation?: "reveal-up" | "reveal-scale" | "reveal-left";
  delay?: string;
}) {
  const { ref, revealed } = useReveal();
  return (
    <div
      ref={ref}
      className={cn(className, revealed ? animation : "opacity-0")}
      style={delay && revealed ? { animationDelay: delay } : undefined}
    >
      {children}
    </div>
  );
}

/* ─── Decorative nature-themed elements ─────────────────────────────── */

function LeafDecor({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("pointer-events-none select-none sway", className)}
      aria-hidden="true"
    >
      <path
        d="M16 2C10 8 4 16 8 24c2 4 6 6 8 6s6-2 8-6c4-8-2-16-8-22z"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <path
        d="M16 6v22M12 10c2 2 4 4 4 8M20 10c-2 2-4 4-4 8"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloudDecor({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 40"
      fill="none"
      className={cn("pointer-events-none select-none float-gentle", className)}
      aria-hidden="true"
    >
      <ellipse cx="60" cy="24" rx="50" ry="14" fill="currentColor" fillOpacity="0.04" />
      <ellipse cx="40" cy="18" rx="28" ry="16" fill="currentColor" fillOpacity="0.05" />
      <ellipse cx="80" cy="20" rx="24" ry="12" fill="currentColor" fillOpacity="0.04" />
    </svg>
  );
}

/* ─── Mini UI illustrations ─────────────────────────────────────────── */

function AiAgentVisual() {
  return (
    <div className="relative mt-5 h-48 overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(#7b35f0_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
      <div className="relative space-y-3">
        <div className="flex justify-end transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-x-1 group-hover:-translate-y-0.5">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-white px-3.5 py-2.5 text-[11.5px] font-semibold text-[#7B35F0] shadow-md border border-[#7B35F0]/10">
            How do I reset my password?
          </div>
        </div>
        <div className="flex items-start gap-2.5 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] delay-75 group-hover:translate-x-1 group-hover:translate-y-0.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#7B35F0] to-[#9d68f6] text-white shadow-md shadow-[#7B35F0]/20">
            <Sparkles className="size-3.5" />
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-[#7B35F0] px-3.5 py-2.5 text-[11.5px] text-white shadow-md shadow-[#7B35F0]/20">
            Go to <span className="font-bold underline text-purple-100">Settings → Security</span>{" "}
            and click <span className="font-bold">Reset password</span>.
          </div>
        </div>
        <div className="flex items-center gap-1.5 pl-9 pt-0.5 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-105 origin-left">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-150 px-2.5 py-0.5 rounded-full shadow-2xs">
            Example AI reply
          </span>
        </div>
      </div>
    </div>
  );
}

function HandoffVisual() {
  return (
    <div className="relative space-y-3 mt-4">
      <div className="rounded-xl border border-amber-100 bg-white p-3.5 shadow-md shadow-[#0085D1]/10 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-0.5 group-hover:scale-[1.01]">
        <div className="mb-2 flex items-center gap-2">
          <div className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
            Escalated to human
          </span>
        </div>
        <p className="text-[11px] italic text-slate-700 leading-normal">
          &quot;This refund request needs manual review. Handing off to Sarah with full
          context.&quot;
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3.5 py-2.5 shadow-md shadow-[#0085D1]/10 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] delay-75 group-hover:translate-y-0.5 group-hover:scale-[1.01]">
        <div className="relative size-8 shrink-0 overflow-hidden rounded-full bg-gradient-to-tr from-[#0085D1] to-[#33b1ff] shadow-sm">
          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white">
            SK
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-bold text-slate-800">Sarah K. assigned</p>
          <p className="text-[10px] text-slate-400">Conversation context included</p>
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
      badgeColor: "bg-sky-50 text-sky-700 border border-sky-100",
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
      badgeColor: "bg-red-50 text-red-600 border border-red-100",
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
      badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-100",
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
    <div className="mt-4 space-y-2.5">
      {sources.map((s, idx) => (
        <div
          key={s.label}
          className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm border border-gray-150 transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-[1.02] hover:shadow-md"
          style={{ transitionDelay: `${idx * 50}ms` }}
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gray-50 border border-gray-100">
            {s.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-gray-700">{s.label}</p>
            <p className="text-[10px] text-gray-400">{s.sub}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${s.badgeColor}`}
          >
            {s.badge}
          </span>
          <span className="shrink-0 rounded-full bg-emerald-100/80 px-2 py-0.5 text-[9px] font-bold text-emerald-700 flex items-center gap-1">
            <span className="size-1 rounded-full bg-emerald-500 animate-ping" />
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
      <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
        Illustrative sample data
      </p>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { label: "Closed", value: "846", up: true, change: "+4.2%" },
          { label: "Response", value: "2.6s", up: false, change: "-0.8s" },
          { label: "Satisfaction", value: "4.7/5", up: true, change: "+0.3" },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl bg-white p-2.5 border border-gray-100 shadow-sm transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:shadow-md hover:-translate-y-0.5"
          >
            <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wide">
              {m.label}
            </p>
            <p className="text-sm font-bold text-gray-800 mt-0.5">{m.value}</p>
            <p
              className={`text-[9px] font-bold mt-1 flex items-center gap-0.5 ${m.up ? "text-emerald-600" : "text-amber-600"}`}
            >
              {m.up ? "↑" : "↓"} {m.change}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-white p-3 border border-gray-100 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">
            Volume Trends
          </span>
          <span className="text-[9px] font-bold text-[#064E2A] bg-emerald-50 px-1.5 py-0.5 rounded-full">
            Sample
          </span>
        </div>
        <div className="flex items-end gap-1.5 h-16 pt-2">
          {[40, 65, 45, 80, 55, 95, 70].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end h-full">
              <div
                className="w-full rounded-t-md transition-all duration-500 origin-bottom group-hover:brightness-95"
                style={{
                  height: `${h}%`,
                  backgroundColor: i === 5 ? "#064E2A" : "#a7f3d0",
                  boxShadow: i === 5 ? "0 4px 12px rgba(6, 78, 42, 0.15)" : "none",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OmnichannelVisual() {
  const platforms = [
    { name: "Slack", src: "/assets/icons/slack.svg" },
    { name: "Teams", src: "/assets/icons/microsoft-teams.svg" },
    { name: "WhatsApp", src: "/assets/icons/whatsapp.svg" },
    { name: "Discord", src: "/assets/icons/discord.svg" },
    { name: "Google Chat", src: "/assets/icons/google-chat.svg" },
  ];

  return (
    <div className="mt-5 flex flex-col items-center gap-6">
      {/* Central hub with explicit dimensions to prevent overlap */}
      <div className="relative flex size-44 items-center justify-center">
        {/* Orbit rings */}
        <div className="absolute size-36 rounded-full border border-dashed border-[#5E29C4]/15" />
        <div className="absolute size-24 rounded-full border border-dashed border-[#5E29C4]/20" />

        {/* Center logo */}
        <div className="absolute z-10 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#5E29C4] to-[#8b5cf6] shadow-lg shadow-[#5E29C4]/25">
          <Sparkles className="size-5 text-white" />
        </div>

        {/* Orbiting platform icons */}
        {platforms.map((p, i) => {
          const angle = (i * 360) / platforms.length - 90;
          const rad = (angle * Math.PI) / 180;
          const r = 66;
          const x = Math.cos(rad) * r;
          const y = Math.sin(rad) * r;
          return (
            <div
              key={p.name}
              className="absolute flex size-9 items-center justify-center rounded-xl bg-white border border-gray-100 shadow-md transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-110 hover:shadow-lg"
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
            >
              <Image
                src={p.src}
                alt={p.name}
                width={20}
                height={20}
                unoptimized
                className="size-5 object-contain"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Feature card config ────────────────────────────────────────────── */

const FEATURES = [
  {
    tag: "AI Agent",
    title: (
      <>
        From question
        <br />
        to answer, instantly.
      </>
    ),
    description:
      "Train on your docs, website, and files. Test knowledge-grounded answers before putting your agent in front of customers.",
    bg: "#F7ECFF",
    color: "#7B35F0",
    Visual: AiAgentVisual,
  },
  {
    tag: "Human Handoff",
    title: (
      <>
        Escalate with
        <br />
        full context preserved.
      </>
    ),
    description:
      "When a conversation needs a person, your team can take over with the full conversation context.",
    bg: "#F0F9FF",
    color: "#0085D1",
    Visual: HandoffVisual,
  },
  {
    tag: "Knowledge Base",
    title: (
      <>
        Bring your knowledge.
        <br />
        Track each source.
      </>
    ),
    description:
      "Add website URLs, sitemaps, text, and supported files. Track processing status in your knowledge base.",
    bg: "#FFF2DF",
    color: "#C64E27",
    Visual: KnowledgeVisual,
  },
  {
    tag: "Insights",
    title: (
      <>
        Insights that
        <br />
        actually matter.
      </>
    ),
    description: "Review conversation volume, response times, and customer feedback in Insights.",
    bg: "#EEFFE8",
    color: "#064E2A",
    Visual: AnalyticsVisual,
  },
  {
    tag: "Omnichannel",
    title: (
      <>
        Connect your tools.
        <br />
        One inbox.
      </>
    ),
    description:
      "Connect supported integrations for approved actions. Inbound channel messaging requires additional provider setup.",
    bg: "#F2EEFF",
    color: "#5E29C4",
    Visual: OmnichannelVisual,
  },
];

/* ─── Bento grid ────────────────────────────────────────────────────── */

export function Features() {
  const { ref: sectionRef, revealed: sectionRevealed } = useReveal({ threshold: 0.05 });

  return (
    <SectionLayout id="features" className="relative overflow-hidden">
      {/* Nature-themed decorative elements */}
      <LeafDecor className="absolute -left-4 top-32 size-20 text-emerald-600 opacity-60 rotate-12" />
      <CloudDecor className="absolute right-8 top-16 w-36 text-sky-500" />
      <LeafDecor className="absolute -right-2 bottom-40 size-16 text-teal-500 opacity-50 -rotate-20" />

      <div ref={sectionRef}>
        {/* Section header — centered, scroll-revealed */}
        <div
          className={cn(
            "mx-auto mb-16 max-w-2xl text-center",
            sectionRevealed ? "reveal-up" : "opacity-0",
          )}
        >
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7c3aed]">
            Platform
          </p>
          <h2 className="text-3xl font-bold tracking-[-0.025em] text-gray-900 sm:text-4xl">
            Everything support teams need.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-gray-500">
            One platform to automate answers, manage conversations, and surface insights — in one
            workspace.
          </p>
        </div>

        {/* Bento grid — 12-column, 2-3 layout */}
        <div className="grid grid-cols-12 gap-5 sm:gap-6">
          {FEATURES.map((feature, i) => {
            const isTopRow = i < 2;
            const colSpan = isTopRow
              ? "col-span-12 md:col-span-6"
              : "col-span-12 sm:col-span-6 md:col-span-4";
            const headingSize = isTopRow ? "text-2xl" : "text-xl";

            return (
              <Reveal
                key={feature.tag}
                className={cn("group", colSpan)}
                animation="reveal-scale"
                delay={`${i * 80}ms`}
              >
                <div
                  className="flex h-full flex-col justify-between rounded-3xl border p-5 sm:p-7 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1.5 hover:shadow-xl"
                  style={{
                    backgroundColor: feature.bg,
                    borderColor: `${feature.color}20`,
                    // @ts-expect-error: CSS custom properties for dynamic hover shadow
                    "--tw-shadow-color": `${feature.color}15`,
                  }}
                >
                  <div>
                    <p
                      className="mb-3.5 text-[10px] font-bold uppercase tracking-[0.15em] bg-white px-2.5 py-1 rounded-full w-fit border"
                      style={{ color: feature.color, borderColor: `${feature.color}15` }}
                    >
                      {feature.tag}
                    </p>
                    <h3
                      className={cn(headingSize, "font-bold leading-snug tracking-tight")}
                      style={{ color: feature.color }}
                    >
                      {feature.title}
                    </h3>
                    <p
                      className="mt-2.5 text-sm leading-relaxed"
                      style={{ color: `${feature.color}d0` }}
                    >
                      {feature.description}
                    </p>
                  </div>
                  <div>
                    <feature.Visual />
                    <p className="mt-2 text-xs text-gray-600">Illustrative preview · sample data</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </SectionLayout>
  );
}
