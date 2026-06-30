"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { SectionLayout, SectionHeader } from "./section-layout";

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

  return (
    <SectionLayout id="faq">
      {/* Header + accordion in a centered narrow column */}
      <div className="mx-auto max-w-3xl">
        <SectionHeader label="FAQ" heading={<>Common questions.</>} center />

        <div className="divide-y divide-gray-100">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="group flex w-full items-start justify-between gap-4 py-5 text-left focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span
                    className={cn(
                      "text-[15px] font-semibold leading-snug transition-colors duration-150",
                      isOpen ? "text-primary" : "text-gray-900 group-hover:text-primary",
                    )}
                  >
                    {faq.question}
                  </span>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    className={cn(
                      "mt-0.5 size-4 shrink-0 text-gray-400 transition-transform duration-200 ease-out",
                      isOpen && "rotate-180 text-primary",
                    )}
                  />
                </button>

                {/* Grid-row trick for smooth height animation — Emil principle */}
                <div
                  className={cn(
                    "grid transition-all duration-200 ease-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="pb-5 text-[15px] leading-relaxed text-gray-500">{faq.answer}</p>
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
