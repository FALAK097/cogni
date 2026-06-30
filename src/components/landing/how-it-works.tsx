import { SectionLayout, SectionHeader } from "./section-layout";

const STEPS = [
  {
    num: "01",
    title: "Connect your website",
    description: "Paste a single script tag. The widget appears live on your site in seconds.",
    color: "#6366f1",
    bg: "#eef0fe",
  },
  {
    num: "02",
    title: "Import your knowledge",
    description: "Sync your docs, Help Center, PDFs, and Notion pages with one click.",
    color: "#10b981",
    bg: "#ecfdf5",
  },
  {
    num: "03",
    title: "Customize the widget",
    description: "Match your brand exactly: colors, fonts, avatar, and conversation starters.",
    color: "#f59e0b",
    bg: "#fffbeb",
  },
  {
    num: "04",
    title: "Go live instantly",
    description: "Your AI agent handles questions 24/7. Your team steps in only when it matters.",
    color: "#8b5cf6",
    bg: "#f5f3ff",
  },
];

export function HowItWorks() {
  return (
    <SectionLayout id="how-it-works">
      <SectionHeader
        label="Setup"
        heading={<>Live in under 5 minutes.</>}
        sub="No engineers, no complex configuration, no waiting."
        center
      />

      {/* Desktop: horizontal steps */}
      <ol className="mx-auto mb-14 hidden max-w-5xl gap-0 md:flex">
        {STEPS.map((step, i) => (
          <li key={step.num} className="relative flex flex-1 flex-col">
            {i < STEPS.length - 1 && (
              <div
                aria-hidden
                className="absolute top-6 left-1/2 h-px w-full"
                style={{ backgroundColor: "#e5e7eb" }}
              />
            )}
            <div className="relative z-10 mb-6 flex justify-center">
              <div
                className="flex size-12 items-center justify-center rounded-2xl text-sm font-bold"
                style={{
                  backgroundColor: step.bg,
                  color: step.color,
                  boxShadow: `0 0 0 4px white, 0 0 0 5px ${step.color}20`,
                }}
              >
                {step.num}
              </div>
            </div>
            <div className="px-4 text-center">
              <h3 className="mb-2 text-[15px] font-semibold text-gray-900">{step.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Mobile: vertical timeline */}
      <ol className="mx-auto mb-14 max-w-lg space-y-0 md:hidden">
        {STEPS.map((step, i) => (
          <li key={step.num} className="relative flex gap-5 pb-10 last:pb-0">
            {i < STEPS.length - 1 && (
              <div
                aria-hidden
                className="absolute top-12 left-6 h-[calc(100%-3rem)] w-px"
                style={{ backgroundColor: "#e5e7eb" }}
              />
            )}
            <div
              className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold"
              style={{ backgroundColor: step.bg, color: step.color }}
            >
              {step.num}
            </div>
            <div className="min-w-0 pt-2">
              <h3 className="mb-1.5 text-[15px] font-semibold text-gray-900">{step.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </SectionLayout>
  );
}
