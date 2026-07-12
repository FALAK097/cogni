"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";
import { SectionLayout } from "./section-layout";

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

const FAQS = [
  {
    question: "How long does it take to train the AI?",
    answer:
      "Less than 5 minutes. As soon as you connect your knowledge base (website, Help Center, or PDFs) our system processes and indexes everything automatically. You can start testing before the page even finishes loading.",
  },
  {
    question: "Can I customize the chat widget's appearance?",
    answer:
      "Completely. You control colors, typography, launcher icon, avatar, border radius, welcome message, and conversation starters. The widget editor has a live preview so you see changes instantly.",
  },
  {
    question: "What happens when the AI doesn't know the answer?",
    answer:
      "When the AI's confidence drops below your configured threshold, it routes the conversation to your team seamlessly, handing over the full chat history and context so the agent doesn't have to start from scratch.",
  },
  {
    question: "Do you support multiple languages?",
    answer:
      "Yes. The AI auto-detects and responds in 90+ languages, even if your entire knowledge base is written in English.",
  },
  {
    question: "How is my data handled?",
    answer:
      "We are SOC 2 Type II certified. All data is encrypted at rest and in transit. Your knowledge base and conversation data are never used to train foundational models.",
  },
  {
    question: "Can I connect my existing helpdesk?",
    answer:
      "Yes. We integrate with Zendesk, Intercom, HubSpot, Salesforce, and more. Human handoffs land directly in your existing queue so your workflow doesn't change.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { ref: headerRef, revealed: headerRevealed } = useReveal({ threshold: 0.15 });
  const { ref: listRef, revealed: listRevealed } = useReveal({ threshold: 0.1 });

  return (
    <SectionLayout id="faq" className="relative overflow-hidden">
      {/* Decorative nature SVGs */}
      <LeafDecor className="absolute -left-3 top-24 size-16 text-teal-600 opacity-40 rotate-45" />
      <CloudDecor className="absolute right-4 top-16 w-32 text-sky-400 opacity-45" />

      {/* Header + accordion in a centered narrow column */}
      <div className="mx-auto max-w-3xl">
        <div
          ref={headerRef}
          className={cn(
            "mx-auto mb-14 max-w-2xl text-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
            headerRevealed ? "reveal-up" : "opacity-0",
          )}
        >
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7c3aed]">
            FAQ
          </p>
          <h2 className="text-3xl font-bold tracking-[-0.025em] text-gray-900 sm:text-4xl">
            Common questions.
          </h2>
          <p className="mx-auto mt-4 text-lg leading-relaxed text-gray-500 max-w-xl">
            Everything you need to know about setting up and customizing widget support.
          </p>
        </div>

        <div
          ref={listRef}
          className={cn(
            "divide-y divide-gray-100 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
            listRevealed ? "reveal-up" : "opacity-0",
          )}
        >
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="transition-all duration-500"
                style={{ transitionDelay: listRevealed ? `${index * 50}ms` : undefined }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="group flex w-full items-start justify-between gap-4 py-5 text-left focus:outline-none transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-slate-50/50 rounded-2xl px-4 -mx-4 active:scale-[0.99]"
                  aria-expanded={isOpen}
                >
                  <span
                    className={cn(
                      "text-[15px] font-semibold leading-snug transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                      isOpen ? "text-[#7c3aed]" : "text-gray-900 group-hover:text-[#7c3aed]",
                    )}
                  >
                    {faq.question}
                  </span>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    className={cn(
                      "mt-0.5 size-4 shrink-0 text-gray-400 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
                      isOpen && "rotate-180 text-[#7c3aed]",
                    )}
                  />
                </button>

                {/* Grid-row trick for smooth height animation — Emil principle */}
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="pb-5 text-[15px] leading-relaxed text-gray-500 pl-4">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionLayout>
  );
}
