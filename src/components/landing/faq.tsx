import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { SectionLayout, SectionHeader } from "./section-layout";

const FAQS = [
  {
    question: "How do I add knowledge for the AI?",
    answer:
      "Add website URLs, a sitemap, pasted text, or supported files in Agent → Build. Sources show their processing status. When a source is ready, check its answers in Agent → Test.",
  },
  {
    question: "Can I customize the chat widget's appearance?",
    answer:
      "In Agent → Customize, adjust colors, typography, avatar, welcome message, and conversation starters. Use the live preview to check your changes before installing the widget.",
  },
  {
    question: "What happens when a customer needs a human?",
    answer:
      "Escalation rules can pause the widget's AI replies and flag the conversation for your team. A teammate can review the history, assign the conversation, and reply from the shared inbox.",
  },
  {
    question: "Can the AI answer in different languages?",
    answer:
      "Language support depends on the model you select and your source content. Test the languages your customers use in Agent → Test before deploying your agent.",
  },
  {
    question: "How is my data handled?",
    answer:
      "Workspace membership controls access to Cogni, and knowledge retrieval is scoped to the workspace. AI providers process content needed to generate answers. Contact us to discuss your data requirements before uploading sensitive information.",
  },
  {
    question: "Which integrations can I connect?",
    answer:
      "The integration catalog includes Gmail, Google Calendar, Slack, Discord, Google Chat, WhatsApp, and Microsoft Teams. Available actions and inbound messaging require different provider setup. Review each integration's setup instructions before using it with customers.",
  },
];

export function Faq() {
  return (
    <SectionLayout id="faq">
      <div className="mx-auto max-w-3xl">
        <SectionHeader label="FAQ" heading={<>Common questions.</>} center />
        <div className="divide-y divide-gray-200">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-md py-5 text-left text-[15px] font-semibold leading-snug text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                {faq.question}
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-gray-600 group-open:rotate-180"
                />
              </summary>
              <p className="pb-5 text-[15px] leading-relaxed text-gray-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </SectionLayout>
  );
}
