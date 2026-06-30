"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "How long does it take to train the AI?",
    answer:
      "Training typically takes less than 5 minutes. As soon as you connect your knowledge base, website, or upload PDFs, our system automatically processes and indexes the content to provide accurate answers.",
  },
  {
    question: "Can I customize the look of the chat widget?",
    answer:
      "Yes. You have full control over the widget's appearance, including brand colors, typography, launcher icons, and welcome messages to ensure it perfectly matches your website.",
  },
  {
    question: "What happens if the AI doesn't know the answer?",
    answer:
      "When confidence drops below your set threshold, the AI seamlessly routes the conversation to a human agent, providing them with the full chat history and context.",
  },
  {
    question: "Do you support multiple languages?",
    answer:
      "Our AI automatically detects and responds in over 90 languages out of the box, even if your underlying knowledge base is entirely in English.",
  },
  {
    question: "How do you handle data privacy and security?",
    answer:
      "We are SOC2 Type II compliant. Your data is encrypted at rest and in transit. We never use your proprietary data to train our foundational models.",
  },
  {
    question: "Can I integrate this with my existing helpdesk?",
    answer:
      "Absolutely. We offer deep integrations with Zendesk, Intercom, HubSpot, and Salesforce, allowing you to use our AI alongside your existing workflows.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-5">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="divide-y divide-border/50 border-y border-border/50">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className="py-6">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between text-left focus:outline-none group"
                >
                  <span className="text-lg font-medium text-foreground transition-colors group-hover:text-primary">
                    {faq.question}
                  </span>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    className={cn(
                      "size-5 shrink-0 text-muted-foreground transition-transform duration-300",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="pt-4 text-base leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
