import { SectionLayout, SectionHeader } from "./section-layout";

const STEPS = [
  {
    num: "01",
    title: "Build your agent",
    description: "Add website URLs, sitemaps, text, and supported files in Agent → Build.",
    color: "#6366f1",
    bg: "#eef0fe",
  },
  {
    num: "02",
    title: "Test its answers",
    description:
      "Try real customer questions in Agent → Test and review the sources behind each answer.",
    color: "#10b981",
    bg: "#ecfdf5",
  },
  {
    num: "03",
    title: "Deploy your widget",
    description:
      "In Agent → Deploy, customize the experience, authorize your domain, and install the widget.",
    color: "#f59e0b",
    bg: "#fffbeb",
  },
  {
    num: "04",
    title: "Support customers in Inbox",
    description: "Review conversations and reply from Inbox whenever a customer needs your team.",
    color: "#8b5cf6",
    bg: "#f5f3ff",
  },
];

export function HowItWorks() {
  return (
    <SectionLayout id="how-it-works">
      <SectionHeader
        label="Setup"
        heading={<>From knowledge to customer support.</>}
        sub="Add your sources, test your answers, and install your widget."
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
